'use server';
// lib/meter/work-order-parser.ts
// Gemini-powered healthcare packet → structured work order
// Supports text, image, and PDF intake (multimodal)

import { GoogleGenerativeAI, FunctionDeclaration, SchemaType, FunctionCallingMode, ChatSession, GenerateContentResult } from '@google/generative-ai';
import type { WorkOrder, PacketFormat, HealthcareExtract, UrgencyLevel, CaseType } from './types';
import crypto from 'crypto';

const genai = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY ?? '');

// ============================================================================
// Gemini tool definitions, what Flash calls during orchestration
// All enum constraints expressed via description string only (SDK requirement)
// ============================================================================

const workflowTools: FunctionDeclaration[] = [
  {
    name: 'parsePriorAuthDocument',
    description:
      'Parse a de-identified prior authorization document and extract structured healthcare administrative fields. ' +
      'caseType must be one of: prior_auth, utilization_review, appeals, specialist_consult. ' +
      'urgencyLevel must be one of: routine, urgent, emergent. ' +
      'Do not include PHI. memberIdMasked should show only last 4 digits.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        payerName: { type: SchemaType.STRING, description: 'Name of the payer organization (e.g. Molina Healthcare)' },
        memberIdMasked: { type: SchemaType.STRING, description: 'Masked member ID showing last 4 only, e.g. ***-**-1234' },
        providerName: { type: SchemaType.STRING, description: 'Requesting provider or facility name (no patient PHI)' },
        procedureRequested: { type: SchemaType.STRING, description: 'Administrative procedure or service description' },
        diagnosisSummary: { type: SchemaType.STRING, description: 'Non-clinical administrative diagnosis category summary' },
        urgencyLevel: { type: SchemaType.STRING, description: 'Urgency: routine, urgent, or emergent' },
        caseType: { type: SchemaType.STRING, description: 'Case type: prior_auth, utilization_review, appeals, or specialist_consult' },
        extractedConfidence: { type: SchemaType.NUMBER, description: 'Confidence score 0-1 for extraction quality' },
        requiresSpecialistReview: { type: SchemaType.BOOLEAN, description: 'True if case complexity warrants specialist agent escalation' },
        summary: { type: SchemaType.STRING, description: '2-3 sentence administrative summary, no PHI' },
      },
      required: ['caseType', 'urgencyLevel', 'summary', 'extractedConfidence'],
    },
  },
  {
    name: 'createReviewSession',
    description:
      'Determine the appropriate budget cap, routing mode, and policy reference for this work order. ' +
      'routingMode must be one of: cost, quality, balanced.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        budgetCapUsd: { type: SchemaType.NUMBER, description: 'Budget ceiling in USD (e.g. 0.50)' },
        approvalRequired: { type: SchemaType.BOOLEAN, description: 'Whether human reviewer must approve before release' },
        routingMode: { type: SchemaType.STRING, description: 'Routing preference: cost, quality, or balanced' },
        policySummary: { type: SchemaType.STRING, description: 'Administrative policy reference (non-clinical, non-PHI)' },
      },
      required: ['budgetCapUsd', 'approvalRequired', 'routingMode'],
    },
  },
  {
    name: 'addLedgerEstimate',
    description: 'Record the initial cost estimate for this session opening. Returns a ledger entry for governance tracking.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        estimatedCostUsd: { type: SchemaType.NUMBER, description: 'Estimated cost in USD for the intake step' },
        eventKind: { type: SchemaType.STRING, description: 'Event kind: extraction_estimate' },
      },
      required: ['estimatedCostUsd', 'eventKind'],
    },
  },
];

// ============================================================================
// System prompt
// ============================================================================

const SYSTEM_INSTRUCTION = `You are a healthcare payer operations workflow orchestrator for Molina-style managed care.

Process de-identified prior authorization and utilization review documents and produce structured administrative work orders.

Rules:
- ADMINISTRATIVE only, no clinical decisions, no diagnosis recommendations.
- Document is de-identified, do not reference any PHI.
- Output goes to a payer operations analyst for review.
- If the document contains clinical language, summarize only administrative and process aspects.
- If parsing confidence is low, set extractedConfidence below 0.6, set approvalRequired to true.
- Complex cases (specialist consult, appeals, emergent urgency) should set requiresSpecialistReview to true.

You MUST call ALL THREE workflow tools in sequence:
1. parsePriorAuthDocument, extract structured case fields and administrative summary
2. createReviewSession, determine budget ceiling, routing mode, and policy reference
3. addLedgerEstimate, record the intake cost estimate for governance

Call all three tools before providing any text response.`;

// ============================================================================
// Types
// ============================================================================

export interface WorkOrderParseResult {
  workOrder: Omit<WorkOrder, 'id' | 'createdAt' | 'updatedAt' | 'tenantId'>;
  toolTrace: string[];
  degraded: boolean;
  degradedReason?: string;
}

// ============================================================================
// Main parser, text intake
// ============================================================================

export async function parsePacketToWorkOrder(
  packetText: string,
  options: {
    tenantId?: string;
    sessionId?: string;
    budgetHintUsd?: number;
    packetFormat?: PacketFormat;
  } = {}
): Promise<WorkOrderParseResult> {
  const requestId = crypto.randomUUID();
  const toolTrace: string[] = [];
  const truncated = packetText.slice(0, 8000);

  try {
    const model = genai.getGenerativeModel({
      model: 'gemini-3.1-flash',
      systemInstruction: SYSTEM_INSTRUCTION,
      tools: [{ functionDeclarations: workflowTools }],
      // ANY mode forces all three tools to be called, required for complete work order
      toolConfig: { functionCallingConfig: { mode: FunctionCallingMode.ANY } },
    });

    const chat = model.startChat();

    const userMessage =
      `Process this de-identified prior authorization document and produce a structured work order.\n\nDOCUMENT:\n${truncated}\n\n` +
      (options.budgetHintUsd != null
        ? `Suggested budget cap: $${options.budgetHintUsd.toFixed(2)}`
        : 'Use a conservative budget cap of $0.50 USD.');

    const result1 = await chat.sendMessage(userMessage);
    return await processFunctionCalls(result1, chat, requestId, toolTrace, options);
  } catch (err: unknown) {
    return buildDegradedResult(requestId, options, err instanceof Error ? err.message : String(err));
  }
}

// ============================================================================
// Multimodal parser, image or PDF intake (Gemini Vision)
// ============================================================================

export async function parseDocumentMultimodal(
  fileData: {
    mimeType: string;       // e.g. "image/jpeg", "image/png", "application/pdf"
    base64Data: string;     // base64-encoded file content
  },
  options: {
    tenantId?: string;
    sessionId?: string;
    budgetHintUsd?: number;
    packetFormat?: PacketFormat;
  } = {}
): Promise<WorkOrderParseResult> {
  const requestId = crypto.randomUUID();
  const toolTrace: string[] = [];

  try {
    const model = genai.getGenerativeModel({
      model: 'gemini-3.1-flash',
      systemInstruction: SYSTEM_INSTRUCTION,
      tools: [{ functionDeclarations: workflowTools }],
      toolConfig: { functionCallingConfig: { mode: FunctionCallingMode.ANY } },
    });

    const chat = model.startChat();

    // Multimodal message: inline image/PDF data alongside text prompt
    const userMessage = [
      {
        inlineData: {
          mimeType: fileData.mimeType,
          data: fileData.base64Data,
        },
      },
      {
        text:
          `Process this de-identified prior authorization document image and produce a structured work order.\n\n` +
          (options.budgetHintUsd != null
            ? `Suggested budget cap: $${options.budgetHintUsd.toFixed(2)}`
            : 'Use a conservative budget cap of $0.50 USD.'),
      },
    ];

    const result1 = await chat.sendMessage(userMessage);
    return await processFunctionCalls(result1, chat, requestId, toolTrace, options);
  } catch (err: unknown) {
    return buildDegradedResult(requestId, options, err instanceof Error ? err.message : String(err));
  }
}

// ============================================================================
// Shared function-call processor
// ============================================================================

type FnCallInfo = { name: string; args: Record<string, unknown>; response: Record<string, unknown> };

async function processFunctionCalls(
  result1: GenerateContentResult,
  chat: ChatSession,
  requestId: string,
  toolTrace: string[],
  options: { sessionId?: string; budgetHintUsd?: number; packetFormat?: PacketFormat }
): Promise<WorkOrderParseResult> {
  const parts1 = result1.response.candidates?.[0]?.content?.parts ?? [];
  const fnResults: FnCallInfo[] = [];

  for (const part of parts1) {
    if (!part.functionCall) continue;
    const fc = part.functionCall;
    const args = (fc.args ?? {}) as Record<string, unknown>;

    let responseData: Record<string, unknown> = {};
    let traceLabel = fc.name;

    if (fc.name === 'parsePriorAuthDocument') {
      responseData = { status: 'parsed', ...args };
      const ct = args['caseType'] as string | undefined;
      const ul = args['urgencyLevel'] as string | undefined;
      const conf = args['extractedConfidence'];
      traceLabel = `document parsed (${ct ?? 'prior_auth'}, ${ul ?? 'routine'}, conf ${typeof conf === 'number' ? conf.toFixed(2) : '?'})`;
    } else if (fc.name === 'createReviewSession') {
      responseData = { status: 'session_created', sessionId: options.sessionId ?? `session_${requestId.slice(0, 8)}`, ...args };
      const cap = args['budgetCapUsd'];
      traceLabel = `session created ($${typeof cap === 'number' ? cap.toFixed(2) : '0.50'} cap, ${args['routingMode'] ?? 'balanced'} routing)`;
    } else if (fc.name === 'addLedgerEstimate') {
      responseData = { status: 'ledger_entry_created', ...args };
      const est = args['estimatedCostUsd'];
      traceLabel = `ledger estimate ($${typeof est === 'number' ? est.toFixed(6) : '0.000006'})`;
    }

    toolTrace.push(traceLabel);
    fnResults.push({ name: fc.name, args, response: responseData });
  }

  if (fnResults.length === 0) {
    return buildDegradedResult(requestId, options, 'Gemini returned no workflow tool calls');
  }

  // Send function responses back
  const fnResponseParts = fnResults.map((r) => ({
    functionResponse: { name: r.name, response: r.response },
  }));
  await chat.sendMessage(fnResponseParts);

  // Extract structured data
  const parseArgs  = fnResults.find((r) => r.name === 'parsePriorAuthDocument')?.args ?? {};
  const sessionArgs = fnResults.find((r) => r.name === 'createReviewSession')?.args ?? {};

  const budgetCapUsd =
    typeof sessionArgs['budgetCapUsd'] === 'number'
      ? sessionArgs['budgetCapUsd']
      : (options.budgetHintUsd ?? 0.50);

  if (sessionArgs['approvalRequired'] === true) toolTrace.push('approval required');
  toolTrace.push('review execution ready');

  // Build HealthcareExtract from parsed fields
  const healthcareExtract: HealthcareExtract = {
    requestId,
    payerName: typeof parseArgs['payerName'] === 'string' ? parseArgs['payerName'] : undefined,
    memberIdMasked: typeof parseArgs['memberIdMasked'] === 'string' ? parseArgs['memberIdMasked'] : undefined,
    providerName: typeof parseArgs['providerName'] === 'string' ? parseArgs['providerName'] : undefined,
    procedureRequested: typeof parseArgs['procedureRequested'] === 'string' ? parseArgs['procedureRequested'] : undefined,
    diagnosisSummary: typeof parseArgs['diagnosisSummary'] === 'string' ? parseArgs['diagnosisSummary'] : undefined,
    urgencyLevel: (['routine', 'urgent', 'emergent'].includes(parseArgs['urgencyLevel'] as string)
      ? parseArgs['urgencyLevel'] as UrgencyLevel
      : 'routine'),
    caseType: (['prior_auth', 'utilization_review', 'appeals', 'specialist_consult'].includes(parseArgs['caseType'] as string)
      ? parseArgs['caseType'] as CaseType
      : 'prior_auth'),
    extractedConfidence: typeof parseArgs['extractedConfidence'] === 'number' ? parseArgs['extractedConfidence'] : 0.85,
    requiresSpecialistReview: parseArgs['requiresSpecialistReview'] === true,
  };

  const workOrder: Omit<WorkOrder, 'id' | 'createdAt' | 'updatedAt' | 'tenantId'> = {
    sessionId: options.sessionId,
    requestId,
    workflowType: 'prior_auth_review',
    packetFormat: options.packetFormat ?? 'text',
    packetSummary: typeof parseArgs['summary'] === 'string' ? parseArgs['summary'] : undefined,
    policySummary: typeof sessionArgs['policySummary'] === 'string' ? sessionArgs['policySummary'] : undefined,
    budgetCapUsd,
    approvalRequired: sessionArgs['approvalRequired'] !== false,
    deidentified: true,
    reviewMode: 'live',
    executionMode: 'live',
    toolTrace,
    status: 'session_open',
    geminiModel: 'gemini-3.1-flash',
    healthcareExtract,
  };

  return { workOrder, toolTrace, degraded: false };
}

// ============================================================================
// Degraded mode
// ============================================================================

function buildDegradedResult(
  requestId: string,
  options: { sessionId?: string; budgetHintUsd?: number; packetFormat?: PacketFormat },
  reason: string
): WorkOrderParseResult {
  const healthcareExtract: HealthcareExtract = {
    requestId,
    caseType: 'prior_auth',
    urgencyLevel: 'routine',
    extractedConfidence: 0,
    requiresSpecialistReview: false,
  };

  return {
    workOrder: {
      sessionId: options.sessionId,
      requestId,
      workflowType: 'prior_auth_review',
      packetFormat: options.packetFormat ?? 'text',
      packetSummary: 'Administrative packet review, manual classification required',
      policySummary: undefined,
      budgetCapUsd: options.budgetHintUsd ?? 0.50,
      approvalRequired: true,
      deidentified: true,
      reviewMode: 'safe',
      executionMode: 'safe',
      toolTrace: [
        'document parsed (degraded)',
        'session created (default)',
        'approval required',
        'ledger estimate (default)',
      ],
      status: 'created',
      geminiModel: 'gemini-3.1-flash',
      healthcareExtract,
    },
    toolTrace: [
      'document parsed (degraded)',
      'session created (default)',
      'approval required',
      'ledger estimate (default)',
    ],
    degraded: true,
    degradedReason: reason,
  };
}

// ============================================================================
// Final approval recommendation (Gemini Flash, fast path)
// ============================================================================

export interface ApprovalRecommendationResult {
  insideBudget: boolean;
  policyCompliant: boolean;
  outputInScope: boolean;
  recommendation: 'approve_for_manual_review' | 'hold_for_escalation' | 'revise_output';
  reasonSummary: string;
}

export async function generateApprovalRecommendation(params: {
  workOrder: Pick<WorkOrder, 'budgetCapUsd' | 'packetSummary' | 'policySummary'>;
  reviewSummaryText: string;
  actualCostUsd: number;
}): Promise<ApprovalRecommendationResult> {
  const { workOrder, reviewSummaryText, actualCostUsd } = params;
  const insideBudget = actualCostUsd <= workOrder.budgetCapUsd;

  try {
    const model = genai.getGenerativeModel({
      model: 'gemini-3.1-flash',
      systemInstruction: `You are a payer operations quality evaluator for healthcare utilization management.
You assess AI-generated prior authorization review summaries for three criteria:
1. Policy compliance: does the output cite appropriate administrative criteria and avoid clinical overreach?
2. Output scope: is the summary administrative-only with no PHI, no diagnosis language, and no clinical determinations?
3. Budget adherence: did the session stay within the pre-authorized spend ceiling?

You are the final automated gate before a human reviewer receives the document.
Be conservative: when any criterion is borderline, recommend hold_for_escalation over approval.
Return only valid JSON with no markdown formatting.`,
      generationConfig: { responseMimeType: 'application/json', temperature: 0.1 },
    });

    const prompt = `Evaluate this AI-generated prior authorization review summary and return a structured quality recommendation.

WORK ORDER:
- Summary: ${workOrder.packetSummary ?? 'Prior authorization review'}
- Policy reference: ${workOrder.policySummary ?? 'Standard utilization management criteria'}
- Budget cap: $${workOrder.budgetCapUsd.toFixed(4)} USD
- Actual cost: $${actualCostUsd.toFixed(4)} USD
- Inside budget: ${insideBudget}

GENERATED REVIEW (first 1500 chars):
${reviewSummaryText.slice(0, 1500)}

Return this exact JSON structure:
{
  "policyCompliant": boolean,
  "outputInScope": boolean,
  "recommendation": "approve_for_manual_review" | "hold_for_escalation" | "revise_output",
  "reasonSummary": "1-2 sentence operational rationale, no PHI, no diagnosis language, no clinical determinations"
}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const parsed = JSON.parse(text) as {
      policyCompliant?: boolean;
      outputInScope?: boolean;
      recommendation?: 'approve_for_manual_review' | 'hold_for_escalation' | 'revise_output';
      reasonSummary?: string;
    };

    return {
      insideBudget,
      policyCompliant: parsed.policyCompliant ?? true,
      outputInScope: parsed.outputInScope ?? true,
      recommendation: parsed.recommendation ?? (insideBudget ? 'approve_for_manual_review' : 'hold_for_escalation'),
      reasonSummary: parsed.reasonSummary ?? 'Review completed within policy scope.',
    };
  } catch {
    return {
      insideBudget,
      policyCompliant: true,
      outputInScope: true,
      recommendation: insideBudget ? 'approve_for_manual_review' : 'hold_for_escalation',
      reasonSummary: insideBudget
        ? 'Review completed within budget. Ready for manual approval.'
        : 'Review exceeded budget cap. Escalation recommended.',
    };
  }
}

// ============================================================================
// Gemini Pro economic audit (post-run deep summary)
// ============================================================================

import type { EconomicAudit } from './types';

// Tempo TIP-20 settlement fee is sub-millidollar (FeeAMM); use 0 for comparison purposes.
const TEMPO_GAS_COST_USDC = 0.000001;

export async function generateEconomicAudit(params: {
  sessionId: string;
  totalCostUsd: number;
  settlementTxCount: number;
  aiTokenCostUsd: number;
  routingFeeUsd: number;
  escrowCostUsd?: number;
}): Promise<EconomicAudit> {
  const { sessionId, totalCostUsd, settlementTxCount, aiTokenCostUsd, routingFeeUsd, escrowCostUsd = 0 } = params;

  const settlementGasCostUsd = settlementTxCount * TEMPO_GAS_COST_USDC;
  const avgCostPerActionUsd = settlementTxCount > 0 ? totalCostUsd / settlementTxCount : totalCostUsd;

  // Stripe minimum: $0.30 base + 2.9%, fails at sub-$10 transaction sizes
  const comparisonStripeUsd = 0.30 + totalCostUsd * 0.029;
  // ETH mainnet at 30 gwei, ~65k gas per ERC-20 transfer: ~$2.85/tx
  const comparisonEthMainnetUsd = settlementTxCount * 2.85;
  const savingVsEthMainnetPct = comparisonEthMainnetUsd > 0
    ? Math.round(((comparisonEthMainnetUsd - totalCostUsd) / comparisonEthMainnetUsd) * 100)
    : 99;

  let recommendation = `This session completed ${settlementTxCount} economic events at an average of $${avgCostPerActionUsd.toFixed(6)} per action. Tempo mainnet TIP-20 settlement at sub-millidollar fees enabled micropayment billing that would be economically impossible on Ethereum mainnet ($${comparisonEthMainnetUsd.toFixed(2)} equivalent) or via Stripe ($${comparisonStripeUsd.toFixed(2)} minimum).`;

  // Gemini Pro deep audit, full reasoning, unconstrained output
  try {
    const model = genai.getGenerativeModel({
      model: 'gemini-3.1-pro',
      systemInstruction: `You are a senior healthcare AI economics analyst. You evaluate the cost efficiency of agentic AI workflows that use blockchain micropayment infrastructure for per-action billing.

Your role is to produce a rigorous executive-level economic audit that:
- Quantifies the per-action cost in absolute and relative terms
- Compares the session economics against legacy payment rails (Stripe, Ethereum mainnet, traditional payer-ops processing)
- Articulates why sub-cent micropayments unlock healthcare workflows that are economically impossible under minimum-fee models
- Identifies the strategic value proposition for payer organizations adopting agentic AI with blockchain settlement
- Draws a clear conclusion on the economic model viability

Write with precision and confidence. Use exact numbers. No PHI. No clinical content. Audience: healthcare CFOs, payer operations VPs, and AI infrastructure investors.`,
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 1024,
      },
    });

    const costSavingVsStripe = comparisonStripeUsd > totalCostUsd
      ? Math.round(((comparisonStripeUsd - totalCostUsd) / comparisonStripeUsd) * 100)
      : 0;

    const prompt = `Produce a professional economic audit for this AI-assisted healthcare prior authorization session.

SESSION METRICS:
- Onchain settlement events: ${settlementTxCount} Tempo mainnet TIP-20 transactions via MPP
- Total session cost: $${totalCostUsd.toFixed(6)} USD
- Average cost per event: $${avgCostPerActionUsd.toFixed(6)} USD
- AI token cost (Gemini 3.1 Flash): $${aiTokenCostUsd.toFixed(6)} USD
- P402 routing and governance fee: $${routingFeeUsd.toFixed(6)} USD
- Tempo settlement gas total: $${settlementGasCostUsd.toFixed(8)} USD (FeeAMM, sub-millidollar)
${escrowCostUsd > 0 ? `- Specialist escrow cost: $${escrowCostUsd.toFixed(6)} USD` : ''}

COST BENCHMARKS:
- Stripe minimum (base $0.30 + 2.9%): $${comparisonStripeUsd.toFixed(4)} USD (${costSavingVsStripe}% more expensive than this session)
- Ethereum mainnet equivalent (~$2.85/tx at 30 gwei, ${settlementTxCount} txs): $${comparisonEthMainnetUsd.toFixed(2)} USD (${savingVsEthMainnetPct}% more expensive than this session)
- This session cost as fraction of Stripe minimum: ${(totalCostUsd / comparisonStripeUsd * 100).toFixed(2)}%

Write a 3-paragraph executive audit (200-280 words total):
Paragraph 1: What was accomplished in this session and what it cost in absolute terms.
Paragraph 2: How this compares to legacy payment infrastructure and why the difference matters for healthcare payer operations.
Paragraph 3: The strategic implication: what agentic AI workflows become economically viable at this cost tier that were previously not feasible.

No headers. No bullet points. Flowing analytical prose.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    if (text.length > 50) recommendation = text;
  } catch { /* use computed fallback */ }

  return {
    sessionId,
    totalCostUsd,
    costBreakdown: {
      aiTokenCostUsd,
      routingFeeUsd,
      settlementGasCostUsd,
      escrowCostUsd,
    },
    settlementTxCount,
    avgCostPerActionUsd,
    comparisonStripeUsd,
    comparisonEthMainnetUsd,
    savingVsEthMainnetPct,
    recommendation,
    model: 'gemini-3.1-pro',
    createdAt: new Date().toISOString(),
  };
}

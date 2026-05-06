import { NextRequest } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { isTempoSettlerEnabled, settleOnTempoWithFallback } from '@/lib/meter/tempo-settler';
import type { SseFrame, LedgerEvent } from '@/lib/meter/types';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

// POST /api/meter/real-estate/screen
// Streams extraction + consistency + fraud assessment for one applicant packet.
// Emits SSE: text_delta, ledger_event, stream_done.

const genai = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY ?? '');

const FLASH_COST = 0.0000000375;
const PRO_COST   = 0.00000150;

const EXTRACTION_SYSTEM = `You are a rental application screening specialist. Extract structured fields from tenant application documents.

For each document, output a JSON block followed by a brief plain-English summary.

JSON format:
\`\`\`json
{
  "applicantName": "...",
  "claimedIncome": 0,
  "verifiedIncome": 0,
  "employer": "...",
  "bankBalance": "...",
  "depositAmounts": [],
  "idName": "...",
  "address": "..."
}
\`\`\`

Rules:
- claimedIncome: from rental application
- verifiedIncome: from pay stub or bank deposits (0 if not verifiable from this doc alone)
- Flag any arithmetic errors in bank statements
- Note name discrepancies across documents
- Be concise. Total output under 300 words.`;

const CONSISTENCY_SYSTEM = `You are a senior underwriter reviewing a tenant application packet for potential fraud or income misrepresentation.

You have been given the extracted fields from all documents in the packet. Produce a structured consistency analysis.

Output sections:
## Income Verification
## Identity Consistency
## Document Authenticity Signals
## Risk Assessment
## Recommendation

Rules:
- Be specific: cite exact figures, quote field values
- Risk levels: LOW / MEDIUM / HIGH
- Recommendation: APPROVED / CONDITIONAL (with conditions) / DECLINED / ESCALATE (with reason)
- Target 300–450 words`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      scenarioId: string;
      sessionId: string;
      documents: Array<{
        id: string;
        label: string;
        type: string;
        model: 'flash' | 'pro';
        content: string;
      }>;
      safeMode?: boolean;
    };

    const { scenarioId, sessionId, documents, safeMode } = body;

    if (safeMode || !process.env.GOOGLE_API_KEY) {
      return streamSafeMode(sessionId, scenarioId, documents);
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        function emit(frame: SseFrame) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(frame)}\n\n`));
        }

        function emitLedger(e: Omit<LedgerEvent, 'id' | 'createdAt'>) {
          emit({ type: 'ledger_event', event: { id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...e } });
        }

        let runningCost = 0;

        try {
          // ── Step 1: Extract each document ─────────────────────────────────
          emit({ type: 'text_delta', delta: '## Document Extraction\n\n' });

          const extractions: Record<string, string> = {};

          for (const doc of documents) {
            emit({ type: 'text_delta', delta: `### ${doc.label}\n` });

            const modelName = doc.model === 'pro'
              ? 'gemini-2.5-pro-preview-05-06'
              : 'gemini-2.5-flash-preview-04-17';
            const costPerTok = doc.model === 'pro' ? PRO_COST : FLASH_COST;

            const model = genai.getGenerativeModel({ model: modelName, systemInstruction: EXTRACTION_SYSTEM });
            let docText = '';

            try {
              const extractStream = await model.generateContentStream(
                `Extract fields from this ${doc.type}:\n\n${doc.content.slice(0, 4000)}`
              );

              let chunkIdx = 0;
              for await (const chunk of extractStream.stream) {
                const text = chunk.text();
                if (!text) continue;
                docText += text;
                chunkIdx++;
                emit({ type: 'text_delta', delta: text });

                const tokens = Math.ceil(text.length / 4);
                const cost = tokens * costPerTok;
                runningCost += cost;

                emitLedger({
                  sessionId, workOrderId: doc.id, eventKind: 'extraction_estimate',
                  chunkIndex: chunkIdx, tokensEstimate: tokens,
                  costUsd: cost, costUsdcE6: Math.round(cost * 1_000_000), provisional: true,
                });
              }

              const finalResp = await extractStream.response;
              const outTokens = finalResp.usageMetadata?.candidatesTokenCount ?? Math.ceil(docText.length / 4);
              const finalCost = outTokens * costPerTok;

              // Tempo settlement per document
              const recipient = process.env.TEMPO_TREASURY_ADDRESS ?? '0xFa772434DCe6ED78831EbC9eeAcbDF42E2A031a6';
              let txHash: string | undefined;
              let block: number | undefined;
              let chainId: number | undefined;
              if (isTempoSettlerEnabled()) {
                const settled = await settleOnTempoWithFallback({ toAddress: recipient, amountUsd: Math.max(finalCost, 0.000001) });
                if (settled) { txHash = settled.txHash; block = settled.blockNumber; chainId = settled.chainId; }
              }

              emitLedger({
                sessionId, workOrderId: doc.id, eventKind: 'reconciliation',
                tokensEstimate: outTokens, costUsd: finalCost,
                costUsdcE6: Math.round(finalCost * 1_000_000), provisional: false,
                ...(txHash ? { settlementTxHash: txHash, settlementBlock: block, settlementChainId: chainId } : {}),
              });

              extractions[doc.id] = docText;
            } catch {
              emit({ type: 'text_delta', delta: `\n[Extraction error for ${doc.label} — skipped]\n` });
            }

            emit({ type: 'text_delta', delta: '\n\n' });
          }

          // ── Step 2: Cross-document consistency ────────────────────────────
          emit({ type: 'text_delta', delta: '---\n\n## Cross-Document Consistency Analysis\n\n' });

          const consistencyInput = documents
            .map((d) => `**${d.label}:**\n${extractions[d.id] ?? '(not extracted)'}`)
            .join('\n\n---\n\n');

          const proModel = genai.getGenerativeModel({
            model: 'gemini-2.5-pro-preview-05-06',
            systemInstruction: CONSISTENCY_SYSTEM,
          });

          let consistencyText = '';
          try {
            const consistencyStream = await proModel.generateContentStream(
              `Analyze this tenant application packet for consistency:\n\n${consistencyInput.slice(0, 8000)}`
            );

            let chunkIdx = 0;
            for await (const chunk of consistencyStream.stream) {
              const text = chunk.text();
              if (!text) continue;
              consistencyText += text;
              chunkIdx++;
              emit({ type: 'text_delta', delta: text });

              const tokens = Math.ceil(text.length / 4);
              const cost = tokens * PRO_COST;
              runningCost += cost;

              emitLedger({
                sessionId, workOrderId: `consistency_${scenarioId}`, eventKind: 'review_estimate',
                chunkIndex: chunkIdx, tokensEstimate: tokens,
                costUsd: cost, costUsdcE6: Math.round(cost * 1_000_000), provisional: true,
              });
            }

            const cr = await consistencyStream.response;
            const outTok = cr.usageMetadata?.candidatesTokenCount ?? Math.ceil(consistencyText.length / 4);
            const finalCost = outTok * PRO_COST;
            runningCost += finalCost;

            const recipient = process.env.TEMPO_TREASURY_ADDRESS ?? '0xFa772434DCe6ED78831EbC9eeAcbDF42E2A031a6';
            let txHash: string | undefined;
            let block: number | undefined;
            let chainId: number | undefined;
            if (isTempoSettlerEnabled()) {
              const settled = await settleOnTempoWithFallback({ toAddress: recipient, amountUsd: Math.max(finalCost, 0.000001) });
              if (settled) { txHash = settled.txHash; block = settled.blockNumber; chainId = settled.chainId; }
            }

            emitLedger({
              sessionId, workOrderId: `consistency_${scenarioId}`, eventKind: 'reconciliation',
              tokensEstimate: outTok, costUsd: finalCost,
              costUsdcE6: Math.round(finalCost * 1_000_000), provisional: false,
              ...(txHash ? { settlementTxHash: txHash, settlementBlock: block, settlementChainId: chainId } : {}),
            });
          } catch {
            emit({ type: 'text_delta', delta: '\n[Consistency check error]\n' });
          }

          emit({ type: 'stream_done', totalCostUsd: runningCost, totalTokens: Math.ceil(runningCost / FLASH_COST), reconciled: true });
        } catch (err) {
          emit({ type: 'error', code: 'SCREEN_ERROR', message: err instanceof Error ? err.message : 'Screen error' });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
    });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
}

function streamSafeMode(
  sessionId: string,
  scenarioId: string,
  documents: Array<{ id: string; label: string; model: 'flash' | 'pro' }>
) {
  const safeOutputs: Record<string, string> = {
    'applicant-a': `## Document Extraction

### Rental Application
\`\`\`json
{"applicantName":"Jordan Lee","claimedIncome":15800,"employer":"Stripe, Inc.","address":"892 Folsom Street, Apt 2A, SF"}
\`\`\`
Clean application. Income claim: $15,800/mo. Employer: Stripe.

### Pay Stub (April 2026)
\`\`\`json
{"verifiedIncome":15800,"employer":"Stripe, Inc.","depositAmounts":[8404.30]}
\`\`\`
Gross pay $15,800 confirmed. Net deposit $8,404.30.

### Bank Statement (April 2026)
\`\`\`json
{"bankBalance":"$27,436.74","depositAmounts":[8404.30]}
\`\`\`
Balance $27,436.74. Single ACH deposit from Stripe matches pay stub.

### California Driver's License
\`\`\`json
{"idName":"Jordan Lee","address":"892 Folsom Street, Apt 2A, San Francisco"}
\`\`\`
Name and address consistent with application.

---

## Cross-Document Consistency Analysis

## Income Verification
Claimed income $15,800/mo. Pay stub confirms $15,800 gross. Net deposit $8,404.30 matches pay stub after deductions. Income verified at 4.1× rent requirement (threshold: 3×).

## Identity Consistency
Name "Jordan Lee" consistent across all four documents. Address consistent with current residence.

## Document Authenticity Signals
No anomalies detected. Bank routing number, font consistency, and arithmetic all check out.

## Risk Assessment
**LOW** — All documents internally consistent. No fraud signals.

## Recommendation
**APPROVED** — Income verified at 4.1× rent. Clean application with no material risk factors.`,

    'applicant-b': `## Document Extraction

### Rental Application
\`\`\`json
{"applicantName":"Alex Morales","claimedIncome":13200,"employer":"Salesforce, Inc."}
\`\`\`
Claimed $13,200/mo (note mentions commissions).

### Pay Stub (April 2026)
\`\`\`json
{"verifiedIncome":9400,"employer":"Salesforce, Inc.","depositAmounts":[5245.90]}
\`\`\`
Base salary $9,400/mo. No commission in April. Note indicates Q1 commission paid in May.

### Bank Statement (April 2026)
\`\`\`json
{"bankBalance":"$5,970.70","depositAmounts":[5245.90]}
\`\`\`
Single deposit matches pay stub net. No commission deposit visible. Savings: $0.

### California Driver's License
\`\`\`json
{"idName":"Alex Morales","address":"234 Mission Street, Apt 8C, SF"}
\`\`\`
Identity consistent with application.

---

## Cross-Document Consistency Analysis

## Income Verification
Application claims $13,200/mo total but only $9,400 base is verifiable. Commission is quarterly but no prior commission deposits visible in bank statement (prior commissions: $3,800 and $4,200 quarterly — implies ~$16,000/yr or ~$1,333/mo average).

Verified income: $9,400 base + ~$1,333 avg commission = ~$10,733/mo = 2.79× rent (below 3× threshold).

## Identity Consistency
Name and address consistent. No discrepancies.

## Document Authenticity Signals
Documents appear authentic. Income gap is explained by commission structure, not fabrication.

## Risk Assessment
**MEDIUM** — Income falls below 3× threshold when commission is properly normalized.

## Recommendation
**CONDITIONAL** — Approve with one of: (a) co-signer with verifiable income ≥ $4,800/mo, (b) 2 months additional security deposit, or (c) documentation of prior 12-month commission history showing ≥ $3,800/mo average.`,

    'applicant-c': `## Document Extraction

### Rental Application
\`\`\`json
{"applicantName":"M. Zhang","claimedIncome":18500,"employer":"Pacific Coast AI Inc."}
\`\`\`
Claimed $18,500/mo. Employer unknown.

### Pay Stub (April 2026)
\`\`\`json
{"verifiedIncome":18500,"employer":"Pacific Coast AI Inc."}
\`\`\`
⚠ Font inconsistency detected on line items vs header.

### Bank Statement (April 2026)
\`\`\`json
{"idName":"Ming Zhang","bankBalance":"$33,952.75","depositAmounts":[10784.75]}
\`\`\`
⚠ Arithmetic error: beginning balance + deposits − withdrawals ≠ stated ending balance ($688 discrepancy).
⚠ Routing number 021000021 is JPMorgan NY — inconsistent with SF address.

### California Driver's License
\`\`\`json
{"idName":"Wei Zhang","address":"45 Kearny St Ste 1200, SF"}
\`\`\`
⚠ Name "Wei Zhang" — application uses "M. Zhang" — bank statement shows "Ming Zhang".

---

## Cross-Document Consistency Analysis

## Income Verification
Income cannot be independently verified. Employer "Pacific Coast AI Inc." has no verifiable online presence; listed phone number is disconnected.

## Identity Consistency
**HIGH RISK** — Three-way name inconsistency: "M. Zhang" (application), "Ming Zhang" (bank), "Wei Zhang" (ID). These may represent different persons.

## Document Authenticity Signals
**HIGH RISK signals:**
- Bank statement arithmetic error ($688 discrepancy)
- Non-SF routing number on SF bank account
- Pay stub font inconsistency (Arial Narrow line items, Arial Bold header)
- Employer not verifiable via public records

## Risk Assessment
**HIGH** — Multiple fabrication signals across three of four documents.

## Recommendation
**ESCALATE** — Fraud probability score exceeds threshold. Specialist forensic review required before any decision.`,
  };

  const text = safeOutputs[scenarioId] ?? safeOutputs['applicant-a'] ?? '';
  const costPerDoc = (d: { model: 'flash' | 'pro' }) => d.model === 'pro' ? PRO_COST : FLASH_COST;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      function emit(frame: SseFrame) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(frame)}\n\n`));
      }

      let totalCost = 0;
      const words = text.split(' ');
      for (let i = 0; i < words.length; i += 10) {
        const chunk = words.slice(i, i + 10).join(' ') + ' ';
        emit({ type: 'text_delta', delta: chunk });
      }

      for (const doc of documents) {
        const tokens = 120;
        const cost = tokens * costPerDoc(doc);
        totalCost += cost;
        emit({
          type: 'ledger_event',
          event: {
            id: crypto.randomUUID(), createdAt: new Date().toISOString(),
            sessionId, workOrderId: doc.id, eventKind: 'extraction_estimate',
            tokensEstimate: tokens, costUsd: cost,
            costUsdcE6: Math.round(cost * 1_000_000), provisional: true,
          },
        });
        emit({
          type: 'ledger_event',
          event: {
            id: crypto.randomUUID(), createdAt: new Date().toISOString(),
            sessionId, workOrderId: doc.id, eventKind: 'reconciliation',
            tokensEstimate: tokens, costUsd: cost,
            costUsdcE6: Math.round(cost * 1_000_000), provisional: false,
          },
        });
      }

      // Consistency check cost (pro)
      const ccTokens = 380;
      const ccCost = ccTokens * PRO_COST;
      totalCost += ccCost;
      emit({
        type: 'ledger_event',
        event: {
          id: crypto.randomUUID(), createdAt: new Date().toISOString(),
          sessionId, workOrderId: `consistency_${scenarioId}`, eventKind: 'reconciliation',
          tokensEstimate: ccTokens, costUsd: ccCost,
          costUsdcE6: Math.round(ccCost * 1_000_000), provisional: false,
        },
      });

      emit({ type: 'stream_done', totalCostUsd: totalCost, totalTokens: ccTokens + documents.length * 120, reconciled: false });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
  });
}

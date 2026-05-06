import { NextRequest } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { isTempoSettlerEnabled, settleOnTempoWithFallback } from '@/lib/meter/tempo-settler';
import type { SseFrame, LedgerEvent } from '@/lib/meter/types';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

// POST /api/meter/legal/review
// Streams a contract review for one document in the M&A data room.
// Emits SSE ledger events per chunk (provisional) + reconciliation at close.

const genai = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY ?? '');

const FLASH_COST_PER_TOKEN = 0.0000000375; // gemini-2.0-flash: $0.075/1M output tokens
const PRO_COST_PER_TOKEN   = 0.00000150;   // gemini-2.0-pro: $1.50/1M output tokens

const FLASH_SYSTEM = `You are an M&A due diligence paralegal assistant specializing in contract review for corporate transactions.

Your role is to rapidly review standard or low-complexity agreements (NDAs, LOIs, lease assignments, non-competes) and produce a structured summary for lead counsel review.

Output format — use these exact section headers:
## Document Classification
## Key Terms
## Risk Flags
## ABA Compliance Notes
## Counsel Recommendation

Rules:
- Be concise and precise. Target 300–450 words.
- Risk Flags: use NONE / LOW / MEDIUM / HIGH labels.
- Flag any provisions that conflict with standard market terms.
- Note any California-specific enforceability issues where relevant.
- Close with one of: "APPROVED — Standard form, no material issues" or "FLAGGED — Requires lead counsel review: [reason]"`;

const PRO_SYSTEM = `You are a senior M&A counsel specializing in technology company acquisitions. You are reviewing complex transaction documents in a $42M acquisition data room.

Your role is to produce a detailed due diligence analysis for each complex document, identifying material risks, negotiation points, and cross-document inconsistencies.

Output format — use these exact section headers:
## Document Classification
## Material Provisions
## Risk Analysis
## Cross-Document Conflicts (if any)
## Negotiation Recommendations
## ABA Compliance Notes
## Counsel Recommendation

Rules:
- Be thorough but actionable. Target 500–700 words.
- Risk Analysis: clearly label HIGH / MEDIUM / LOW risk items.
- Cross-Document Conflicts: reference specific sections from other documents in the data room if relevant.
- Negotiation Recommendations: be specific — suggest alternative language where appropriate.
- Close with one of: "APPROVED with noted conditions" or "REQUIRES NEGOTIATION — [specific issue]" or "ESCALATE — Material issue requires specialized review"`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      docId: string;
      docType: string;
      tier: 'flash' | 'pro';
      content: string;
      sessionId?: string;
      matterContext?: string;
      safeMode?: boolean;
    };

    const { docId, docType, tier, content, matterContext, safeMode } = body;
    const sessionId = body.sessionId ?? `legal_${crypto.randomUUID().slice(0, 8)}`;

    if (safeMode) {
      return streamSafeMode(sessionId, docId, tier);
    }

    if (!process.env.GOOGLE_API_KEY) {
      return streamSafeMode(sessionId, docId, tier, true);
    }

    const modelName = tier === 'pro' ? 'gemini-2.5-pro-preview-05-06' : 'gemini-2.5-flash-preview-04-17';
    const costPerToken = tier === 'pro' ? PRO_COST_PER_TOKEN : FLASH_COST_PER_TOKEN;
    const systemInstruction = tier === 'pro' ? PRO_SYSTEM : FLASH_SYSTEM;

    const model = genai.getGenerativeModel({ model: modelName, systemInstruction });

    const prompt = `Review the following ${docType} from the Acme Corp / Beta Technologies acquisition data room.
${matterContext ? `\nMATTER CONTEXT: ${matterContext}\n` : ''}
CONTRACT:
${content.slice(0, 8000)}

Produce your review following the required format. Identify any cross-document conflicts with the LOI, MSA, or acquisition agreement if you detect inconsistencies.`;

    let geminiStream: Awaited<ReturnType<typeof model.generateContentStream>>;
    try {
      geminiStream = await model.generateContentStream(prompt);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const isQuota = msg.includes('429') || msg.toLowerCase().includes('quota');
      return streamSafeMode(sessionId, docId, tier, isQuota);
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        function emit(frame: SseFrame) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(frame)}\n\n`));
        }

        let fullText = '';
        let chunkIndex = 0;
        let totalTokens = 0;
        let totalCostUsd = 0;

        try {
          for await (const chunk of geminiStream.stream) {
            const text = chunk.text();
            if (!text) continue;

            fullText += text;
            chunkIndex++;

            emit({ type: 'text_delta', delta: text });

            const tokens = Math.ceil(text.length / 4);
            totalTokens += tokens;
            const chunkCost = tokens * costPerToken;
            totalCostUsd += chunkCost;

            const event: Omit<LedgerEvent, 'id' | 'createdAt'> = {
              sessionId,
              workOrderId: docId,
              eventKind: 'review_estimate',
              chunkIndex,
              tokensEstimate: tokens,
              costUsd: chunkCost,
              costUsdcE6: Math.round(chunkCost * 1_000_000),
              provisional: true,
            };

            emit({ type: 'ledger_event', event: { id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...event } });
          }

          // Final token count
          const finalResponse = await geminiStream.response;
          const outputTokens = finalResponse.usageMetadata?.candidatesTokenCount ?? Math.ceil(fullText.length / 4);
          const finalCostUsd = outputTokens * costPerToken;

          // Tempo settlement
          let settlementTxHash: string | undefined;
          let settlementBlock: number | undefined;
          let settlementChainId: number | undefined;
          const recipient = process.env.TEMPO_TREASURY_ADDRESS ?? '0xFa772434DCe6ED78831EbC9eeAcbDF42E2A031a6';
          if (isTempoSettlerEnabled()) {
            const settled = await settleOnTempoWithFallback({
              toAddress: recipient,
              amountUsd: Math.max(finalCostUsd, 0.000001),
            });
            if (settled) {
              settlementTxHash = settled.txHash;
              settlementBlock = settled.blockNumber;
              settlementChainId = settled.chainId;
            }
          }

          const reconcile: Omit<LedgerEvent, 'id' | 'createdAt'> = {
            sessionId,
            workOrderId: docId,
            eventKind: 'reconciliation',
            tokensEstimate: outputTokens,
            costUsd: finalCostUsd,
            costUsdcE6: Math.round(finalCostUsd * 1_000_000),
            provisional: false,
            proofRef: `proof:${sessionId}:${docId}`,
            ...(settlementTxHash ? { settlementTxHash, settlementBlock, settlementChainId } : {}),
          };
          emit({ type: 'ledger_event', event: { id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...reconcile } });

          emit({ type: 'stream_done', totalCostUsd: finalCostUsd, totalTokens: outputTokens, reconciled: true });
        } catch (err) {
          emit({ type: 'error', code: 'STREAM_ERROR', message: err instanceof Error ? err.message : 'Stream error' });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
}

function streamSafeMode(sessionId: string, docId: string, tier: 'flash' | 'pro', quotaFallback = false) {
  const safeReview = tier === 'pro'
    ? `## Document Classification
Complex transaction document — routed to Gemini Pro for deep analysis.

## Material Provisions
[Safe mode — Gemini Pro analysis would appear here]
Key provisions include deal economics, representations and warranties, indemnification caps, and closing conditions. In a live run, each clause is analyzed for market conformance and risk level.

## Risk Analysis
**HIGH**: Training data representations are knowledge-qualified — acquirer should conduct independent data provenance review.
**MEDIUM**: LLaMA 2 Community License restricts commercial use above 700M MAU threshold.
**LOW**: Earnout revenue definition uses different standard than financial representations in Section 3.4.

## Cross-Document Conflicts
Potential conflict detected: LOI Article 4 closing condition (80% ARR customer consent) conflicts with MSA change-of-control notification language — verify scope of "consent" requirement.

## Negotiation Recommendations
1. Expand IP rep (Section 3.6) beyond "knowledge" qualification for Core ML Assets
2. Align earnout revenue definition with GAAP treatment in financial representations
3. Request specific carve-out for industry-wide ML training data claims

## ABA Compliance Notes
${quotaFallback ? '⚠ Gemini API quota exceeded — synthetic review shown.\n\n' : ''}This review was generated in safe mode. In a live run, all AI analysis would be settled on Tempo mainnet as USDC.e micropayments.

## Counsel Recommendation
REQUIRES NEGOTIATION — IP representations and earnout mechanics require alignment before signing.`
    : `## Document Classification
Standard-complexity document — routed to Gemini Flash for rapid review.

## Key Terms
[Safe mode — Gemini Flash analysis would appear here]
Standard boilerplate with industry-typical provisions. Term, obligations, and carve-outs reviewed.

## Risk Flags
**LOW**: California Section 16600 non-compete enforceability — sale-of-business exception likely applies but confirm with CA counsel.

## ABA Compliance Notes
${quotaFallback ? '⚠ Gemini API quota exceeded — synthetic review shown.\n\n' : ''}This review was generated in safe mode.

## Counsel Recommendation
APPROVED — Standard form, no material issues.`;

  const costPerToken = tier === 'pro' ? PRO_COST_PER_TOKEN : FLASH_COST_PER_TOKEN;
  const simulatedTokens = tier === 'pro' ? 520 : 280;
  const simulatedCost = simulatedTokens * costPerToken;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      function emit(frame: SseFrame) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(frame)}\n\n`));
      }

      const words = safeReview.split(' ');
      let chunkIndex = 0;
      for (let i = 0; i < words.length; i += 8) {
        const chunk = words.slice(i, i + 8).join(' ') + ' ';
        chunkIndex++;
        const tokens = Math.ceil(chunk.length / 4);
        const chunkCost = tokens * costPerToken;
        emit({ type: 'text_delta', delta: chunk });
        emit({
          type: 'ledger_event',
          event: {
            id: crypto.randomUUID(), createdAt: new Date().toISOString(),
            sessionId, workOrderId: docId, eventKind: 'review_estimate',
            chunkIndex, tokensEstimate: tokens, costUsd: chunkCost,
            costUsdcE6: Math.round(chunkCost * 1_000_000), provisional: true,
          },
        });
      }

      emit({
        type: 'ledger_event',
        event: {
          id: crypto.randomUUID(), createdAt: new Date().toISOString(),
          sessionId, workOrderId: docId, eventKind: 'reconciliation',
          tokensEstimate: simulatedTokens, costUsd: simulatedCost,
          costUsdcE6: Math.round(simulatedCost * 1_000_000), provisional: false,
          proofRef: `proof:${sessionId}:${docId}:safemode`,
        },
      });

      emit({ type: 'stream_done', totalCostUsd: simulatedCost, totalTokens: simulatedTokens, reconciled: false });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
  });
}

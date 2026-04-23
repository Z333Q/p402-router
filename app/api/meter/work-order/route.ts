import { NextRequest, NextResponse } from 'next/server';
import { parsePacketToWorkOrder, parseDocumentMultimodal } from '@/lib/meter/work-order-parser';
import { insertWorkOrder, getWorkOrder } from '@/lib/meter/queries';

export const dynamic = 'force-dynamic';

// POST /api/meter/work-order
// Run Gemini extraction on a packet, text or multimodal (image/PDF)
// Returns WorkOrder + toolTrace + degraded flag

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      // Text path
      packetContent?: string;
      // Multimodal path
      fileData?: { base64Data: string; mimeType: string };
      // Shared
      packetAssetId?: string;
      sessionId?: string;
      budgetHintUsd?: number;
      packetFormat?: string;
    };

    const isMultimodal = body.fileData != null;

    if (!isMultimodal && !body.packetContent) {
      return NextResponse.json({ error: 'packetContent or fileData is required' }, { status: 400 });
    }

    const parseOptions = {
      tenantId: 'demo',
      sessionId: body.sessionId,
      budgetHintUsd: body.budgetHintUsd,
      packetFormat: (body.packetFormat ?? 'text') as 'text' | 'pdf' | 'image',
    };

    const { workOrder: parsed, toolTrace, degraded, degradedReason } = isMultimodal
      ? await parseDocumentMultimodal(body.fileData!, {
          ...parseOptions,
          packetFormat: (body.packetFormat as 'image' | 'pdf') ?? 'image',
        })
      : await parsePacketToWorkOrder(body.packetContent!, parseOptions);

    const saved = await insertWorkOrder({ ...parsed, tenantId: 'demo' });

    return NextResponse.json({
      workOrder: saved,
      toolTrace,
      degraded,
      ...(degradedReason ? { degradedReason } : {}),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'work-order creation failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// GET /api/meter/work-order?id=<uuid>
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const wo = await getWorkOrder(id);
  if (!wo) return NextResponse.json({ error: 'not found' }, { status: 404 });

  return NextResponse.json({ workOrder: wo });
}

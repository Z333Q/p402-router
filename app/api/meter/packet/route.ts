import { NextRequest, NextResponse } from 'next/server';
import { insertPacketAsset } from '@/lib/meter/queries';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

// POST /api/meter/packet
// Accept a de-identified prior-auth packet (text or base64 file ref)
// Returns a PacketAsset record for use in work-order creation

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      content?: string;
      packetType?: string;
      format?: string;
      sourceLabel?: string;
      sessionId?: string;
    };

    const content = typeof body.content === 'string' ? body.content.trim() : '';
    if (!content) {
      return NextResponse.json({ error: 'content is required' }, { status: 400 });
    }

    const sha256 = crypto.createHash('sha256').update(content).digest('hex');
    const previewText = content.slice(0, 300);

    const packetType = (body.packetType ?? 'prior_auth_packet') as
      'prior_auth_packet' | 'utilization_review_packet' | 'administrative_policy_packet';

    const asset = await insertPacketAsset({
      tenantId: 'demo',
      sessionId: body.sessionId,
      assetType: (body.format ?? 'text') as 'text' | 'pdf' | 'image',
      inlineContent: content,
      sha256,
      sourceLabel: body.sourceLabel ?? 'demo-packet',
      deidentified: true,
      packetType,
    });

    return NextResponse.json({
      ...asset,
      previewText,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'packet intake failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

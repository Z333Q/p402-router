import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import redis from '@/lib/redis';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    // 1. Auth
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return new Response('Unauthorized', { status: 401 });
    }
    const tenantId = (session.user as any).tenantId as string;
    if (!tenantId) {
        return new Response('No tenant context', { status: 401 });
    }

    const url = new URL(req.url);
    const scopeType = url.searchParams.get('scope_type');
    const scopeId = url.searchParams.get('scope_id');

    if (!scopeType || !scopeId) {
        return new Response('Missing scope parameters', { status: 400 });
    }

    // 2. SSE Web Stream
    let subscriber: typeof redis | null = null;

    const stream = new ReadableStream({
        async start(controller) {
            const encoder = new TextEncoder();

            const sendEvent = (data: any) => {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
            };

            // Heartbeat — prevents Vercel/Cloudflare from killing the connection
            const heartbeat = setInterval(() => {
                controller.enqueue(encoder.encode(`: heartbeat\n\n`));
            }, 15000);

            // 3. Redis Pub/Sub (fail-open if Redis down)
            if (redis) {
                try {
                    subscriber = redis.duplicate();
                    const channel = `audit_updates:${tenantId}:${scopeType}:${scopeId}`;

                    await subscriber.subscribe(channel);

                    subscriber.on('message', (chan: string, message: string) => {
                        if (chan === channel) {
                            try {
                                sendEvent(JSON.parse(message));
                            } catch {
                                sendEvent({ type: 'PARSE_ERROR' });
                            }
                        }
                    });
                } catch (err) {
                    console.error('[SSE] Redis subscribe failed (fail-open):', err);
                    sendEvent({ type: 'NO_STREAM_AVAILABLE' });
                }
            } else {
                sendEvent({ type: 'NO_STREAM_AVAILABLE' });
            }

            // 4. Cleanup on disconnect
            req.signal.addEventListener('abort', () => {
                clearInterval(heartbeat);
                if (subscriber) {
                    subscriber.unsubscribe().catch(() => { });
                    subscriber.quit().catch(() => { });
                }
                controller.close();
            });
        },
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            Connection: 'keep-alive',
        },
    });
}


import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { query } from '@/lib/db';
import { A2AMessage } from '@/lib/a2a-types';

export const runtime = 'nodejs'; // or 'edge'

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        if (body.jsonrpc !== '2.0' || body.method !== 'message/stream') {
            return NextResponse.json({ error: 'Invalid method' }, { status: 400 });
        }

        const { params } = body;
        const streamId = body.id || `stream-${uuidv4()}`;
        const userMessage: A2AMessage = params.message;

        // Create a TransformStream for SSE
        const encoder = new TextEncoder();
        const stream = new TransformStream();
        const writer = stream.writable.getWriter();

        // Start processing in background
        (async () => {
            try {
                // 1. Emit Initial Event
                await writer.write(encoder.encode(`data: ${JSON.stringify({ type: 'task.status', data: { state: 'processing' } })}\n\n`));

                // 2. Simulate streaming delta (In reality, we'd call an AI model here)
                const firstPart = userMessage.parts && userMessage.parts.length > 0 ? userMessage.parts[0] : null;
                const textContent = firstPart && 'text' in firstPart ? firstPart.text : "your message";
                const responseText = "This is a streamed response to: " + (textContent || "your message");
                const chunks = responseText.split(' ');

                for (const chunk of chunks) {
                    await new Promise(r => setTimeout(r, 100)); // Simulate latency
                    const delta = {
                        type: 'message.delta',
                        data: {
                            delta: { text: chunk + " " },
                            index: 0
                        }
                    };
                    await writer.write(encoder.encode(`data: ${JSON.stringify(delta)}\n\n`));
                }

                // 3. Emit Completion
                const finalMessage = {
                    type: 'message.complete',
                    data: {
                        message: {
                            role: 'agent',
                            parts: [{ type: 'text', text: responseText }]
                        },
                        usage: { input_tokens: 10, output_tokens: 20 }
                    }
                };
                await writer.write(encoder.encode(`data: ${JSON.stringify(finalMessage)}\n\n`));

                // 4. Emit Task Status Complete
                await writer.write(encoder.encode(`data: ${JSON.stringify({ type: 'task.status', data: { state: 'completed' } })}\n\n`));

            } catch (e) {
                console.error(e);
                await writer.write(encoder.encode(`data: ${JSON.stringify({ type: 'error', error: { message: 'Internal error' } })}\n\n`));
            } finally {
                await writer.close();
            }
        })();

        return new NextResponse(stream.readable, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });

    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

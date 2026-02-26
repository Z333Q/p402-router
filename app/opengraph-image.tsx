import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
    return new ImageResponse(
        (
            <div
                style={{
                    background: '#000000',
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    justifyContent: 'center',
                    padding: '80px 96px',
                    fontFamily: 'monospace',
                    position: 'relative',
                }}
            >
                {/* Acid-green top accent bar */}
                <div style={{
                    position: 'absolute',
                    top: 0, left: 0,
                    width: '100%', height: '6px',
                    background: '#B6FF2E',
                }} />

                {/* Badge */}
                <div style={{
                    background: '#B6FF2E',
                    color: '#000000',
                    fontWeight: 900,
                    fontSize: 16,
                    textTransform: 'uppercase',
                    letterSpacing: '0.15em',
                    padding: '6px 16px',
                    marginBottom: '32px',
                    display: 'flex',
                    border: '2px solid #000',
                }}>
                    AI Payment Router
                </div>

                {/* Logo / Brand */}
                <div style={{
                    fontSize: 112,
                    fontWeight: 900,
                    color: '#FFFFFF',
                    textTransform: 'uppercase',
                    letterSpacing: '-0.04em',
                    lineHeight: 1,
                    marginBottom: '16px',
                    display: 'flex',
                }}>
                    P402
                    <span style={{ color: '#B6FF2E' }}>.io</span>
                </div>

                {/* Tagline */}
                <div style={{
                    fontSize: 28,
                    fontWeight: 700,
                    color: '#A8A8A8',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: '40px',
                    display: 'flex',
                }}>
                    300+ Models · USDC Settlement · A2A Protocol
                </div>

                {/* Feature pills */}
                <div style={{ display: 'flex', gap: '12px' }}>
                    {['x402 Protocol', 'EIP-3009', 'Base L2', 'OpenAI Compatible'].map(tag => (
                        <div key={tag} style={{
                            background: 'transparent',
                            border: '2px solid #2B2B2B',
                            color: '#CFCFCF',
                            fontSize: 14,
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.1em',
                            padding: '6px 14px',
                            display: 'flex',
                        }}>{tag}</div>
                    ))}
                </div>

                {/* Bottom-right domain watermark */}
                <div style={{
                    position: 'absolute',
                    bottom: 48,
                    right: 80,
                    fontSize: 18,
                    fontWeight: 700,
                    color: '#2B2B2B',
                    textTransform: 'uppercase',
                    letterSpacing: '0.15em',
                    display: 'flex',
                }}>
                    p402.io
                </div>
            </div>
        ),
        { ...size }
    );
}

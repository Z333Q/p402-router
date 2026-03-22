import type { Metadata } from 'next';
import './globals.css';
import { MiniKitProvider } from './providers';

export const metadata: Metadata = {
    title: 'P402 — AI Router',
    description: 'Multi-provider AI routing with World ID free trial credits',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body>
                <MiniKitProvider>
                    {children}
                </MiniKitProvider>
            </body>
        </html>
    );
}

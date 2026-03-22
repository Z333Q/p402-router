'use client';

import { MiniKit } from '@worldcoin/minikit-js';
import { useEffect } from 'react';

const APP_ID = process.env.NEXT_PUBLIC_APP_ID ?? '';

export function MiniKitProvider({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        // Install MiniKit once on mount
        MiniKit.install(APP_ID);
    }, []);

    return <>{children}</>;
}

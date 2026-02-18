'use client';

import { Suspense } from 'react';
import { SessionProvider } from 'next-auth/react';
import { RefTracker } from '@/components/RefTracker';

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            <Suspense fallback={null}>
                <RefTracker />
            </Suspense>
            {children}
        </SessionProvider>
    );
}

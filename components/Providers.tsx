'use client';

import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { useMemo, type ReactNode } from 'react';

/**
 * Wallets are discovered through the Wallet Standard (Phantom, Solflare, Backpack, etc.),
 * so no per-wallet adapters are bundled. RPC calls go through our own /api/rpc proxy.
 */
export default function Providers({ children }: { children: ReactNode }) {
  const endpoint = useMemo(
    () => (typeof window === 'undefined' ? 'https://luasol.io/api/rpc' : `${window.location.origin}/api/rpc`),
    [],
  );
  return (
    <ConnectionProvider endpoint={endpoint} config={{ commitment: 'confirmed' }}>
      <WalletProvider wallets={[]} autoConnect>
        {children}
      </WalletProvider>
    </ConnectionProvider>
  );
}

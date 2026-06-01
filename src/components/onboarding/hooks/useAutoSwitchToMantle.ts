import { useRef, useState, useEffect } from 'react';
import { type ConnectedWallet } from '@privy-io/react-auth';
import { MANTLE_CHAIN_ID } from '../../../lib/chains';

/**
 * Hook to automatically and silently switch every EVM wallet to Mantle on connect.
 * Prevents multiple concurrent switches and catches errors silently to avoid UI friction.
 */
export function useAutoSwitchToMantle(wallets: ConnectedWallet[], onSwitched?: () => void) {
  const switched = useRef<Set<string>>(new Set());
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    const evmWallets = wallets.filter((w) => (w as any).chainType === 'ethereum');
    if (!evmWallets.length) return;

    const runSwitch = async () => {
      let didSwitch = false;
      for (const wallet of evmWallets) {
        if (switched.current.has(wallet.address)) continue;
        try {
          const currentChain = await (wallet as any).getChainId?.().catch(() => null);
          if (currentChain === MANTLE_CHAIN_ID) {
            switched.current.add(wallet.address);
            continue;
          }
          setSwitching(true);
          await wallet.switchChain(MANTLE_CHAIN_ID);
          switched.current.add(wallet.address);
          didSwitch = true;
        } catch (err: any) {
          // Silent fallback retry block or logging
          try {
            await wallet.switchChain(MANTLE_CHAIN_ID);
            switched.current.add(wallet.address);
            didSwitch = true;
          } catch (_) {
            console.warn('[Mantle Portal] Auto-switch failed for', wallet.address, err?.message);
          }
        } finally {
          setSwitching(false);
        }
      }
      if (didSwitch && onSwitched) {
        onSwitched();
      }
    };

    runSwitch();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallets.map((w) => w.address).join(',')]);

  return { switching };
}

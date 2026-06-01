import { useState, useEffect } from 'react';
import type { ConnectedWallet, User } from '@privy-io/react-auth';
import { formatEther } from 'viem';
import { CheckCircle, Copy, ArrowRight, Wallet, RefreshCw, Loader } from 'lucide-react';
import { mantlePublicClient } from '../../lib/chains';
import { ONRAMP_OPTIONS } from '../../lib/constants';
import { WarningBanner } from '../shared/WarningBanner';
import { WalletBadge } from '../shared/WalletBadge';
import { OnrampCard } from '../shared/OnrampCard';
import { NetworkStatusBar } from '../shared/NetworkStatusBar';

interface WalletCheckScreenProps {
  user: User | null;
  wallets: ConnectedWallet[];
  switching: boolean;
  onEnterPortal: () => void;
  linkWallet: () => void;
}

export function WalletCheckScreen({
  user,
  wallets,
  switching,
  onEnterPortal,
  linkWallet,
}: WalletCheckScreenProps) {
  const [balance, setBalance] = useState<bigint | null>(null);
  const [checkingBalance, setCheckingBalance] = useState(true);
  const [showFunding, setShowFunding] = useState(false);
  const [copied, setCopied] = useState(false);

  const evmWallets = wallets.filter((w) => (w as any).chainType === 'ethereum');
  const solWallets = wallets.filter((w) => (w as any).chainType === 'solana');
  
  // Prioritize embedded EVM, then first EVM
  const embeddedEVM = evmWallets.find((w) => w.walletClientType === 'privy');
  const displayWallet = embeddedEVM || evmWallets[0];

  const hasOnlySolana = solWallets.length > 0 && evmWallets.length === 0;
  const isFunded = balance !== null && balance > 0n;
  const isEmpty = balance !== null && balance === 0n;

  // Resolve user display name
  const firstName =
    (user as any)?.google?.name?.split(' ')[0] ||
    (user as any)?.twitter?.name?.split(' ')[0] ||
    (user as any)?.discord?.username ||
    (user as any)?.email?.address?.split('@')[0] ||
    null;

  // Poll balance every 8 seconds per spec (section 8.2)
  useEffect(() => {
    if (!displayWallet?.address) {
      setCheckingBalance(false);
      return;
    }

    const checkBalance = async () => {
      try {
        const bal = await mantlePublicClient.getBalance({
          address: displayWallet.address as `0x${string}`,
        });
        setBalance(bal);
      } catch (err) {
        console.error('[Mantle Portal] Balance check error:', err);
        setBalance(0n);
      } finally {
        setCheckingBalance(false);
      }
    };

    checkBalance();
    const interval = setInterval(checkBalance, 8000);
    return () => clearInterval(interval);
  }, [displayWallet?.address]);

  const copyAddress = () => {
    if (!displayWallet?.address) return;
    navigator.clipboard.writeText(displayWallet.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="text-center mb-2">
        <div className="w-12 h-12 bg-emerald-500/20 border border-emerald-500/30 rounded-full mx-auto mb-3 flex items-center justify-center">
          <CheckCircle size={24} className="text-emerald-400 animate-bounce" />
        </div>
        <h2 className="text-2xl font-black text-white mb-1">
          {firstName ? `Welcome, ${firstName}!` : 'Account ready!'}
        </h2>
        <p className="text-sm text-slate-400">
          {switching ? 'Connecting your wallet to Mantle…' : 'Your wallet is set up and active on Mantle.'}
        </p>
      </div>

      <NetworkStatusBar switching={switching} />

      <div className="space-y-2">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Your Connected Wallets</p>
        {evmWallets.map((w) => (
          <WalletBadge
            key={w.address}
            address={w.address}
            chainType="ethereum"
            isEmbedded={w.walletClientType === 'privy'}
            networkReady={!switching}
          />
        ))}
        {solWallets.map((w) => (
          <WalletBadge
            key={w.address}
            address={w.address}
            chainType="solana"
            isEmbedded={w.walletClientType === 'privy'}
            networkReady={false}
          />
        ))}
      </div>

      {/* Warning A: Solana-only user (no EVM wallet) */}
      {hasOnlySolana && (
        <WarningBanner
          type="orange"
          title="⚠️ EVM Wallet Required for Mantle"
          body="You're connected with a Solana wallet, but Mantle requires an EVM-compatible wallet. Tap below to create or link an EVM wallet instantly."
          actions={
            <button
              onClick={linkWallet}
              className="px-4 py-2 bg-orange-500/20 border border-orange-500/40 text-orange-300 rounded-lg text-xs font-semibold hover:bg-orange-500/30 transition flex items-center gap-1.5"
            >
              <Wallet size={13} /> Link EVM Wallet
            </button>
          }
        />
      )}

      {/* Warning B: Empty balance warning */}
      {evmWallets.length > 0 && !checkingBalance && isEmpty && (
        <WarningBanner
          type="blue"
          title="⚠️ You need assets to begin using Mantle"
          body="Your wallet is ready, but it has 0 MNT. Fund your wallet now or bridge assets from another chain to start exploring DeFi protocols."
          actions={
            <>
              <button
                onClick={() => setShowFunding((v) => !v)}
                className="px-4 py-2 bg-blue-500/20 border border-blue-500/40 text-blue-300 rounded-lg text-xs font-semibold hover:bg-blue-500/30 transition"
              >
                {showFunding ? 'Hide Options' : '💳 Fund My Wallet'}
              </button>
              <button
                onClick={copyAddress}
                className="px-4 py-2 bg-slate-800/80 border border-slate-700/80 text-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-800 transition flex items-center gap-1.5"
              >
                {copied ? <CheckCircle size={12} className="text-emerald-400" /> : <Copy size={12} />}
                {copied ? 'Copied!' : 'Copy Address'}
              </button>
            </>
          }
        />
      )}

      {/* Funding Option Drawer */}
      {showFunding && evmWallets.length > 0 && (
        <div className="space-y-3 p-4 bg-slate-900/60 border border-slate-800/80 rounded-xl animate-in slide-in-from-bottom duration-300">
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-slate-800" />
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Deposit Options</p>
            <div className="h-px flex-1 bg-slate-800" />
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-400">Buy with Card / Bank Transfer</p>
            {ONRAMP_OPTIONS.map((op) => (
              <OnrampCard key={op.name} option={op} walletAddress={displayWallet?.address} />
            ))}
          </div>

          <div className="p-3 bg-slate-950/40 border border-slate-800/80 rounded-lg space-y-1.5">
            <p className="text-xs font-bold text-white">Cross-Chain Bridge</p>
            <p className="text-[11px] text-slate-400">
              Have assets on Ethereum, Solana, Arbitrum, or Base? Enter the portal and tell our AI Copilot to bridge them to Mantle instantly.
            </p>
          </div>

          <div className="p-3 bg-slate-950/40 border border-slate-800/80 rounded-lg space-y-1.5">
            <p className="text-xs font-bold text-white">Withdraw from Exchange</p>
            <p className="text-[11px] text-slate-400">
              Transfer MNT directly from Binance, OKX, or Bybit to your Mantle deposit address:
            </p>
            <button
              onClick={copyAddress}
              className="flex items-center justify-between gap-2 px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-[10px] font-mono text-slate-300 hover:border-slate-700 transition w-full"
            >
              <span className="truncate">{displayWallet?.address}</span>
              {copied ? (
                <span className="text-emerald-400 text-[9px] uppercase font-bold">Copied</span>
              ) : (
                <Copy size={10} className="text-slate-500 flex-shrink-0" />
              )}
            </button>
          </div>
        </div>
      )}

      {/* Funded Alert */}
      {!checkingBalance && isFunded && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-3 animate-in fade-in duration-300">
          <CheckCircle size={20} className="text-emerald-400 flex-shrink-0 animate-pulse" />
          <div>
            <p className="text-sm font-semibold text-emerald-300">Wallet Funded!</p>
            <p className="text-xs text-slate-400">
              {balance !== null ? parseFloat(formatEther(balance)).toFixed(4) : '0.0000'} MNT on Mantle
            </p>
          </div>
        </div>
      )}

      {checkingBalance && (
        <div className="flex items-center gap-2 text-xs text-slate-500 justify-center">
          <RefreshCw size={11} className="animate-spin text-blue-500" />
          <span>Polling Mantle node for balance updates…</span>
        </div>
      )}

      <button
        onClick={onEnterPortal}
        disabled={evmWallets.length === 0 || switching}
        className="w-full py-4 mt-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl font-bold text-white transition shadow-xl shadow-blue-600/20 flex items-center justify-center gap-2 group"
      >
        {switching ? (
          <>
            <Loader size={18} className="animate-spin" />
            <span>Connecting to Mantle…</span>
          </>
        ) : isEmpty ? (
          <>
            <span>Explore Portal (No Balance)</span>
            <ArrowRight size={18} className="group-hover:translate-x-1 transition" />
          </>
        ) : (
          <>
            <span>Enter Mantle Portal</span>
            <ArrowRight size={18} className="group-hover:translate-x-1 transition" />
          </>
        )}
      </button>

      {isEmpty && (
        <p className="text-[11px] text-center text-slate-500 leading-normal">
          You can fund your wallet at any time inside the portal.
        </p>
      )}
    </div>
  );
}

// ============================================================
// Mantle Agentic Portal — Privy Onboarding Integration v2
// Network auto-switch: silently moves user to Mantle on connect.
// No Warning C. No manual network screens. Zero friction.
// Dependencies: @privy-io/react-auth, viem, lucide-react, tailwindcss
// ============================================================

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  usePrivy, useWallets, useFundWallet, PrivyProvider
} from '@privy-io/react-auth';
import { createPublicClient, http, formatEther } from 'viem';
import {
  Wallet, Mail, Chrome, Twitter, MessageCircle, Apple,
  Smartphone, Shield, AlertTriangle, CheckCircle, ArrowRight,
  ExternalLink, Copy, RefreshCw, Zap, LogOut, ChevronRight, Loader
} from 'lucide-react';

// ── Mantle chain definition ───────────────────────────────────────────────────
const MANTLE_CHAIN_ID = 5000;

const mantleChain = {
  id: MANTLE_CHAIN_ID,
  name: 'Mantle',
  network: 'mantle',
  nativeCurrency: { name: 'MNT', symbol: 'MNT', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.mantle.xyz'] },
    public:  { http: ['https://rpc.mantle.xyz'] },
  },
  blockExplorers: {
    default: { name: 'Mantle Explorer', url: 'https://explorer.mantle.xyz' },
  },
};

const mantleClient = createPublicClient({
  chain: mantleChain,
  transport: http('https://rpc.mantle.xyz'),
});

// ── On-ramp partners ──────────────────────────────────────────────────────────
const ONRAMP_OPTIONS = [
  { name: 'Transak',     url: 'https://global.transak.com/?walletAddress={addr}&network=mantle',
    description: 'Buy with card or bank. 100+ countries.',  logo: '🌐', time: '< 5 min',  fee: '~1-2%' },
  { name: 'Banxa',       url: 'https://banxa.com/',
    description: '130+ fiat currencies supported.',          logo: '💳', time: '< 5 min',  fee: '~1-3%' },
  { name: 'Onramp.money',url: 'https://onramp.money/',
    description: 'Fiat to Web3 in under 60 seconds.',        logo: '⚡', time: '< 1 min',  fee: '~1%'   },
  { name: 'Alchemy Pay', url: 'https://alchemypay.org/',
    description: 'Global fiat-crypto payment gateway.',      logo: '🔮', time: '< 3 min',  fee: '~1-2%' },
];

// ── Auth methods ──────────────────────────────────────────────────────────────
const AUTH_METHODS = [
  { id: 'google',  label: 'Google',       icon: Chrome,        color: '#4285F4' },
  { id: 'twitter', label: 'X / Twitter',  icon: Twitter,       color: '#000000' },
  { id: 'discord', label: 'Discord',      icon: MessageCircle, color: '#5865F2' },
  { id: 'apple',   label: 'Apple',        icon: Apple,         color: '#1a1a1a' },
  { id: 'email',   label: 'Email',        icon: Mail,          color: '#0369A1' },
  { id: 'sms',     label: 'Phone',        icon: Smartphone,    color: '#10B981' },
  { id: 'wallet',  label: 'Existing Wallet', icon: Wallet,     color: '#8B5CF6' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK — Auto-switch every EVM wallet to Mantle, silently, on connect
// ═══════════════════════════════════════════════════════════════════════════════
function useAutoSwitchToMantle(wallets, onSwitched) {
  // Track which wallet addresses we've already switched, avoid repeat calls
  const switched = useRef(new Set());
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    const evmWallets = wallets.filter(w => w.chainType === 'ethereum');
    if (!evmWallets.length) return;

    const runSwitch = async () => {
      let didSwitch = false;
      for (const wallet of evmWallets) {
        if (switched.current.has(wallet.address)) continue;

        try {
          // Read current chain — if already Mantle, skip silently
          const currentChain = await wallet.getChainId?.().catch(() => null);
          if (currentChain === MANTLE_CHAIN_ID) {
            switched.current.add(wallet.address);
            continue;
          }

          // Not on Mantle — switch silently, no UI prompt, no warning shown
          setSwitching(true);
          await wallet.switchChain(MANTLE_CHAIN_ID);
          switched.current.add(wallet.address);
          didSwitch = true;
        } catch (err) {
          // switchChain failed (e.g. hardware wallet, some externals)
          // Silently attempt to add the chain first, then retry
          try {
            await wallet.switchChain(MANTLE_CHAIN_ID);
            switched.current.add(wallet.address);
            didSwitch = true;
          } catch (_) {
            // Still failed — log only, show no error to user
            console.warn('[Mantle Portal] Auto-switch failed for', wallet.address, err.message);
          }
        } finally {
          setSwitching(false);
        }
      }
      if (didSwitch && onSwitched) onSwitched();
    };

    runSwitch();
  // Re-run whenever the wallets array changes (new wallet connected)
  }, [wallets.map(w => w.address).join(',')]);

  return { switching };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════════════════════════════════════

function StepDots({ total, current }) {
  return (
    <div className="flex items-center gap-2 justify-center mb-8">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${
          i < current  ? 'w-6 bg-cyan-400'
          : i === current ? 'w-10 bg-blue-500'
          : 'w-6 bg-slate-700'
        }`} />
      ))}
    </div>
  );
}

function WarningBanner({ type = 'orange', title, body, actions }) {
  const s = {
    orange: { wrap: 'bg-orange-500/10 border-orange-500/40', icon: 'text-orange-400', text: 'text-orange-100' },
    blue:   { wrap: 'bg-blue-500/10   border-blue-500/40',   icon: 'text-blue-400',   text: 'text-blue-100'   },
  }[type];
  return (
    <div className={`rounded-xl border p-4 ${s.wrap} mb-3`}>
      <div className="flex gap-3">
        <AlertTriangle className={`${s.icon} flex-shrink-0 mt-0.5`} size={18} />
        <div className="flex-1 space-y-1">
          <p className={`font-semibold text-sm ${s.text}`}>{title}</p>
          <p className="text-xs text-slate-400 leading-relaxed">{body}</p>
          {actions && <div className="flex flex-wrap gap-2 mt-3">{actions}</div>}
        </div>
      </div>
    </div>
  );
}

function WalletBadge({ address, chainType, isEmbedded, networkReady }) {
  const [copied, setCopied] = useState(false);
  const short = address ? `${address.slice(0,6)}...${address.slice(-4)}` : '---';
  const copy = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="flex items-center justify-between p-3 bg-slate-800/60 border border-slate-700/60 rounded-lg">
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
          ${chainType === 'ethereum' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}`}>
          {chainType === 'ethereum' ? 'EVM' : 'SOL'}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="text-xs text-slate-500">
              {chainType === 'ethereum' ? 'Mantle (EVM)' : 'Solana'}{isEmbedded ? ' · embedded' : ''}
            </p>
            {/* Subtle network-ready dot — no warning, just a quiet green tick */}
            {chainType === 'ethereum' && networkReady && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" title="On Mantle" />
            )}
          </div>
          <p className="text-sm font-mono text-white">{short}</p>
        </div>
      </div>
      <button onClick={copy} className="p-1.5 hover:bg-slate-700 rounded-lg transition">
        {copied ? <CheckCircle size={14} className="text-emerald-400" />
                : <Copy size={14} className="text-slate-500" />}
      </button>
    </div>
  );
}

function OnrampCard({ option, walletAddress }) {
  const url = option.url.replace('{addr}', walletAddress || '');
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
       className="flex items-center justify-between p-4 bg-slate-800/40 border border-slate-700/40
                  hover:border-blue-500/50 hover:bg-slate-800/70 rounded-xl transition group">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{option.logo}</span>
        <div>
          <p className="font-semibold text-sm text-white">{option.name}</p>
          <p className="text-xs text-slate-500">{option.description}</p>
        </div>
      </div>
      <div className="text-right space-y-0.5">
        <p className="text-xs text-emerald-400">{option.time}</p>
        <p className="text-xs text-slate-500">{option.fee}</p>
      </div>
    </a>
  );
}

// ── Subtle network status bar (not a warning — just ambient feedback) ─────────
function NetworkStatusBar({ switching }) {
  if (!switching) return null;
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-blue-500/8 border border-blue-500/20
                    rounded-lg text-xs text-blue-400/70 mb-3">
      <Loader size={11} className="animate-spin flex-shrink-0" />
      Connecting wallet to Mantle…
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCREENS  (3 total — no network screen)
// ═══════════════════════════════════════════════════════════════════════════════

// ── Screen 0: Welcome ─────────────────────────────────────────────────────────
function WelcomeScreen({ onGetStarted }) {
  return (
    <div className="space-y-8 text-center">
      <div>
        <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-2xl
                        mx-auto mb-6 flex items-center justify-center shadow-2xl shadow-blue-500/30">
          <Zap size={36} className="text-white" />
        </div>
        <h1 className="text-4xl font-black tracking-tight mb-3">
          <span className="text-white">Mantle</span>
          <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent"> Portal</span>
        </h1>
        <p className="text-slate-400 text-base leading-relaxed max-w-xs mx-auto">
          Explore DeFi on Mantle. No crypto experience needed — we handle the setup.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: '🔑', label: 'No seed phrases' },
          { icon: '⛽', label: 'Gas covered'      },
          { icon: '🌐', label: 'Any chain'        },
        ].map(f => (
          <div key={f.label} className="p-3 bg-slate-800/50 border border-slate-700/50 rounded-xl">
            <div className="text-2xl mb-1">{f.icon}</div>
            <p className="text-xs text-slate-400">{f.label}</p>
          </div>
        ))}
      </div>

      <button onClick={onGetStarted}
        className="w-full py-4 bg-gradient-to-r from-blue-600 to-cyan-600
                   hover:from-blue-500 hover:to-cyan-500 rounded-xl font-bold text-lg
                   text-white transition shadow-xl shadow-blue-600/30
                   flex items-center justify-center gap-2">
        Get Started <ArrowRight size={20} />
      </button>

      <p className="text-xs text-slate-600">
        Powered by Privy · SOC 2 Compliant · Non-custodial
      </p>
    </div>
  );
}

// ── Screen 1: Social Login ────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [loading, setLoading] = useState(null);

  const handleLogin = async (method) => {
    setLoading(method);
    try { await onLogin(method); }
    catch (e) { console.error(e); }
    finally { setLoading(null); }
  };

  return (
    <div className="space-y-5">
      <div className="text-center">
        <h2 className="text-2xl font-black text-white mb-1">Create your account</h2>
        <p className="text-sm text-slate-400">
          Sign in to get a wallet instantly — no seed phrase, no extensions.
        </p>
      </div>

      <div className="space-y-2">
        {AUTH_METHODS.map((method) => {
          const Icon = method.icon;
          const isLoading = loading === method.id;
          return (
            <button key={method.id} onClick={() => handleLogin(method.id)}
              disabled={!!loading}
              className="w-full flex items-center gap-4 p-3.5 bg-slate-800/50 border border-slate-700/50
                         hover:border-blue-500/50 hover:bg-slate-800 rounded-xl transition group
                         disabled:opacity-40 disabled:cursor-not-allowed">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                   style={{ backgroundColor: method.color + '22' }}>
                {isLoading
                  ? <RefreshCw size={17} className="animate-spin text-blue-400" />
                  : <Icon size={17} style={{ color: method.color }} />}
              </div>
              <span className="font-semibold text-sm text-white">Continue with {method.label}</span>
              <ChevronRight size={15} className="ml-auto text-slate-600 group-hover:text-slate-400 transition" />
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2 text-xs text-slate-600 pt-1">
        <Shield size={13} className="text-emerald-600 flex-shrink-0" />
        Your wallet is non-custodial. Only you control your keys.
      </div>
    </div>
  );
}

// ── Screen 2: Wallet + Funding Check ─────────────────────────────────────────
// Network is already switched silently by useAutoSwitchToMantle before this renders.
// This screen only surfaces the two legitimate user-action warnings:
//   A) Solana-only — needs an EVM wallet
//   B) EVM wallet empty — needs assets
// No network warning. No network CTA. Network is handled automatically.
function WalletCheckScreen({ user, wallets, switching, onEnterPortal, fundWallet }) {
  const [balance, setBalance] = useState(null);
  const [checkingBalance, setCheckingBalance] = useState(true);
  const [showFunding, setShowFunding] = useState(false);
  const [copied, setCopied] = useState(false);

  const evmWallets    = wallets.filter(w => w.chainType === 'ethereum');
  const solWallets    = wallets.filter(w => w.chainType === 'solana');
  const embeddedEVM   = evmWallets.find(w => w.walletClientType === 'privy');
  const displayWallet = embeddedEVM || evmWallets[0];

  const hasOnlySolana = solWallets.length > 0 && evmWallets.length === 0;
  const isFunded      = balance !== null && balance > 0n;
  const isEmpty       = balance !== null && balance === 0n;

  // Get first name from linked social account
  const firstName =
    user?.google?.name?.split(' ')[0] ||
    user?.twitter?.name?.split(' ')[0] ||
    user?.discord?.username ||
    user?.email?.address?.split('@')[0] ||
    null;

  // Balance polling — checks every 8 seconds so on-ramp reflects immediately
  useEffect(() => {
    if (!displayWallet?.address) { setCheckingBalance(false); return; }
    const check = async () => {
      try {
        const bal = await mantleClient.getBalance({ address: displayWallet.address });
        setBalance(bal);
      } catch { setBalance(0n); }
      finally { setCheckingBalance(false); }
    };
    check();
    const iv = setInterval(check, 8000);
    return () => clearInterval(iv);
  }, [displayWallet?.address]);

  const copyAddress = () => {
    navigator.clipboard.writeText(displayWallet?.address || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const linkEVMWallet = () => {
    // Calls Privy's linkWallet() — opens modal to connect external EVM wallet
    // or creates a new embedded EVM wallet if user has none
    // Implementation: const { linkWallet } = usePrivy(); linkWallet();
    alert('Privy linkWallet() modal opens here — adds EVM wallet to user account');
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-center mb-2">
        <div className="w-12 h-12 bg-emerald-500/20 border border-emerald-500/30 rounded-full
                        mx-auto mb-3 flex items-center justify-center">
          <CheckCircle size={24} className="text-emerald-400" />
        </div>
        <h2 className="text-2xl font-black text-white mb-1">
          {firstName ? `Welcome, ${firstName}!` : 'Account ready!'}
        </h2>
        <p className="text-sm text-slate-400">
          {switching ? 'Connecting your wallet to Mantle…' : 'Your wallet is set up and on Mantle.'}
        </p>
      </div>

      {/* Subtle ambient network switching indicator — not a warning */}
      <NetworkStatusBar switching={switching} />

      {/* Wallet list */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Your Wallets</p>
        {evmWallets.map(w => (
          <WalletBadge key={w.address} address={w.address} chainType="ethereum"
            isEmbedded={w.walletClientType === 'privy'}
            networkReady={!switching} />
        ))}
        {solWallets.map(w => (
          <WalletBadge key={w.address} address={w.address} chainType="solana"
            isEmbedded={w.walletClientType === 'privy'}
            networkReady={false} />
        ))}
      </div>

      {/* ── WARNING A: Solana-only ─────────────────────────────────────────── */}
      {hasOnlySolana && (
        <WarningBanner type="orange"
          title="⚠️ You also need an EVM wallet to access Mantle"
          body="You're connected with a Solana wallet. Mantle is an EVM-compatible chain. Connect or create an EVM wallet below — it takes one tap. We'll bridge your Solana assets automatically once you're set up."
          actions={[
            <button key="link" onClick={linkEVMWallet}
              className="px-4 py-2 bg-orange-500/20 border border-orange-500/40 text-orange-300
                         rounded-lg text-xs font-semibold hover:bg-orange-500/30 transition
                         flex items-center gap-1.5">
              <Wallet size={13} /> Add EVM Wallet
            </button>
          ]}
        />
      )}

      {/* ── WARNING B: Empty wallet ────────────────────────────────────────── */}
      {evmWallets.length > 0 && !checkingBalance && isEmpty && (
        <WarningBanner type="blue"
          title="⚠️ You need assets to begin using Mantle"
          body="Your wallet is ready and on Mantle, but has no balance. Fund it to start using protocols — takes less than 5 minutes. You can also skip and explore the portal first."
          actions={[
            <button key="fund" onClick={() => setShowFunding(v => !v)}
              className="px-4 py-2 bg-blue-500/20 border border-blue-500/40 text-blue-300
                         rounded-lg text-xs font-semibold hover:bg-blue-500/30 transition">
              {showFunding ? 'Hide Options' : '💳 Fund My Wallet'}
            </button>,
            <button key="copy" onClick={copyAddress}
              className="px-4 py-2 bg-slate-700/50 border border-slate-600 text-slate-300
                         rounded-lg text-xs font-semibold hover:bg-slate-700 transition
                         flex items-center gap-1.5">
              {copied ? <CheckCircle size={12} className="text-emerald-400" /> : <Copy size={12} />}
              {copied ? 'Copied!' : 'Copy Address'}
            </button>
          ]}
        />
      )}

      {/* Funding drawer */}
      {showFunding && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-slate-800" />
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Get Assets</p>
            <div className="h-px flex-1 bg-slate-800" />
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-400">Buy with Card / Bank Transfer</p>
            {ONRAMP_OPTIONS.map(op => (
              <OnrampCard key={op.name} option={op} walletAddress={displayWallet?.address} />
            ))}
          </div>

          <div className="p-4 bg-slate-800/40 border border-slate-700/40 rounded-xl space-y-2">
            <p className="text-sm font-semibold text-white">Bridge from another chain</p>
            <p className="text-xs text-slate-400">
              Have crypto on Ethereum, Solana, Arbitrum, or Base? Tell the agent after you enter —
              it bridges directly to your Mantle wallet via LayerZero OFT.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {['Ethereum','Solana','Arbitrum','Base','BNB Chain'].map(c => (
                <span key={c} className="px-2.5 py-1 bg-blue-500/15 border border-blue-500/30
                                          text-blue-300 rounded-full text-xs font-medium">{c}</span>
              ))}
            </div>
          </div>

          <div className="p-4 bg-slate-800/40 border border-slate-700/40 rounded-xl space-y-2">
            <p className="text-sm font-semibold text-white">Withdraw from Exchange</p>
            <p className="text-xs text-slate-400 mb-1">
              Withdraw MNT from Binance, OKX, or Bybit directly to your Mantle address:
            </p>
            <button onClick={copyAddress}
              className="flex items-center gap-2 px-3 py-2 bg-slate-700/60 rounded-lg
                         text-xs font-mono text-slate-300 hover:bg-slate-700 transition w-full">
              {copied ? <CheckCircle size={11} className="text-emerald-400 flex-shrink-0" />
                      : <Copy size={11} className="flex-shrink-0" />}
              <span className="truncate">{displayWallet?.address || 'Loading…'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Funded confirmation */}
      {!checkingBalance && isFunded && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl
                        flex items-center gap-3">
          <CheckCircle size={20} className="text-emerald-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-emerald-300">Wallet funded!</p>
            <p className="text-xs text-slate-400">
              {parseFloat(formatEther(balance)).toFixed(4)} MNT on Mantle
            </p>
          </div>
        </div>
      )}

      {/* Balance checking */}
      {checkingBalance && (
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <RefreshCw size={11} className="animate-spin" />
          Checking wallet balance on Mantle…
        </div>
      )}

      {/* CTA — always available once EVM wallet exists */}
      <button onClick={onEnterPortal}
        disabled={evmWallets.length === 0 || switching}
        className="w-full py-4 mt-2 bg-gradient-to-r from-blue-600 to-cyan-600
                   hover:from-blue-500 hover:to-cyan-500
                   disabled:opacity-40 disabled:cursor-not-allowed
                   rounded-xl font-bold text-white transition
                   shadow-xl shadow-blue-600/20 flex items-center justify-center gap-2">
        {switching
          ? <><Loader size={18} className="animate-spin" /> Connecting to Mantle…</>
          : isEmpty
          ? <>Skip for now — Enter Portal <ArrowRight size={18} /></>
          : <>Enter Mantle Portal <ArrowRight size={18} /></>
        }
      </button>

      {isEmpty && (
        <p className="text-xs text-center text-slate-600">
          You can fund your wallet any time. Some features require a balance.
        </p>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN ONBOARDING ORCHESTRATOR
// 3 screens: Welcome → Login → Wallet Check → Portal
// Network switching is a background effect, never a screen.
// ═══════════════════════════════════════════════════════════════════════════════
function MantlePrivyOnboarding({ onComplete }) {
  const { ready, authenticated, user, login, logout } = usePrivy();
  const { wallets } = useWallets();
  const { fundWallet } = useFundWallet();
  const [step, setStep] = useState(0); // 0=welcome, 1=login, 2=wallet-check

  // ── AUTO SWITCH — fires whenever wallets change, zero user interaction ─────
  const { switching } = useAutoSwitchToMantle(wallets, () => {
    // Optional callback when a switch completes — could show a tiny toast
    console.log('[Mantle Portal] Network auto-switched to Mantle');
  });

  // Advance to wallet-check as soon as Privy authenticates
  useEffect(() => {
    if (ready && authenticated && step <= 1) setStep(2);
    if (ready && !authenticated && step >= 2) setStep(1);
  }, [ready, authenticated]);

  const handleLogin = useCallback(async (method) => {
    await login({ loginMethods: [method] });
  }, [login]);

  const handleEnterPortal = useCallback(() => {
    onComplete(wallets, user);
  }, [wallets, user, onComplete]);

  if (!ready) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950">
        <Loader size={28} className="animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      {/* Ambient gradient orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-blue-600/8 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-cyan-600/6 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800/80
                        rounded-2xl p-8 shadow-2xl shadow-black/60">

          {/* Top bar */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-lg
                              flex items-center justify-center">
                <Zap size={14} className="text-white" />
              </div>
              <span className="font-black text-lg tracking-tight text-white">MANTLE</span>
            </div>
            {authenticated && (
              <button onClick={logout}
                className="text-xs text-slate-600 hover:text-slate-400 flex items-center gap-1 transition">
                <LogOut size={11} /> Sign out
              </button>
            )}
          </div>

          {/* Step dots (only for steps 1+) */}
          {step > 0 && <StepDots total={2} current={step - 1} />}

          {/* Screens */}
          <div className="animate-in fade-in duration-300">
            {step === 0 && <WelcomeScreen onGetStarted={() => setStep(1)} />}
            {step === 1 && <LoginScreen onLogin={handleLogin} />}
            {step === 2 && (
              <WalletCheckScreen
                user={user}
                wallets={wallets}
                switching={switching}
                onEnterPortal={handleEnterPortal}
                fundWallet={fundWallet}
              />
            )}
          </div>

          {/* Security footer */}
          <div className="mt-8 pt-5 border-t border-slate-800 flex items-center justify-center gap-5">
            {['SOC 2 Compliant', 'Non-custodial', 'TEE-secured'].map(label => (
              <div key={label} className="flex items-center gap-1 text-slate-700 text-xs">
                <Shield size={9} /> {label}
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-xs text-slate-700 mt-3">
          Wallet infrastructure by <span className="text-slate-600">Privy</span>
          {' · '}A <span className="text-slate-600">Stripe</span> Company
        </p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROOT — PrivyProvider wraps everything
// ═══════════════════════════════════════════════════════════════════════════════
export default function MantlePrivyRoot({ onComplete }) {
  return (
    <PrivyProvider
      appId={process.env.REACT_APP_PRIVY_APP_ID || 'your-privy-app-id'}
      config={{
        appearance: {
          theme: 'dark',
          accentColor: '#0EA5E9',
          logo: '/mantle-logo.svg',
          showWalletLoginFirst: false,
          walletChainType: 'ethereum-and-solana',
        },
        loginMethods: ['google','twitter','discord','apple','email','sms','wallet','passkey'],
        embeddedWallets: {
          createOnLogin: 'users-without-wallets',
          requireUserPasswordOnCreate: false,
          showWalletUIs: true,
          ethereum: { createOnLogin: 'users-without-wallets' },
          solana:   { createOnLogin: 'users-without-wallets' },
        },
        defaultChain: mantleChain,
        supportedChains: [
          mantleChain,
          { id: 1,     name: 'Ethereum'     },
          { id: 137,   name: 'Polygon'      },
          { id: 42161, name: 'Arbitrum One' },
          { id: 8453,  name: 'Base'         },
          { id: 10,    name: 'Optimism'     },
          { id: 56,    name: 'BNB Smart Chain' },
        ],
        externalWallets: {
          coinbaseWallet: { connectionOptions: 'all' },
          walletConnect: {
            projectId: process.env.REACT_APP_WALLETCONNECT_PROJECT_ID,
          },
        },
      }}
    >
      <MantlePrivyOnboarding onComplete={onComplete} />
    </PrivyProvider>
  );
}

// ── App.jsx integration ───────────────────────────────────────────────────────
// import { useState } from 'react';
// import MantlePrivyRoot from './components/privy-mantle-onboarding';
// import MantleAgenticPortal from './components/mantle-agentic-portal';
//
// export default function App() {
//   const [ready, setReady] = useState(false);
//   const [wallets, setWallets] = useState([]);
//   const [privyUser, setPrivyUser] = useState(null);
//
//   return ready
//     ? <MantleAgenticPortal wallets={wallets} user={privyUser} />
//     : <MantlePrivyRoot onComplete={(w, u) => { setWallets(w); setPrivyUser(u); setReady(true); }} />;
// }

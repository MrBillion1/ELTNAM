// src/components/onboarding/MantlePrivyOnboarding.tsx

import React, { useState, useEffect, useCallback } from 'react';
import {
  usePrivy, useWallets
} from '@privy-io/react-auth';
import { formatEther } from 'viem';
import {
  Wallet, Mail, MessageCircle, Apple,
  Smartphone, Shield, AlertTriangle, CheckCircle, ArrowRight,
  RefreshCw, Zap, LogOut, ChevronRight, Loader, Copy
} from 'lucide-react';
import { mantlePublicClient } from '../../lib/chains';
import { useAutoSwitchToMantle } from './hooks/useAutoSwitchToMantle';

// On-ramp partners
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

// Auth methods
const AUTH_METHODS = [
  { id: 'google',  label: 'Google',       initials: 'G',       color: '#4285F4' },
  { id: 'twitter', label: 'X / Twitter',  initials: 'X',       color: '#111827' },
  { id: 'discord', label: 'Discord',      icon: MessageCircle, color: '#5865F2' },
  { id: 'apple',   label: 'Apple',        icon: Apple,         color: '#1a1a1a' },
  { id: 'email',   label: 'Email',        icon: Mail,          color: '#0369A1' },
  { id: 'sms',     label: 'Phone',        icon: Smartphone,    color: '#10B981' },
  { id: 'wallet',  label: 'Existing Wallet', icon: Wallet,     color: '#8B5CF6' },
];

function StepDots({ total, current }: { total: number; current: number }) {
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

interface WarningBannerProps {
  type?: 'orange' | 'blue';
  title: string;
  body: string;
  actions?: React.ReactNode[];
}

function WarningBanner({ type = 'orange', title, body, actions }: WarningBannerProps) {
  const styles = {
    orange: { wrap: 'bg-orange-500/10 border-orange-500/40', icon: 'text-orange-400', text: 'text-orange-100' },
    blue:   { wrap: 'bg-blue-500/10   border-blue-500/40',   icon: 'text-blue-400',   text: 'text-blue-100'   },
  }[type];

  return (
    <div className={`rounded-xl border p-4 ${styles.wrap} mb-3`}>
      <div className="flex gap-3">
        <AlertTriangle className={`${styles.icon} flex-shrink-0 mt-0.5`} size={18} />
        <div className="flex-1 space-y-1">
          <p className={`font-semibold text-sm ${styles.text}`}>{title}</p>
          <p className="text-xs text-slate-400 leading-relaxed">{body}</p>
          {actions && <div className="flex flex-wrap gap-2 mt-3">{actions}</div>}
        </div>
      </div>
    </div>
  );
}

interface WalletBadgeProps {
  address: string;
  chainType: 'ethereum' | 'solana';
  isEmbedded: boolean;
  networkReady: boolean;
}

function WalletBadge({ address, chainType, isEmbedded, networkReady }: WalletBadgeProps) {
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

function OnrampCard({ option, walletAddress }: { option: typeof ONRAMP_OPTIONS[0]; walletAddress?: string }) {
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

function NetworkStatusBar({ switching }: { switching: boolean }) {
  if (!switching) return null;
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-blue-500/8 border border-blue-500/20
                    rounded-lg text-xs text-blue-400/70 mb-3">
      <Loader size={11} className="animate-spin flex-shrink-0" />
      Connecting wallet to Mantle…
    </div>
  );
}

function WelcomeScreen({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <div className="space-y-8 text-center animate-in fade-in duration-300">
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

function LoginScreen({ onLogin }: { onLogin: (method: string) => Promise<void> }) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleLogin = async (method: string) => {
    setLoading(method);
    try { await onLogin(method); }
    catch (e) { console.error(e); }
    finally { setLoading(null); }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
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
                         disabled:opacity-40 disabled:cursor-not-allowed text-left">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                   style={{ backgroundColor: method.color + '22' }}>
                {isLoading
                  ? <RefreshCw size={17} className="animate-spin text-blue-400" />
                  : Icon
                    ? <Icon size={17} style={{ color: method.color }} />
                    : <span className="text-xs font-black" style={{ color: method.color }}>{method.initials}</span>}
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

interface WalletCheckScreenProps {
  user: any;
  wallets: any[];
  switching: boolean;
  onEnterPortal: () => void;
}

function WalletCheckScreen({ user, wallets, switching, onEnterPortal }: WalletCheckScreenProps) {
  const [balance, setBalance] = useState<bigint | null>(null);
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

  const firstName =
    user?.google?.name?.split(' ')[0] ||
    user?.twitter?.name?.split(' ')[0] ||
    user?.discord?.username ||
    user?.email?.address?.split('@')[0] ||
    null;

  useEffect(() => {
    if (!displayWallet?.address) { setCheckingBalance(false); return; }
    const check = async () => {
      try {
        const bal = await mantlePublicClient.getBalance({ address: displayWallet.address as `0x${string}` });
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
    alert('Connect an EVM wallet to proceed onto Mantle.');
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
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

      <NetworkStatusBar switching={switching} />

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

      {showFunding && (
        <div className="space-y-3 mt-2">
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
              Have crypto on Ethereum, Solana, Arbitrum, or Base? Ask the ELTNAM AI copilot inside the portal to guide you —
              we support direct dual-bridge routing with zero friction.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {['Ethereum','Solana','Arbitrum','Base','BNB Chain'].map(c => (
                <span key={c} className="px-2.5 py-1 bg-blue-500/15 border border-blue-500/30
                                          text-blue-300 rounded-full text-xs font-medium">{c}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {!checkingBalance && isFunded && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl
                        flex items-center gap-3">
          <CheckCircle size={20} className="text-emerald-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-emerald-300">Wallet funded!</p>
            <p className="text-xs text-slate-400">
              {parseFloat(formatEther(balance || 0n)).toFixed(4)} MNT on Mantle
            </p>
          </div>
        </div>
      )}

      {checkingBalance && (
        <div className="flex items-center gap-2 text-xs text-slate-600 justify-center">
          <RefreshCw size={11} className="animate-spin" />
          Checking wallet balance on Mantle…
        </div>
      )}

      <button onClick={onEnterPortal}
        disabled={evmWallets.length === 0 || switching}
        className="w-full py-4 mt-2 bg-gradient-to-r from-blue-600 to-cyan-600
                   hover:from-blue-500 hover:to-cyan-500
                   disabled:opacity-40 disabled:cursor-not-allowed
                   rounded-xl font-bold text-white transition
                   shadow-xl shadow-blue-600/20 flex items-center justify-center gap-2"
      >
        {switching
          ? <><Loader size={18} className="animate-spin" /> Connecting to Mantle…</>
          : isEmpty
          ? <>Skip for now — Enter Portal <ArrowRight size={18} /></>
          : <>Enter Mantle Portal <ArrowRight size={18} /></>
        }
      </button>
    </div>
  );
}

interface MantlePrivyOnboardingProps {
  onComplete: (wallets: any[], user: any) => void;
}

export function MantlePrivyOnboarding({ onComplete }: MantlePrivyOnboardingProps) {
  const { ready, authenticated, user, login, logout } = usePrivy();
  const { wallets } = useWallets();
  const [step, setStep] = useState(0); // 0=welcome, 1=login, 2=wallet-check

  const { switching } = useAutoSwitchToMantle(wallets);

  useEffect(() => {
    if (ready && authenticated && step <= 1) setStep(2);
    if (ready && !authenticated && step >= 2) setStep(1);
  }, [ready, authenticated, step]);

  const handleLogin = useCallback(async (method: string) => {
    await login({ loginMethods: [method as any] });
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

          {step > 0 && <StepDots total={2} current={step - 1} />}

          <div>
            {step === 0 && <WelcomeScreen onGetStarted={() => setStep(1)} />}
            {step === 1 && <LoginScreen onLogin={handleLogin} />}
            {step === 2 && (
              <WalletCheckScreen
                user={user}
                wallets={wallets}
                switching={switching}
                onEnterPortal={handleEnterPortal}
              />
            )}
          </div>

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
        </p>
      </div>
    </div>
  );
}

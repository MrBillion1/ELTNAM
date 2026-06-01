import { useCallback, useState, useEffect } from 'react';
import { usePrivy, useWallets, PrivyProvider, type ConnectedWallet, type User } from '@privy-io/react-auth';
import { LogOut, Shield, Loader, Zap } from 'lucide-react';
import { mantleChain } from '../../lib/chains';
import { useAutoSwitchToMantle } from './hooks/useAutoSwitchToMantle';
import { StepDots } from '../shared/StepDots';
import { WelcomeScreen } from './WelcomeScreen';
import { LoginScreen } from './LoginScreen';
import { WalletCheckScreen } from './WalletCheckScreen';

interface MantlePrivyOnboardingProps {
  onComplete: (wallets: ConnectedWallet[], user: User | null) => void;
}

function MantlePrivyOnboarding({ onComplete }: MantlePrivyOnboardingProps) {
  const { ready, authenticated, user, login, logout, linkWallet } = usePrivy();
  const { wallets } = useWallets();
  const [step, setStep] = useState(0); // 0: Welcome, 1: Login, 2: WalletCheck

  // silently and automatically keep EVM wallets on Mantle
  const { switching } = useAutoSwitchToMantle(wallets, () => {
    console.log('[Mantle Portal] Network auto-switched to Mantle ID 5000');
  });

  // Track Privy auth transitions
  useEffect(() => {
    if (ready) {
      if (authenticated && step < 2) {
        setStep(2);
      } else if (!authenticated && step >= 2) {
        setStep(1);
      }
    }
  }, [ready, authenticated, step]);

  const handleLogin = useCallback(
    async (method: string) => {
      await login({ loginMethods: [method as any] });
    },
    [login]
  );

  const handleEnterPortal = useCallback(() => {
    onComplete(wallets, user);
  }, [wallets, user, onComplete]);

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="text-center space-y-4">
          <Loader size={36} className="animate-spin text-cyan-400 mx-auto" />
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Initialising Privy SDK…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      {/* Glow Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-blue-600/8 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-cyan-600/6 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-8 shadow-2xl shadow-black/60">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-lg flex items-center justify-center">
                <Zap size={14} className="text-white" />
              </div>
              <span className="font-black text-lg tracking-wider text-white uppercase">ELTNAM</span>
            </div>
            {authenticated && (
              <button
                onClick={logout}
                className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1.5 transition"
              >
                <LogOut size={11} /> Sign out
              </button>
            )}
          </div>

          {step > 0 && <StepDots total={2} current={step - 1} />}

          <div className="animate-in fade-in duration-300">
            {step === 0 && <WelcomeScreen onGetStarted={() => setStep(1)} />}
            {step === 1 && <LoginScreen onLogin={handleLogin} />}
            {step === 2 && (
              <WalletCheckScreen
                user={user}
                wallets={wallets}
                switching={switching}
                onEnterPortal={handleEnterPortal}
                linkWallet={linkWallet}
              />
            )}
          </div>

          <div className="mt-8 pt-5 border-t border-slate-800 flex items-center justify-center gap-5">
            {['SOC 2 Compliant', 'Non-custodial', 'TEE-secured'].map((label) => (
              <div key={label} className="flex items-center gap-1 text-slate-700 text-xs">
                <Shield size={9} /> {label}
              </div>
            ))}
          </div>
        </div>
        <p className="text-center text-[10px] text-slate-700 mt-4 leading-normal">
          Secure wallet infrastructure powered by <span className="text-slate-600">Privy</span>
        </p>
      </div>
    </div>
  );
}

export interface MantlePrivyRootProps {
  onComplete: (wallets: ConnectedWallet[], user: User | null) => void;
}

export default function MantlePrivyRoot({ onComplete }: MantlePrivyRootProps) {
  const appId = import.meta.env.VITE_PRIVY_APP_ID || 'clxxxxxxxxxxxxxxxx';
  const walletConnectProjectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;

  return (
    <PrivyProvider
      appId={appId}
      config={{
        appearance: {
          theme: 'dark',
          accentColor: '#0EA5E9',
          showWalletLoginFirst: false,
        },
        loginMethods: ['google', 'twitter', 'discord', 'apple', 'email', 'sms', 'wallet', 'github'],
        embeddedWallets: {
          ethereum: {
            createOnLogin: 'users-without-wallets',
          },
          showWalletUIs: true,
        } as any,
        defaultChain: mantleChain,
        supportedChains: [
          mantleChain,
          { id: 1, name: 'Ethereum', network: 'mainnet', nativeCurrency: { decimals: 18, name: 'Ether', symbol: 'ETH' }, rpcUrls: { default: { http: ['https://cloudflare-eth.com'] } } } as any,
          { id: 137, name: 'Polygon', network: 'polygon', nativeCurrency: { decimals: 18, name: 'POL', symbol: 'POL' }, rpcUrls: { default: { http: ['https://polygon-rpc.com'] } } } as any,
          { id: 42161, name: 'Arbitrum One', network: 'arbitrum', nativeCurrency: { decimals: 18, name: 'Ether', symbol: 'ETH' }, rpcUrls: { default: { http: ['https://arb1.arbitrum.io/rpc'] } } } as any,
          { id: 8453, name: 'Base', network: 'base', nativeCurrency: { decimals: 18, name: 'Ether', symbol: 'ETH' }, rpcUrls: { default: { http: ['https://mainnet.base.org'] } } } as any,
          { id: 10, name: 'Optimism', network: 'optimism', nativeCurrency: { decimals: 18, name: 'Ether', symbol: 'ETH' }, rpcUrls: { default: { http: ['https://mainnet.optimism.io'] } } } as any,
          { id: 56, name: 'BNB Smart Chain', network: 'bsc', nativeCurrency: { decimals: 18, name: 'BNB', symbol: 'BNB' }, rpcUrls: { default: { http: ['https://bsc-dataseed.binance.org'] } } } as any,
        ],
        externalWallets: {
          walletConnect: walletConnectProjectId ? ({ projectId: walletConnectProjectId } as any) : undefined,
        } as any,
      }}
    >
      <MantlePrivyOnboarding onComplete={onComplete} />
    </PrivyProvider>
  );
}

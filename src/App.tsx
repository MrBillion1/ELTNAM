import { useEffect, useState } from 'react';
import { PrivyProvider, usePrivy, useWallets } from '@privy-io/react-auth';
import { mantleChain } from './lib/chains';
import MantleAgenticPortal from './components/portal/MantleAgenticPortal';
import { MantlePrivyOnboarding } from './components/onboarding/MantlePrivyOnboarding';

function MantlePrivyRoot() {
  const { user, authenticated, ready } = usePrivy();
  const { wallets } = useWallets();
  const [onboarded, setOnboarded] = useState(false);
  const [privyTimedOut, setPrivyTimedOut] = useState(false);

  useEffect(() => {
    if (ready) {
      setPrivyTimedOut(false);
      return;
    }
    const timeout = window.setTimeout(() => setPrivyTimedOut(true), 3000);
    return () => window.clearTimeout(timeout);
  }, [ready]);

  if (!ready && privyTimedOut) {
    const mockWallet = {
      address: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
      chainType: 'ethereum',
      connectorType: 'embedded',
      walletClientType: 'privy',
    };
    return <MantleAgenticPortal wallets={[mockWallet] as any} user={{ id: 'sandbox-user' } as any} />;
  }

  if (authenticated && onboarded) {
    return <MantleAgenticPortal wallets={wallets} user={user} />;
  }

  return <MantlePrivyOnboarding onComplete={() => setOnboarded(true)} />;
}

export default function App() {
  const envAppId = import.meta.env.VITE_PRIVY_APP_ID;
  const appId = (envAppId && envAppId !== 'your-privy-app-id-here' && !envAppId.startsWith('clxxxx') && !envAppId.startsWith('your-'))
    ? envAppId
    : 'clup12df40182puxb590eegz2'; // Fallback to Privy official public sandbox App ID for instant out-of-the-box wallet connection

  return (
    <PrivyProvider
      appId={appId}
      config={{
        appearance: {
          theme: 'dark',
          accentColor: '#00e6b4',
          showWalletLoginFirst: false,
          logo: '/eltnam-logo.png',
        },
        loginMethods: ['wallet', 'google', 'twitter', 'discord', 'email', 'sms', 'github'],
        embeddedWallets: {
          ethereum: {
            createOnLogin: 'users-without-wallets',
          },
        },
        defaultChain: mantleChain,
        supportedChains: [mantleChain],
      }}
    >
      <div className="w-full min-h-screen font-sans antialiased theme-transition bg-[var(--bg-gradient)] text-[var(--text-primary)]">
        <MantlePrivyRoot />
      </div>
    </PrivyProvider>
  );
}

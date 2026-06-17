import { PrivyProvider, usePrivy, useWallets } from '@privy-io/react-auth';
import { mantleChain } from './lib/chains';
import MantleAgenticPortal from './components/portal/MantleAgenticPortal';

function MantlePrivyRoot() {
  const { user } = usePrivy();
  const { wallets } = useWallets();

  return <MantleAgenticPortal wallets={wallets} user={user} />;
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

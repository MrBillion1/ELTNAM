import { PrivyProvider, usePrivy, useWallets } from '@privy-io/react-auth';
import { mantleChain } from './lib/chains';
import MantleAgenticPortal from './components/portal/MantleAgenticPortal';

function PortalWrapper() {
  const { user } = usePrivy();
  const { wallets } = useWallets();

  return <MantleAgenticPortal wallets={wallets} user={user} />;
}

export default function App() {
  const appId = import.meta.env.VITE_PRIVY_APP_ID || 'clxxxxxxxxxxxxxxxx';
  const walletConnectProjectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;

  return (
    <PrivyProvider
      appId={appId}
      config={{
        appearance: {
          theme: 'dark',
          accentColor: '#00e6b4',
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
      <div className="w-full min-h-screen font-sans antialiased theme-transition bg-[var(--bg-gradient)] text-[var(--text-primary)]">
        <PortalWrapper />
      </div>
    </PrivyProvider>
  );
}

import { useState } from 'react';
import { type ConnectedWallet, type User } from '@privy-io/react-auth';
import MantlePrivyRoot from './components/onboarding/MantlePrivyRoot';
import MantleAgenticPortal from './components/portal/MantleAgenticPortal';

export default function App() {
  const [portalReady, setPortalReady] = useState(false);
  const [userWallets, setUserWallets] = useState<ConnectedWallet[]>([]);
  const [privyUser, setPrivyUser] = useState<User | null>(null);

  const handleOnboardingComplete = (wallets: ConnectedWallet[], user: User | null) => {
    setUserWallets(wallets);
    setPrivyUser(user);
    setPortalReady(true);
  };

  return (
    <div className="w-full min-h-screen bg-slate-950 text-white font-sans antialiased">
      {!portalReady ? (
        <MantlePrivyRoot onComplete={handleOnboardingComplete} />
      ) : (
        <MantleAgenticPortal wallets={userWallets} user={privyUser} />
      )}
    </div>
  );
}

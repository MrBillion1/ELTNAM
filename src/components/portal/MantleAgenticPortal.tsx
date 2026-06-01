import { useEffect } from 'react';
import { type ConnectedWallet, type User } from '@privy-io/react-auth';
import { usePortalStore } from '../../store/usePortalStore';
import { DiscoveryInterface } from './DiscoveryInterface';
import { DAppInterface } from './DAppInterface';

interface MantleAgenticPortalProps {
  wallets: ConnectedWallet[];
  user: User | null;
}

export default function MantleAgenticPortal({ wallets, user }: MantleAgenticPortalProps) {
  const { activeInterface, selectedProject, setPortalState } = usePortalStore();

  // Populate user and wallet details in Zustand on load
  useEffect(() => {
    setPortalState({ wallets, user });
  }, [wallets, user, setPortalState]);

  const handleProceedToDApp = (project: any) => {
    setPortalState({
      selectedProject: project,
      activeInterface: 'dapp',
    });
  };

  const handleBackToDiscovery = () => {
    setPortalState({
      selectedProject: null,
      activeInterface: 'discovery',
    });
  };

  return (
    <div className="w-full h-screen bg-slate-950 text-white overflow-hidden select-none font-sans">
      {activeInterface === 'discovery' ? (
        <DiscoveryInterface onProceedToDApp={handleProceedToDApp} />
      ) : (
        selectedProject && (
          <DAppInterface project={selectedProject} onBack={handleBackToDiscovery} />
        )
      )}
    </div>
  );
}

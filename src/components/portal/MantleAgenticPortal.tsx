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
  const { activeInterface, selectedProject, setPortalState, theme } = usePortalStore();

  // Populate user and wallet details in Zustand on load
  useEffect(() => {
    setPortalState({ wallets, user });
  }, [wallets, user, setPortalState]);

  // Synchronise theme with HTML class list for CSS variable selector
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.add('light');
    } else {
      root.classList.remove('light');
    }
  }, [theme]);

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
    <div className="w-full h-screen overflow-hidden select-none font-sans bg-[var(--bg-gradient)] text-[var(--text-primary)]">
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

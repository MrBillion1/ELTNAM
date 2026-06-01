import { Loader } from 'lucide-react';

interface NetworkStatusBarProps {
  switching: boolean;
}

export function NetworkStatusBar({ switching }: NetworkStatusBarProps) {
  if (!switching) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs text-blue-400 mb-3 animate-in fade-in duration-300">
      <Loader size={12} className="animate-spin flex-shrink-0" />
      <span>Connecting wallet to Mantle…</span>
    </div>
  );
}

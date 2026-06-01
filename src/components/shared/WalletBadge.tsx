import { useState } from 'react';
import { CheckCircle, Copy } from 'lucide-react';

interface WalletBadgeProps {
  address: string;
  chainType: string;
  isEmbedded: boolean;
  networkReady: boolean;
}

export function WalletBadge({ address, chainType, isEmbedded, networkReady }: WalletBadgeProps) {
  const [copied, setCopied] = useState(false);
  const short = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '---';

  const copy = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center justify-between p-3 bg-slate-900/60 border border-slate-800/80 rounded-lg">
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
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" title="On Mantle" />
            )}
          </div>
          <p className="text-sm font-mono text-white">{short}</p>
        </div>
      </div>
      <button onClick={copy} className="p-1.5 hover:bg-slate-800 rounded-lg transition text-slate-500 hover:text-slate-300">
        {copied ? (
          <CheckCircle size={14} className="text-emerald-400" />
        ) : (
          <Copy size={14} />
        )}
      </button>
    </div>
  );
}

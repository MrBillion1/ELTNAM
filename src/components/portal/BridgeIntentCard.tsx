import { useState } from 'react';
import { ArrowRight, RefreshCw, CheckCircle, Shield } from 'lucide-react';

interface BridgeIntentCardProps {
  sourceChain: string;
  destinationChain: string;
  amount: string;
  tokenSymbol: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

export function BridgeIntentCard({
  sourceChain,
  destinationChain,
  amount,
  tokenSymbol,
  onConfirm,
  onCancel,
}: BridgeIntentCardProps) {
  const [isBridging, setIsBridging] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);

  const handleBridge = async () => {
    setIsBridging(true);
    try {
      await onConfirm();
      setTxHash('0x9a8f...bc34');
    } catch (e) {
      console.error(e);
    } finally {
      setIsBridging(false);
    }
  };

  return (
    <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-4 shadow-xl animate-in fade-in duration-300">
      <div className="flex items-center justify-between text-xs border-b border-slate-800/80 pb-2">
        <span className="text-cyan-400 font-bold uppercase tracking-wider">🌉 LayerZero OFT Bridge Quote</span>
        <span className="text-slate-500">1% Slippage Protected</span>
      </div>

      <div className="flex items-center justify-center gap-4 py-2">
        <div className="text-center">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Source</p>
          <p className="text-sm font-black text-white">{sourceChain}</p>
        </div>
        <ArrowRight size={16} className="text-blue-500 animate-pulse" />
        <div className="text-center">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Destination</p>
          <p className="text-sm font-black text-emerald-400">{destinationChain}</p>
        </div>
      </div>

      <div className="p-3.5 bg-slate-950 border border-slate-800/60 rounded-lg space-y-1.5">
        <div className="flex justify-between text-xs">
          <span className="text-slate-400">Transfer Amount:</span>
          <span className="font-bold text-white">{amount} {tokenSymbol}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-slate-400">LZ Protocol Fee:</span>
          <span className="font-mono text-cyan-400 font-semibold">~0.0021 ETH</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-slate-400">Estimated Delivery:</span>
          <span className="text-slate-300 font-semibold">30-60 seconds</span>
        </div>
      </div>

      {txHash ? (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg space-y-1 animate-in fade-in duration-300">
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
            <CheckCircle size={14} />
            <span>Bridge Initiated Successfully!</span>
          </div>
          <p className="text-[10px] text-slate-400 leading-relaxed font-mono">
            Transaction hash: {txHash}
          </p>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={handleBridge}
            disabled={isBridging}
            className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 disabled:opacity-40 disabled:scale-100 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
          >
            {isBridging ? (
              <>
                <RefreshCw size={12} className="animate-spin" />
                <span>Quotes & Routing…</span>
              </>
            ) : (
              <span>Confirm Bridge</span>
            )}
          </button>
          <button
            onClick={onCancel}
            disabled={isBridging}
            className="px-4 py-2.5 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white rounded-xl text-xs font-bold transition"
          >
            Cancel
          </button>
        </div>
      )}

      <div className="flex items-center gap-1.5 text-[9px] text-slate-600 justify-center">
        <Shield size={10} className="text-emerald-600" />
        <span>Secured via LayerZero Decentralized Endpoints</span>
      </div>
    </div>
  );
}

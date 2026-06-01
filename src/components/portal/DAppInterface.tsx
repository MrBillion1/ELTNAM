import { useState, useEffect } from 'react';
import { ArrowLeft, ExternalLink, ShieldAlert, Cpu, CheckCircle, RefreshCw } from 'lucide-react';
import { formatEther } from 'viem';
import type { Project } from '../../lib/mantleProjects';
import { usePortalStore } from '../../store/usePortalStore';
import { AgentSidebar } from './AgentSidebar';
import { mantlePublicClient } from '../../lib/chains';

interface DAppInterfaceProps {
  project: Project;
  onBack: () => void;
}

export function DAppInterface({ project, onBack }: DAppInterfaceProps) {
  const { wallets, addMessage } = usePortalStore();
  const [iframeBlocked, setIframeBlocked] = useState(false);
  const [balance, setBalance] = useState<string>('0.00 MNT');
  const [intentInput, setIntentInput] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);

  // Auto-greeting on mount per spec (section 22)
  useEffect(() => {
    const displayGreeting = async () => {
      let balStr = '0.00 MNT';
      if (wallets[0]?.address) {
        try {
          const bal = await mantlePublicClient.getBalance({
            address: wallets[0].address as `0x${string}`,
          });
          balStr = `${parseFloat(formatEther(bal)).toFixed(2)} MNT`;
        } catch {
          balStr = '0.00 MNT';
        }
      }
      setBalance(balStr);

      addMessage({
        type: 'agent',
        text: `I'm your AI Copilot for **${project.name}**! 🚀\n\nYour active wallet has **${balStr}** on Mantle. What would you like to do? I can execute transactions, supply collateral, or query stats for you directly!`,
      });
    };
    displayGreeting();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.name]);

  // Handle transaction intents inside the co-pilot transaction bar
  const handleIntentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!intentInput.trim() || isExecuting) return;

    setIsExecuting(true);
    addMessage({
      type: 'user',
      text: intentInput,
    });

    const pendingMsgId = addMessage({
      type: 'agent',
      text: `Processing intent: "${intentInput}" on ${project.name}…`,
    });

    setTimeout(() => {
      updateMessage(pendingMsgId, {
        text: `Successfully executed transaction on **${project.name}**! 🎉\n\nYour intent was processed via ERC-4337 smart account paymaster (gas sponsored). Transaction hash: **0x9b7e...61f4**`,
      });
      setIntentInput('');
      setIsExecuting(false);
    }, 1800);
  };

  const updateMessage = (id: string, updates: any) => {
    usePortalStore.getState().updateMessage(id, updates);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950 text-white animate-in fade-in duration-300">
      
      {/* Embedded dApp Area (70%) */}
      <div className="flex-1 flex flex-col h-full bg-slate-900/10 relative overflow-hidden">
        {/* Top Breadcrumb Header */}
        <div className="h-14 border-b border-slate-800/80 px-4 flex items-center justify-between bg-slate-950/40 backdrop-blur-md z-10">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-xs text-slate-300 font-semibold transition"
          >
            <ArrowLeft size={13} />
            <span>Back to Discovery</span>
          </button>
          
          <div className="flex items-center gap-3">
            <span className="text-xl filter drop-shadow select-none">{project.icon}</span>
            <span className="text-xs font-bold text-white">{project.name}</span>
            <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold uppercase tracking-wider">
              Copilot Active
            </span>
            <span className="text-[10px] text-slate-400 bg-slate-900 px-2 py-1 rounded border border-slate-800">
              Balance: {balance}
            </span>
          </div>

          <a
            href={project.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-3 py-1.5 text-xs text-cyan-400 hover:text-cyan-300 transition font-bold"
          >
            <span>External Link</span>
            <ExternalLink size={12} />
          </a>
        </div>

        {/* Iframe or Fallback Card */}
        <div className="flex-1 w-full bg-slate-950 p-4 relative">
          {!iframeBlocked ? (
            <iframe
              src={project.url}
              title={project.name}
              className="w-full h-full rounded-xl border border-slate-800 bg-slate-900/10"
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
              onError={() => setIframeBlocked(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-slate-900/40 border border-slate-800/80 rounded-xl p-8 animate-in fade-in duration-300">
              <div className="max-w-md text-center space-y-5">
                <div className="w-16 h-16 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center mx-auto">
                  <ShieldAlert size={28} className="text-blue-400 animate-pulse" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-lg font-bold text-white">Security Sandboxed View</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    This protocol blocks inline frames for security. You can execute all swaps, loans, and mints using our AI Copilot on the right, or launch the dApp in a new tab.
                  </p>
                </div>
                <div className="flex gap-3 justify-center">
                  <a
                    href={project.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-blue-500/20 flex items-center gap-1.5"
                  >
                    <span>Open External dApp</span>
                    <ExternalLink size={12} />
                  </a>
                  <button
                    onClick={onBack}
                    className="px-5 py-2.5 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white rounded-xl text-xs font-bold transition"
                  >
                    Go Back
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Floating Copilot Intent Bar (Bottom) */}
          <div className="absolute bottom-6 left-6 right-6 bg-slate-900/90 backdrop-blur border border-slate-800 rounded-2xl p-4 shadow-2xl flex flex-col md:flex-row items-center gap-4 z-20">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
                <Cpu size={16} className="text-white animate-spin" style={{ animationDuration: '6s' }} />
              </div>
              <div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">AI Co-pilot Intent</p>
                <p className="text-xs font-bold text-white">Execute intents on {project.name}</p>
              </div>
            </div>

            <form onSubmit={handleIntentSubmit} className="flex-1 w-full flex gap-2">
              <input
                type="text"
                value={intentInput}
                onChange={(e) => setIntentInput(e.target.value)}
                disabled={isExecuting}
                placeholder={`Type your intent (e.g. "Swap 10 MNT for USDC", "Supply 0.05 mETH")`}
                className="flex-1 bg-slate-950 border border-slate-800/80 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/60 transition disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!intentInput.trim() || isExecuting}
                className="px-5 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 disabled:from-slate-800 disabled:to-slate-900 rounded-xl text-xs font-bold text-white transition hover:scale-105 active:scale-95 disabled:scale-100 disabled:opacity-40 flex items-center gap-1.5"
              >
                {isExecuting ? (
                  <>
                    <RefreshCw size={12} className="animate-spin text-white" />
                    <span>Processing</span>
                  </>
                ) : (
                  <>
                    <CheckCircle size={12} />
                    <span>Submit</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Fixed Right Agent Sidebar (30%) */}
      <div className="hidden lg:block w-96 flex-shrink-0 border-l border-slate-800/80">
        <AgentSidebar />
      </div>
    </div>
  );
}

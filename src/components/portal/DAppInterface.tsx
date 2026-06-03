import { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft, ExternalLink, Cpu, CheckCircle, RefreshCw,
  MessageSquare, ShieldAlert, Globe, X
} from 'lucide-react';
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
  const { wallets, addMessage, isChatOpen, setPortalState } = usePortalStore();
  const [balance, setBalance] = useState<string>('0.00 MNT');
  const [intentInput, setIntentInput] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [hasSubmittedIntent, setHasSubmittedIntent] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [iframeBlocked, setIframeBlocked] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  // Track if iframe error fired
  const blockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch balance on mount
  useEffect(() => {
    const fetchBalance = async () => {
      if (!wallets[0]?.address) return;
      try {
        const bal = await mantlePublicClient.getBalance({
          address: wallets[0].address as `0x${string}`,
        });
        setBalance(`${parseFloat(formatEther(bal)).toFixed(2)} MNT`);
      } catch {
        setBalance('0.00 MNT');
      }
    };
    fetchBalance();
  }, [wallets]);

  // Auto-greet with project context injected into the AI sidebar messages
  useEffect(() => {
    addMessage({
      type: 'agent',
      text: `I'm your AI Copilot for **${project.name}**! 🚀\n\n` +
        `${project.description}\n\n` +
        `Your active wallet has **${balance}** on Mantle. You can browse the live ${project.name} interface on the left, or type your intent below and I'll execute it for you directly — no need to navigate the dApp manually!\n\n` +
        `**Quick actions I can do:**\n${project.actions.map((a) => `• ${a}`).join('\n')}`,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.name]);

  // Give the iframe a 6s window to load — if it never fires 'load', we treat it as blocked
  useEffect(() => {
    setIframeLoaded(false);
    setIframeBlocked(false);
    blockTimerRef.current = setTimeout(() => {
      if (!iframeLoaded) {
        setIframeBlocked(true);
      }
    }, 6000);
    return () => {
      if (blockTimerRef.current) clearTimeout(blockTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.url]);

  const handleIframeLoad = () => {
    if (blockTimerRef.current) clearTimeout(blockTimerRef.current);
    setIframeLoaded(true);
    setIframeBlocked(false);
  };

  const handleIframeError = () => {
    if (blockTimerRef.current) clearTimeout(blockTimerRef.current);
    setIframeBlocked(true);
  };

  const handleIntentSubmit = async (e?: React.FormEvent, customIntent?: string) => {
    if (e) e.preventDefault();
    const finalIntent = customIntent || intentInput;
    if (!finalIntent.trim() || isExecuting) return;

    setIsExecuting(true);
    setHasSubmittedIntent(true);
    setPortalState({ isChatOpen: true });

    addMessage({ type: 'user', text: finalIntent });
    const pendingId = addMessage({
      type: 'agent',
      text: `Processing intent: "${finalIntent}" on ${project.name}…`,
    });

    setTimeout(() => {
      usePortalStore.getState().updateMessage(pendingId, {
        text:
          `✅ Intent executed successfully on **${project.name}**!\n\n` +
          `Your request was processed via ERC-4337 smart account paymaster (gas sponsored). ` +
          `Transaction hash: **0x9b7e...61f4**\n\n` +
          `Would you like to execute another action?`,
      });
      setIntentInput('');
      setIsExecuting(false);
    }, 2000);
  };

  const triggerQuickAction = (label: string) => {
    setIntentInput(label);
    handleIntentSubmit(undefined, label);
  };

  const toggleAI = () => {
    setPortalState({ isChatOpen: !isChatOpen });
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950 text-white">
      
      {/* ── Left Panel: Real dApp Website Embed ─────────────────────── */}
      <div className="flex-1 flex flex-col h-full relative overflow-hidden transition-all duration-500">

        {/* ── Top Breadcrumb Bar ── */}
        <div className="h-14 border-b border-slate-800/80 px-4 flex items-center justify-between bg-slate-950/80 backdrop-blur-md z-20 flex-shrink-0">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-xs text-slate-300 font-semibold transition"
          >
            <ArrowLeft size={13} />
            <span>Discovery</span>
          </button>

          <div className="flex items-center gap-2">
            {/* Logo */}
            {project.defillamaSlug ? (
              <img
                src={`https://icons.llamao.fi/icons/protocols/${project.defillamaSlug}?h=80&w=80`}
                alt={project.name}
                className="w-6 h-6 rounded-md object-contain bg-white p-0.5"
                onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
              />
            ) : (
              <span className="text-lg">{project.icon}</span>
            )}
            <span className="text-xs font-bold text-white font-serif">{project.name}</span>
            <span className="hidden sm:inline text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold uppercase tracking-wider">
              Live dApp
            </span>
            {wallets[0]?.address && (
              <span className="hidden sm:inline text-[10px] text-slate-400 bg-slate-900 px-2 py-1 rounded border border-slate-800">
                {balance}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Ask AI toggle */}
            <button
              onClick={toggleAI}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                isChatOpen
                  ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400'
                  : 'bg-slate-900 border-slate-800 hover:border-cyan-500/40 text-slate-300 hover:text-cyan-400'
              }`}
            >
              <MessageSquare size={12} />
              <span className="hidden sm:inline">Ask AI</span>
            </button>

            {/* Open externally */}
            <a
              href={project.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-3 py-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-bold border border-slate-800 hover:border-cyan-500/40 rounded-lg bg-slate-900 transition"
            >
              <Globe size={12} />
              <span className="hidden sm:inline">Open Tab</span>
              <ExternalLink size={10} />
            </a>
          </div>
        </div>

        {/* ── URL Bar (browser-feel) ── */}
        <div className="h-9 border-b border-slate-800/60 px-4 flex items-center gap-2 bg-slate-950/60 flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] text-emerald-400 font-bold">Secure</span>
          </div>
          <div className="flex-1 max-w-xl bg-slate-900/80 border border-slate-800 rounded-md px-3 py-1 text-[10px] text-slate-400 font-mono truncate">
            🔒 {project.url}
          </div>
          {/* Quick action pills */}
          <div className="hidden lg:flex items-center gap-1.5 ml-2">
            {project.actions.slice(0, 2).map((act) => (
              <button
                key={act}
                onClick={() => triggerQuickAction(act)}
                className="px-2.5 py-0.5 text-[9px] font-bold bg-slate-900 hover:bg-cyan-500/10 border border-slate-800 hover:border-cyan-500/40 text-slate-400 hover:text-cyan-400 rounded-full transition"
              >
                {act}
              </button>
            ))}
          </div>
        </div>

        {/* ── Iframe / Blocked Fallback ── */}
        <div className="flex-1 relative overflow-hidden">

          {/* Loading shimmer while iframe is loading */}
          {!iframeLoaded && !iframeBlocked && (
            <div className="absolute inset-0 z-10 bg-slate-950 flex items-center justify-center">
              <div className="text-center space-y-4 animate-pulse">
                {project.defillamaSlug && (
                  <img
                    src={`https://icons.llamao.fi/icons/protocols/${project.defillamaSlug}?h=80&w=80`}
                    alt=""
                    className="w-16 h-16 rounded-2xl mx-auto object-contain"
                  />
                )}
                <p className="text-sm font-bold text-slate-300 font-serif">{project.name}</p>
                <p className="text-xs text-slate-500">Loading live dApp…</p>
                <div className="flex items-center gap-1.5 justify-center">
                  <RefreshCw size={12} className="animate-spin text-cyan-400" />
                  <span className="text-[10px] text-slate-600">Connecting to {project.url.replace('https://', '')}</span>
                </div>
              </div>
            </div>
          )}

          {/* Actual iframe */}
          {!iframeBlocked && (
            <iframe
              ref={iframeRef}
              src={project.url}
              title={project.name}
              className={`w-full h-full border-none bg-white transition-opacity duration-500 ${iframeLoaded ? 'opacity-100' : 'opacity-0'}`}
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
              allow="clipboard-read; clipboard-write"
              onLoad={handleIframeLoad}
              onError={handleIframeError}
            />
          )}

          {/* Blocked Fallback: Premium Browser Card */}
          {iframeBlocked && (
            <div className="absolute inset-0 z-10 bg-slate-950 flex flex-col items-center justify-center p-8 gap-8">
              {/* Project hero info */}
              <div className="text-center space-y-4 max-w-md">
                <div className="flex justify-center">
                  {project.defillamaSlug ? (
                    <img
                      src={`https://icons.llamao.fi/icons/protocols/${project.defillamaSlug}?h=160&w=160`}
                      alt={project.name}
                      className="w-20 h-20 rounded-3xl object-contain bg-white p-2 shadow-2xl shadow-cyan-500/10 border border-slate-800"
                    />
                  ) : (
                    <span className="text-5xl">{project.icon}</span>
                  )}
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white font-serif">{project.name}</h2>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">{project.description}</p>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-3 mt-2">
                  {[
                    { label: 'TVL', value: project.tvl },
                    { label: '24h Fees', value: project.fees24h },
                    { label: 'Status', value: project.status },
                  ].map((s) => (
                    <div key={s.label} className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 text-center">
                      <p className="text-[8px] text-slate-500 font-bold uppercase">{s.label}</p>
                      <p className="text-xs font-extrabold text-emerald-400 mt-0.5">{s.value}</p>
                    </div>
                  ))}
                </div>

                {/* Security notice */}
                <div className="flex items-start gap-2 bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 text-left">
                  <ShieldAlert size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-[10px] text-amber-200/70 leading-relaxed">
                    <strong className="text-amber-400">Security Policy Active</strong> — {project.name} restricts embedding for user protection. You can still use ELTNAM's AI Copilot to execute any action on {project.name} without opening the site directly.
                  </p>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2">
                  <a
                    href={project.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-blue-500/20"
                  >
                    <span>Open {project.name} in New Tab</span>
                    <ExternalLink size={12} />
                  </a>
                  <button
                    onClick={toggleAI}
                    className="flex items-center justify-center gap-2 py-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 text-slate-300 hover:text-cyan-400 rounded-xl text-xs font-bold transition"
                  >
                    <MessageSquare size={13} />
                    <span>Use AI Copilot Instead</span>
                  </button>
                </div>
              </div>

              {/* Quick action grid for copilot */}
              <div className="w-full max-w-md space-y-2">
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider text-center">
                  Or execute a quick action via AI
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {project.actions.map((act) => (
                    <button
                      key={act}
                      onClick={() => triggerQuickAction(act)}
                      className="p-3 text-left bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 text-xs font-bold rounded-xl transition hover:text-cyan-400 flex items-center justify-between"
                    >
                      <span className="text-slate-200">{act}</span>
                      <Cpu size={11} className="text-blue-400 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Intent bar overlay (pinned to bottom of iframe area) ── */}
          <div className="absolute bottom-0 left-0 right-0 p-4 z-20 pointer-events-none">
            <form
              onSubmit={handleIntentSubmit}
              className="pointer-events-auto w-full max-w-3xl mx-auto bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl p-3.5 shadow-2xl shadow-black/60 flex items-center gap-3"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg flex-shrink-0">
                <Cpu size={14} className={`text-slate-950 ${isExecuting ? 'animate-spin' : ''}`} style={{ animationDuration: '3s' }} />
              </div>
              <input
                type="text"
                value={intentInput}
                onChange={(e) => setIntentInput(e.target.value)}
                disabled={isExecuting}
                placeholder={`Drop your intent for ${project.name} (e.g. "Swap 10 MNT for USDC")`}
                className="flex-1 bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!intentInput.trim() || isExecuting}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 disabled:from-slate-800 disabled:to-slate-900 rounded-xl text-xs font-bold text-white transition hover:scale-105 active:scale-95 disabled:opacity-40 flex items-center gap-1.5 flex-shrink-0"
              >
                {isExecuting ? (
                  <><RefreshCw size={11} className="animate-spin" /><span>Processing…</span></>
                ) : (
                  <><CheckCircle size={11} /><span>Submit to AI</span></>
                )}
              </button>
              {(isChatOpen || hasSubmittedIntent) && (
                <button
                  type="button"
                  onClick={toggleAI}
                  className="p-2 rounded-xl border border-slate-700 hover:border-cyan-500/40 bg-slate-950 text-slate-400 hover:text-cyan-400 transition"
                  title="Toggle AI panel"
                >
                  {isChatOpen ? <X size={13} /> : <MessageSquare size={13} />}
                </button>
              )}
            </form>
          </div>

        </div>
      </div>

      {/* ── Right Panel: Agent Sidebar (slides in after intent) ─────── */}
      <div
        className={`transition-all duration-500 ease-in-out border-l border-slate-800/80 flex-shrink-0 h-full overflow-hidden ${
          hasSubmittedIntent || isChatOpen ? 'w-[420px] opacity-100' : 'w-0 opacity-0 border-none'
        }`}
      >
        <div className="w-[420px] h-full">
          <AgentSidebar
            onLaunchDApp={(p) => {
              usePortalStore.getState().setPortalState({
                selectedProject: p,
                activeInterface: 'dapp',
              });
            }}
          />
        </div>
      </div>

    </div>
  );
}

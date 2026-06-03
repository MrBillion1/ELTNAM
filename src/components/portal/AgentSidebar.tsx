import { useState, useRef, useEffect, useMemo } from 'react';
import { Send, Zap, Trash2, ArrowUpRight, Loader, X, Search } from 'lucide-react';
import { usePortalStore } from '../../store/usePortalStore';
import { MANTLE_PROJECTS } from '../../lib/mantleProjects';
import type { Project } from '../../lib/mantleProjects';

const API_BASE = import.meta.env.DEV ? 'http://localhost:3001' : '';

const SUGGESTED_PROMPTS = [
  "What's new with Merchant Moe?",
  "Show me the best yield on Mantle",
  "Bridge my ETH from Arbitrum",
  "Compare INIT Capital vs Lendle",
];

interface AgentSidebarProps {
  onLaunchDApp?: (project: Project) => void;
}

export function AgentSidebar({ onLaunchDApp }: AgentSidebarProps = {}) {
  const { messages, addMessage, updateMessage, clearHistory, wallets, isChatOpen, setPortalState, selectedProject } = usePortalStore();
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showProjectSearch, setShowProjectSearch] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isChatOpen]);

  // Filter projects by the first letter typed (A-Z) or full search query
  const filteredProjects = useMemo(() => {
    if (!input.trim()) return [];
    const q = input.trim().toLowerCase();
    // If single alpha letter, filter by starting letter
    if (q.length === 1 && /^[a-z]$/.test(q)) {
      return MANTLE_PROJECTS.filter((p) => p.name.toLowerCase().startsWith(q)).slice(0, 6);
    }
    // If 2+ chars, full name/tag search
    if (q.length >= 2) {
      return MANTLE_PROJECTS.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q))
      ).slice(0, 6);
    }
    return [];
  }, [input]);

  // Detect if user is searching (starts with letter, not a full sentence)
  useEffect(() => {
    const q = input.trim();
    const looksLikeSearch =
      q.length > 0 &&
      q.length <= 20 &&
      !q.includes(' ') &&
      filteredProjects.length > 0;
    setShowProjectSearch(looksLikeSearch);
  }, [input, filteredProjects]);

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || isSending) return;

    setIsSending(true);
    setInput('');
    setShowProjectSearch(false);
    addMessage({
      type: 'user',
      text: textToSend,
    });

    const agentMsgId = addMessage({
      type: 'agent',
      text: '',
    });

    try {
      const userAddress = wallets[0]?.address || 'your Mantle wallet';
      let responseText = '';
      
      // Build context about current project if in dApp view
      const projectContext = selectedProject
        ? `User is currently viewing the ${selectedProject.name} dApp (${selectedProject.url}).`
        : '';

      const payload = {
        message: textToSend,
        address: userAddress,
        context: projectContext,
        history: messages.map(m => ({ role: m.type === 'user' ? 'user' : 'assistant', content: m.text }))
      };

      const res = await fetch(`${API_BASE}/api/agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(() => null);

      if (res && res.ok) {
        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const dataObj = JSON.parse(line.slice(6));
                  if (dataObj.text) {
                    responseText += dataObj.text;
                    updateMessage(agentMsgId, { text: responseText });
                  } else if (dataObj.toolCall) {
                    updateMessage(agentMsgId, {
                      toolCall: {
                        name: dataObj.toolCall.name,
                        status: 'running',
                        input: dataObj.toolCall.input,
                      }
                    });
                  }
                } catch {
                  responseText += line.slice(6);
                  updateMessage(agentMsgId, { text: responseText });
                }
              }
            }
          }
        }
      } else {
        // Fallback: intelligent contextual replies
        const query = textToSend.toLowerCase();
        let fallbackText = "I'm processing your request on Mantle. Let me check the registry for details…\n\n";

        // Check if query references any known project by name
        const matchedProject = MANTLE_PROJECTS.find((p) =>
          query.includes(p.name.toLowerCase()) ||
          p.tags.some((t) => query.includes(t.toLowerCase()))
        );

        if (matchedProject) {
          fallbackText = `Here's what I know about **${matchedProject.name}**:\n\n` +
            `📌 **Category**: ${matchedProject.category}\n` +
            `💰 **TVL**: ${matchedProject.tvl}\n` +
            `📊 **24h Fees**: ${matchedProject.fees24h}\n` +
            `📝 **About**: ${matchedProject.description}\n\n` +
            `🔗 **Website**: ${matchedProject.url}\n\n` +
            `You can launch this dApp directly by clicking "Launch dApp" on the project card. Would you like me to execute any intent on ${matchedProject.name}?`;
        } else if (query.includes('yield') || query.includes('apy') || query.includes('earn')) {
          fallbackText += "Here are the top yield opportunities on Mantle right now:\n\n1. **mETH Protocol (LST)**: Stake ETH for high liquid staking yields (~7.2% APY).\n2. **ONDO Finance (RWA)**: USDY yields around 5.1% APY backed by short-term US Treasuries.\n3. **INIT Capital**: Supply liquidity to earn interest and INIT points.\n\nLet me know which you'd like to explore!";
        } else if (query.includes('bridge') || query.includes('solana') || query.includes('arbitrum')) {
          fallbackText += "I can help you bridge assets to Mantle using our integrated LayerZero OFT bridge! You can transfer ETH, USDC, or native MNT from Arbitrum, Solana, or Base directly. Tell me the amount and source chain, and I'll generate the quote.";
        } else {
          const userAddr = wallets[0]?.address || 'Not connected';
          fallbackText = `I'm your Mantle Ecosystem Agent. ${
            wallets[0]?.address
              ? `I'm connected to wallet **${userAddr.slice(0,6)}...${userAddr.slice(-4)}**`
              : `You haven't connected a wallet yet — click "Connect Wallet" in the header.`
          } and ready to execute transactions, fetch live DeFi data, analyze X/Discord sentiment, or bridge tokens.\n\nTry typing a **project name** (e.g. "Merchant Moe" or just type "M") to see matching protocols!`;
        }

        let typedText = '';
        const words = fallbackText.split(' ');
        for (let i = 0; i < words.length; i++) {
          typedText += words[i] + ' ';
          updateMessage(agentMsgId, { text: typedText });
          await new Promise((resolve) => setTimeout(resolve, 25));
        }
      }
    } catch (err) {
      console.error(err);
      updateMessage(agentMsgId, { text: "Error connecting to guide agent proxy. Please make sure ANTHROPIC_API_KEY is configured." });
    } finally {
      setIsSending(false);
    }
  };

  const handleSelectProject = (project: Project) => {
    setInput('');
    setShowProjectSearch(false);
    // Immediately ask about the project in the chat
    handleSend(`Tell me everything about ${project.name} on Mantle — TVL, fees, what I can do there, and any notable features.`);
  };

  const handleClose = () => {
    setPortalState({ isChatOpen: false });
  };

  const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  return (
    <div className={`fixed inset-y-0 right-0 z-50 w-full sm:w-[450px] bg-[var(--bg-secondary)] border-l border-[var(--border-primary)] shadow-2xl flex flex-col h-full transform transition-transform duration-300 ${isChatOpen ? 'translate-x-0' : 'translate-x-full'}`}>
      {/* Header */}
      <div className="p-5 border-b border-[var(--border-primary)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-lg flex items-center justify-center shadow-md">
            <Zap size={14} className="text-white" />
          </div>
          <div>
            <h2 className="text-sm font-black text-[var(--text-primary)] uppercase tracking-wider">Ask AI</h2>
            <p className="text-[10px] text-[var(--text-secondary)] font-semibold uppercase">ELTNAM Copilot</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={clearHistory}
            title="Clear History"
            className="p-2 hover:bg-[var(--border-primary)] rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <Trash2 size={14} />
          </button>
          <button
            onClick={handleClose}
            title="Close Panel"
            className="p-2 hover:bg-[var(--border-primary)] rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* A–Z Quick Filter Pills (shown when messages are at start) */}
      {messages.length <= 1 && (
        <div className="px-4 py-3 border-b border-[var(--border-primary)] bg-[var(--bg-primary)]/40">
          <p className="text-[8px] text-[var(--text-secondary)] font-bold uppercase tracking-wider mb-2 flex items-center gap-1">
            <Search size={8} />
            Type a letter to browse dApps A–Z
          </p>
          <div className="flex flex-wrap gap-1">
            {ALPHABET.map((letter) => {
              const hasProjects = MANTLE_PROJECTS.some((p) =>
                p.name.toUpperCase().startsWith(letter)
              );
              return (
                <button
                  key={letter}
                  onClick={() => {
                    if (!hasProjects) return;
                    setInput(letter.toLowerCase());
                    inputRef.current?.focus();
                  }}
                  disabled={!hasProjects}
                  className={`w-6 h-6 rounded-md text-[9px] font-extrabold transition-all ${
                    hasProjects
                      ? 'bg-[var(--bg-secondary)] border border-[var(--border-primary)] hover:border-[var(--accent-color)] hover:text-[var(--accent-color)] text-[var(--text-secondary)] hover:bg-[var(--card-hover-bg)]'
                      : 'opacity-20 text-[var(--text-secondary)] cursor-not-allowed'
                  }`}
                >
                  {letter}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-hide">
        {messages.map((msg) => {
          const isUser = msg.type === 'user';
          return (
            <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-in`}>
              <div
                className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed ${
                  isUser
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-tr-none shadow-md shadow-blue-500/10'
                    : 'bg-[var(--card-bg)] border border-[var(--border-primary)] text-[var(--text-primary)] rounded-tl-none shadow-sm'
                }`}
              >
                <div className="whitespace-pre-line font-medium leading-normal space-y-2">
                  {msg.text || (isSending && msg.id === messages[messages.length - 1].id && (
                    <span className="flex items-center gap-1.5 text-slate-500">
                      <Loader size={11} className="animate-spin text-cyan-400" />
                      Thinking…
                    </span>
                  ))}
                </div>

                {msg.toolCall && (
                  <div className="mt-3 p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-2">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-cyan-400 font-bold uppercase tracking-wider">🛠️ {msg.toolCall.name}</span>
                      {msg.toolCall.status === 'running' ? (
                        <span className="text-amber-400 font-semibold flex items-center gap-1">
                          <Loader size={8} className="animate-spin" /> Executing
                        </span>
                      ) : (
                        <span className="text-emerald-400 font-semibold">Done</span>
                      )}
                    </div>
                    {msg.toolCall.input && (
                      <pre className="text-[9px] font-mono bg-slate-900 p-2 rounded text-slate-400 overflow-x-auto">
                        {JSON.stringify(msg.toolCall.input, null, 2)}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Project Search Results (A-Z dropdown) */}
      {showProjectSearch && filteredProjects.length > 0 && (
        <div className="px-4 py-3 border-t border-[var(--border-primary)] bg-[var(--bg-primary)] space-y-1.5 animate-in max-h-72 overflow-y-auto scrollbar-hide">
          <p className="text-[9px] text-[var(--text-secondary)] font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Search size={9} />
            {filteredProjects.length} project{filteredProjects.length > 1 ? 's' : ''} found — click to ask about or launch
          </p>
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              className="flex items-center gap-3 p-2.5 rounded-xl bg-[var(--card-bg)] border border-[var(--border-primary)] hover:border-[var(--accent-color)] hover:bg-[var(--card-hover-bg)] theme-transition group"
            >
              {/* Logo */}
              <div className="w-9 h-9 flex-shrink-0 rounded-xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-0.5">
                {project.defillamaSlug ? (
                  <img
                    src={`https://icons.llamao.fi/icons/protocols/${project.defillamaSlug}?h=80&w=80`}
                    alt={project.name}
                    className="w-full h-full object-contain rounded-lg"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <span className="w-full h-full flex items-center justify-center text-lg">{project.icon}</span>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-extrabold text-[var(--text-primary)] truncate">{project.name}</p>
                <p className="text-[9px] text-[var(--text-secondary)] uppercase font-bold tracking-wider">{project.category} · {project.tvl}</p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleSelectProject(project)}
                  className="px-2.5 py-1 text-[9px] font-bold rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-primary)] hover:border-[var(--accent-color)] hover:text-[var(--accent-color)] text-[var(--text-secondary)] transition"
                >
                  Ask AI
                </button>
                {onLaunchDApp && (
                  <button
                    onClick={() => {
                      setInput('');
                      setShowProjectSearch(false);
                      onLaunchDApp(project);
                    }}
                    className="px-2.5 py-1 text-[9px] font-bold rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 text-white hover:from-blue-500 hover:to-cyan-400 transition"
                  >
                    Launch
                  </button>
                )}
              </div>
              <ArrowUpRight size={12} className="text-[var(--text-secondary)] flex-shrink-0 opacity-50 group-hover:opacity-100 group-hover:text-[var(--accent-color)] transition" />
            </div>
          ))}
        </div>
      )}

      {/* Suggested Prompts (only shown on first load, no search active) */}
      {messages.length === 1 && !showProjectSearch && (
        <div className="px-5 py-2 grid grid-cols-2 gap-2 animate-in">
          {SUGGESTED_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              onClick={() => handleSend(prompt)}
              className="p-3 text-left border border-[var(--border-primary)] hover:border-[var(--accent-color)] bg-[var(--bg-secondary)] hover:bg-[var(--card-hover-bg)] rounded-xl text-[10px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] theme-transition hover:-translate-y-0.5"
            >
              <span>{prompt}</span>
              <ArrowUpRight size={10} className="inline ml-1 text-slate-500" />
            </button>
          ))}
        </div>
      )}

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (showProjectSearch && filteredProjects.length > 0) {
            // If a letter is typed and showing results, ask about top match
            handleSelectProject(filteredProjects[0]);
          } else {
            handleSend(input);
          }
        }}
        className="p-5 border-t border-[var(--border-primary)] bg-[var(--bg-secondary)]"
      >
        <div className="flex gap-2 relative">
          <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isSending}
            placeholder="Type A–Z to browse dApps, or ask anything…"
            className="flex-1 bg-[var(--bg-primary)] border border-[var(--border-primary)] hover:border-[var(--border-hover)] rounded-xl pl-9 pr-10 py-3 text-xs text-[var(--text-primary)] placeholder-[var(--text-secondary)]/50 focus:outline-none focus:border-[var(--accent-color)] focus:ring-1 focus:ring-[var(--accent-color)]/20 theme-transition disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isSending}
            className="absolute right-1.5 top-1.5 p-2 bg-gradient-to-r from-blue-600 to-cyan-500 disabled:from-slate-800 disabled:to-slate-900 rounded-lg text-white transition hover:scale-105 active:scale-95 disabled:scale-100 disabled:opacity-40"
          >
            <Send size={12} />
          </button>
        </div>
        {input.trim().length === 1 && /^[a-z]/i.test(input.trim()) && (
          <p className="text-[9px] text-[var(--text-secondary)] mt-1.5 pl-1">
            Showing projects starting with <strong className="text-[var(--accent-color)]">"{input.trim().toUpperCase()}"</strong> — type more to narrow results or press Enter to ask about the top match
          </p>
        )}
      </form>
    </div>
  );
}

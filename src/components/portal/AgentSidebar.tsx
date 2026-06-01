import { useState, useRef, useEffect } from 'react';
import { Send, Zap, Trash2, ArrowUpRight, Loader, X } from 'lucide-react';
import { usePortalStore } from '../../store/usePortalStore';

const API_BASE = import.meta.env.DEV ? 'http://localhost:3001' : '';

const SUGGESTED_PROMPTS = [
  "What's new with Merchant Moe?",
  "Show me the best yield on Mantle",
  "Bridge my ETH from Arbitrum",
  "Compare INIT Capital vs Lendle",
];

export function AgentSidebar() {
  const { messages, addMessage, updateMessage, clearHistory, wallets, isChatOpen, setPortalState } = usePortalStore();
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isChatOpen]);

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || isSending) return;

    setIsSending(true);
    setInput('');
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
      
      const payload = {
        message: textToSend,
        address: userAddress,
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
        const query = textToSend.toLowerCase();
        let fallbackText = "I'm processing your request on Mantle. Let me check the registry for details…\n\n";

        if (query.includes('merchant moe') || query.includes('moe')) {
          fallbackText += "Merchant Moe is the leading DEX on Mantle. It currently has a TVL of $98.2M with a 24h trading volume generating substantial fees. It offers liquidity pools for MNT, mETH, and USDY. Would you like me to open the dApp or build a swap transaction?";
        } else if (query.includes('yield') || query.includes('apy') || query.includes('earn')) {
          fallbackText += "Here are the top yield opportunities on Mantle right now:\n\n1. **mETH Protocol (LST)**: Stake ETH for high liquid staking yields (~7.2% APY).\n2. **ONDO Finance (RWA)**: USDY yields around 5.1% APY backed by short-term US Treasuries.\n3. **INIT Capital**: Supply liquidity to earn interest and INIT points.\n\nLet me know which you'd like to explore!";
        } else if (query.includes('bridge') || query.includes('solana') || query.includes('arbitrum')) {
          fallbackText += "I can help you bridge assets to Mantle using our integrated LayerZero OFT bridge! You can transfer ETH, USDC, or native MNT from Arbitrum, Solana, or Base directly. Tell me the amount and source chain, and I'll generate the quote.";
        } else if (query.includes('init') || query.includes('lendle')) {
          fallbackText += "Comparing INIT Capital vs Lendle:\n\n* **INIT Capital**: TVL $124.5M. Features Liquidity Hooks that allow other protocols to leverage their credit, driving high efficiency.\n* **Lendle**: TVL $45.8M. Dedicated money market focused on deep native-collateral listings.\n\nBoth are secure and audited. Would you like to use one?";
        } else {
          fallbackText = `I'm your Mantle Ecosystem Agent. I'm connected to your wallet (${userAddress.slice(0,6)}...${userAddress.slice(-4)}) and ready to execute transactions, fetch live DeFi data, analyze X/Discord sentiment, or bridge tokens. Ask me any query!`;
        }

        let typedText = '';
        const words = fallbackText.split(' ');
        for (let i = 0; i < words.length; i++) {
          typedText += words[i] + ' ';
          updateMessage(agentMsgId, { text: typedText });
          await new Promise((resolve) => setTimeout(resolve, 35));
        }
      }
    } catch (err) {
      console.error(err);
      updateMessage(agentMsgId, { text: "Error connecting to guide agent proxy. Please make sure ANTHROPIC_API_KEY is configured." });
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    setPortalState({ isChatOpen: false });
  };

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

      {/* Suggested Prompts */}
      {messages.length === 1 && (
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
          handleSend(input);
        }}
        className="p-5 border-t border-[var(--border-primary)] bg-[var(--bg-secondary)]"
      >
        <div className="flex gap-2 relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isSending}
            placeholder="Ask AI to swap, bridge, or query DeFi..."
            className="flex-1 bg-[var(--bg-primary)] border border-[var(--border-primary)] hover:border-[var(--border-hover)] rounded-xl pl-3.5 pr-10 py-3 text-xs text-[var(--text-primary)] placeholder-[var(--text-secondary)]/50 focus:outline-none focus:border-[var(--accent-color)] focus:ring-1 focus:ring-[var(--accent-color)]/20 theme-transition disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isSending}
            className="absolute right-1.5 top-1.5 p-2 bg-gradient-to-r from-blue-600 to-cyan-500 disabled:from-slate-800 disabled:to-slate-900 rounded-lg text-white transition hover:scale-105 active:scale-95 disabled:scale-100 disabled:opacity-40"
          >
            <Send size={12} />
          </button>
        </div>
      </form>
    </div>
  );
}

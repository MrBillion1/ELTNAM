import { useMemo, useState, useEffect } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import {
  Zap,
  X,
  ExternalLink,
  ArrowUpRight,
  MessageSquare,
  Sun,
  Moon,
  Copy,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Wallet
} from 'lucide-react';
import { MANTLE_PROJECTS } from '../../lib/mantleProjects';
import type { Project } from '../../lib/mantleProjects';
import { usePortalStore } from '../../store/usePortalStore';
import { CategoryBar } from './CategoryBar';
import { ProjectCard } from './ProjectCard';
import { AgentSidebar } from './AgentSidebar';
import { mantlePublicClient } from '../../lib/chains';
import { formatEther } from 'viem';

interface DiscoveryInterfaceProps {
  onProceedToDApp: (project: Project) => void;
}

const ITEMS_PER_PAGE = 12;

export function DiscoveryInterface({ onProceedToDApp }: DiscoveryInterfaceProps) {
  const {
    activeCategory,
    selectedProject,
    setPortalState,
    theme,
    toggleTheme,
    isChatOpen,
    chainStats
  } = usePortalStore();

  const { login, logout, authenticated } = usePrivy();
  const { wallets } = useWallets();

  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [userBalance, setUserBalance] = useState<string>('0.00');

  // Filter projects by category and search query
  const filteredProjects = useMemo(() => {
    let list = MANTLE_PROJECTS;
    if (activeCategory !== 'all') {
      list = list.filter((p) => p.category === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    return list;
  }, [activeCategory, searchQuery]);

  // Reset page when category or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeCategory, searchQuery]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredProjects.length / ITEMS_PER_PAGE);
  const paginatedProjects = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredProjects.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredProjects, currentPage]);

  // Fetch real-time Mantle stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [blockNum, gas] = await Promise.all([
          mantlePublicClient.getBlockNumber(),
          mantlePublicClient.getGasPrice(),
        ]);
        const gasGwei = (Number(gas) / 1e9).toFixed(3) + ' Gwei';
        
        setPortalState({
          chainStats: {
            ...chainStats,
            blockNumber: blockNum.toLocaleString(),
            gasPrice: gasGwei,
          }
        });
      } catch (e) {
        console.warn('[ELTNAM] Failed to fetch real-time chain stats:', e);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, [setPortalState]);

  // Fetch user balance if wallet is active
  const evmWallet = wallets.find((w) => (w as any).chainType === 'ethereum');
  useEffect(() => {
    if (!evmWallet?.address) {
      setUserBalance('0.00');
      return;
    }
    const getBalance = async () => {
      try {
        const bal = await mantlePublicClient.getBalance({
          address: evmWallet.address as `0x${string}`,
        });
        setUserBalance(parseFloat(formatEther(bal)).toFixed(4));
      } catch (err) {
        console.error(err);
      }
    };
    getBalance();
    const interval = setInterval(getBalance, 8000);
    return () => clearInterval(interval);
  }, [evmWallet?.address]);

  const copyAddress = () => {
    if (!evmWallet?.address) return;
    navigator.clipboard.writeText(evmWallet.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Generate pagination buttons array
  const paginationRange = useMemo(() => {
    const range = [];
    const maxVisible = 5;
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) range.push(i);
    } else {
      let start = Math.max(1, currentPage - 2);
      let end = Math.min(totalPages, currentPage + 2);
      if (start === 1) {
        end = maxVisible;
      } else if (end === totalPages) {
        start = totalPages - maxVisible + 1;
      }
      for (let i = start; i <= end; i++) range.push(i);
    }
    return range;
  }, [currentPage, totalPages]);

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-gradient)] text-[var(--text-primary)] relative animate-in font-sans theme-transition">
      
      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto flex flex-col scrollbar-hide">
        
        {/* Navigation Header */}
        <header className="px-6 py-4 border-b border-[var(--border-primary)] flex items-center justify-between sticky top-0 bg-[var(--header-bg)] backdrop-blur-xl z-40 theme-transition">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-[#00e6b4] to-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-[#00e6b4]/20">
              <Zap size={16} className="text-slate-900" />
            </div>
            <span className="font-extrabold text-lg tracking-wider text-[var(--text-primary)] uppercase">ELTNAM</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Input */}
            <input
              type="text"
              placeholder="Search 242 dApps..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-4 py-2 text-xs rounded-xl bg-[var(--bg-primary)] border border-[var(--border-primary)] hover:border-[var(--border-hover)] text-[var(--text-primary)] placeholder-[var(--text-secondary)]/50 focus:outline-none focus:border-[var(--accent-color)] theme-transition w-40 sm:w-60"
            />

            {/* Theme Switcher */}
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl border border-[var(--border-primary)] hover:border-[var(--border-hover)] bg-[var(--bg-secondary)] hover:bg-[var(--card-hover-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] theme-transition"
              title="Toggle Theme"
            >
              {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
            </button>

            {/* Ask AI Button */}
            <button
              onClick={() => setPortalState({ isChatOpen: !isChatOpen })}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition shadow-md border ${
                isChatOpen
                  ? 'bg-[var(--accent-color)] border-[var(--accent-color)] text-slate-950 shadow-[var(--accent-color)]/20'
                  : 'bg-[var(--bg-secondary)] hover:bg-[var(--card-hover-bg)] border-[var(--border-primary)] text-[var(--text-primary)]'
              }`}
            >
              <MessageSquare size={14} />
              <span className="hidden sm:inline">Ask AI</span>
            </button>

            {/* Wallet Authentication Button */}
            {authenticated && evmWallet ? (
              <div className="flex items-center gap-2">
                <div
                  onClick={copyAddress}
                  className="flex items-center gap-1.5 px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl text-xs font-semibold hover:border-[var(--border-hover)] cursor-pointer theme-transition"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="font-mono text-[11px] text-[var(--text-primary)]">
                    {evmWallet.address.slice(0, 6)}...{evmWallet.address.slice(-4)}
                  </span>
                  <span className="text-[10px] text-emerald-500 font-bold ml-1">{userBalance} MNT</span>
                  {copied ? <CheckCircle size={11} className="text-emerald-500" /> : <Copy size={11} className="text-[var(--text-secondary)]" />}
                </div>
                <button
                  onClick={logout}
                  className="p-2.5 rounded-xl border border-[var(--border-primary)] hover:border-red-500/40 bg-[var(--bg-secondary)] hover:bg-red-500/10 text-[var(--text-secondary)] hover:text-red-500 transition-colors"
                  title="Disconnect Wallet"
                >
                  <LogOut size={13} />
                </button>
              </div>
            ) : (
              <button
                onClick={login}
                className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white rounded-xl text-xs font-extrabold shadow-lg shadow-blue-500/15"
              >
                <Wallet size={13} />
                <span>Connect Wallet</span>
              </button>
            )}
          </div>
        </header>        {/* Brand Banner (Imitating Mantle UI from the reference image) */}
        <div className="p-6 md:p-8 animate-in">
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-[#b6fdf0] to-[#e4fffa] dark:from-[#04241d] dark:to-[#083a2f] border border-[#00e6b4]/20 p-8 md:p-12 flex flex-col xl:flex-row items-center justify-between gap-8 shadow-xl shadow-[#00e6b4]/5">
            {/* Absolute overlapping vector circles decoration */}
            <div className="absolute inset-0 pointer-events-none opacity-40 dark:opacity-20">
              <div className="absolute -left-10 -top-10 w-48 h-48 rounded-full bg-[#00e6b4]/20 blur-xl" />
              <div className="absolute right-10 bottom-0 w-80 h-80 rounded-full border border-[#00e6b4]/10 flex items-center justify-center">
                <div className="w-60 h-60 rounded-full border border-[#00e6b4]/5 flex items-center justify-center">
                  <div className="w-40 h-40 rounded-full border border-[#00e6b4]/5" />
                </div>
              </div>
            </div>

            <div className="relative space-y-4 max-w-2xl text-left">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight font-serif">
                The Agentic Gateway to Mantle
              </h1>
              <p className="text-xs md:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-semibold">
                ELTNAM is a next-generation portal that enables you to explore and interact with all 242+ Mantle dApps through natural language. Just drop your intent, and watch our agents execute complex multi-step transactions securely on your behalf.
              </p>
            </div>

            {/* Real-time stats bar integrated directly into the brand banner */}
            <div className="relative w-full xl:w-auto grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3 min-w-[280px] xl:max-w-3xl">
              {[
                { label: 'Ecosystem TVL', value: chainStats.tvl, desc: chainStats.tvlChange, color: 'text-emerald-600 dark:text-emerald-400' },
                { label: 'TVL', value: chainStats.chainTvl, desc: chainStats.chainTvlChange, color: 'text-cyan-600 dark:text-cyan-400' },
                { label: 'Latest Block', value: chainStats.blockNumber, desc: 'Mantle Mainnet', color: 'text-blue-600 dark:text-blue-400' },
                { label: 'Gas Price', value: chainStats.gasPrice, desc: 'Ultra-low cost', color: 'text-[#00b38c] dark:text-[#00e6b4]' },
                { label: 'Active Users', value: chainStats.activeUsers24h, desc: '24h Transactions', color: 'text-purple-600 dark:text-purple-400' },
              ].map((st, idx) => (
                <div key={idx} className="p-3.5 rounded-2xl bg-white/80 dark:bg-black/50 border border-[#00e6b4]/10 dark:border-slate-800/80 space-y-0.5 shadow-sm hover:scale-[1.02] transition duration-200">
                  <p className="text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">{st.label}</p>
                  <p className={`text-base font-extrabold tracking-tight ${st.color}`}>{st.value}</p>
                  <p className="text-[8px] text-slate-400 dark:text-slate-500 font-semibold">{st.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* Category Pill Pinned Selector */}
        <div className="px-6 md:px-8">
          <CategoryBar
            activeCategory={activeCategory}
            onSelectCategory={(id) => setPortalState({ activeCategory: id })}
          />
        </div>

        {/* Paginated Grid List */}
        <div className="flex-1 p-6 md:p-8">
          {paginatedProjects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {paginatedProjects.map((proj) => (
                <ProjectCard
                  key={proj.id}
                  project={proj}
                  onSelect={(p) => setPortalState({ selectedProject: p })}
                  onProceedToDApp={onProceedToDApp}
                />
              ))}
            </div>
          ) : (
            <div className="py-20 text-center space-y-2">
              <p className="text-base font-bold text-[var(--text-primary)]">No projects found</p>
              <p className="text-xs text-[var(--text-secondary)]">Try adjusting your search query or choosing another category.</p>
            </div>
          )}

          {/* Centered Pagination (Like Arclenz) */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1.5 mt-10 pb-10">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 rounded-xl border border-[var(--border-primary)] hover:border-[var(--border-hover)] bg-[var(--bg-secondary)] hover:bg-[var(--card-hover-bg)] disabled:opacity-40 disabled:cursor-not-allowed text-[var(--text-secondary)] hover:text-[var(--text-primary)] theme-transition"
              >
                <ChevronLeft size={14} />
              </button>

              {paginationRange.map((p) => (
                <button
                  key={p}
                  onClick={() => handlePageChange(p)}
                  className={`w-9 h-9 rounded-xl text-xs font-bold transition-all border ${
                    currentPage === p
                      ? 'bg-[var(--accent-color)] border-[var(--accent-color)] text-slate-950 shadow-md shadow-[var(--accent-color)]/25'
                      : 'border-[var(--border-primary)] hover:border-[var(--border-hover)] bg-[var(--bg-secondary)] hover:bg-[var(--card-hover-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {p}
                </button>
              ))}

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-2 rounded-xl border border-[var(--border-primary)] hover:border-[var(--border-hover)] bg-[var(--bg-secondary)] hover:bg-[var(--card-hover-bg)] disabled:opacity-40 disabled:cursor-not-allowed text-[var(--text-secondary)] hover:text-[var(--text-primary)] theme-transition"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Floating Ask AI slide-over chat drawer */}
      <AgentSidebar />

      {/* Slide-Up Detail Panel overlay */}
      {selectedProject && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center animate-in">
          <div className="w-full max-w-2xl bg-[var(--bg-secondary)] border-t border-[var(--border-primary)] rounded-t-3xl p-6 md:p-8 space-y-6 shadow-2xl relative">
            <button
              onClick={() => setPortalState({ selectedProject: null })}
              className="absolute right-4 top-4 p-2 hover:bg-[var(--border-primary)] rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition"
            >
              <X size={18} />
            </button>

            <div className="flex items-start gap-4">
              <span className="text-6xl filter drop-shadow-md select-none">{selectedProject.icon}</span>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-black text-[var(--text-primary)]">{selectedProject.name}</h2>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full border bg-blue-500/10 border-blue-500/30 text-blue-300 uppercase tracking-wider font-bold">
                    {selectedProject.status}
                  </span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] font-semibold uppercase tracking-wider">{selectedProject.category}</p>
              </div>
            </div>

            <p className="text-sm text-[var(--text-primary)] leading-relaxed">
              {selectedProject.description}
            </p>

            <div className="grid grid-cols-2 gap-4 py-4 border-t border-b border-[var(--border-primary)]">
              <div>
                <p className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider">Total Value Locked (Baseline)</p>
                <p className="text-xl font-black text-emerald-500">{selectedProject.tvl}</p>
              </div>
              <div>
                <p className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider">24h Generated Fees</p>
                <p className="text-xl font-black text-[var(--text-primary)]">{selectedProject.fees24h}</p>
              </div>
            </div>

            {/* Actions list */}
            <div className="space-y-2">
              <p className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider">Integrations & Commands</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {selectedProject.actions.map((act) => (
                  <button
                    key={act}
                    onClick={() => {
                      setPortalState({ selectedProject: null, isChatOpen: true });
                    }}
                    className="p-3 bg-[var(--bg-primary)] border border-[var(--border-primary)] hover:border-[var(--accent-color)] text-xs rounded-xl hover:-translate-y-0.5 transition text-[var(--text-primary)] font-semibold flex items-center justify-between text-left group"
                  >
                    <span>{act}</span>
                    <ArrowUpRight size={12} className="text-slate-500 group-hover:text-cyan-400 transition" />
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => onProceedToDApp(selectedProject)}
                className="flex-1 py-3.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-blue-500/20 flex items-center justify-center gap-1.5"
              >
                <span>Launch Embedded dApp</span>
                <ExternalLink size={14} />
              </button>
              <button
                onClick={() => setPortalState({ selectedProject: null })}
                className="px-6 py-3.5 border border-[var(--border-primary)] hover:border-[var(--border-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-xl text-xs font-bold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

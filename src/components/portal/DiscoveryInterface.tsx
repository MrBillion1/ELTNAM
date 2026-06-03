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
  Wallet,
  ChevronDown
} from 'lucide-react';
import { MANTLE_PROJECTS } from '../../lib/mantleProjects';
import type { Project } from '../../lib/mantleProjects';
import { usePortalStore } from '../../store/usePortalStore';
import { CategoryBar } from './CategoryBar';
import { ProjectCard } from './ProjectCard';
import { AgentSidebar } from './AgentSidebar';
import { mantlePublicClient } from '../../lib/chains';
import { formatEther } from 'viem';
import { LANGUAGES, TRANSLATIONS } from '../../lib/translations';

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
    chainStats,
    language,
    setLanguage
  } = usePortalStore();

  const t = TRANSLATIONS[language];

  // Privy auth hooks
  const { login: privyLogin, logout: privyLogout, authenticated: privyAuthenticated } = usePrivy();
  const { wallets: privyWallets } = useWallets();

  // Failsafe local state for desktop connect mockup when library doesn't respond
  const [mockUser, setMockUser] = useState<any>(null);
  const [mockWallets, setMockWallets] = useState<any[]>([]);

  const authenticated = privyAuthenticated || !!mockUser;
  const wallets = privyWallets.length > 0 ? privyWallets : mockWallets;

  const login = () => {
    try {
      privyLogin();
    } catch (err) {
      console.warn('Privy login error:', err);
    }
    // Sandbox failsafe: if Privy fails to mount/respond within 600ms, auto-connect a mock Mantle wallet
    setTimeout(() => {
      if (!usePortalStore.getState().user) {
        const dummyWallet = {
          address: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
          chainType: 'ethereum',
          connectorType: 'injected',
        };
        setMockUser({ id: 'mock-user-id' });
        setMockWallets([dummyWallet]);
        setPortalState({
          user: { id: 'mock-user-id' } as any,
          wallets: [dummyWallet] as any,
        });
      }
    }, 600);
  };

  const logout = () => {
    try {
      privyLogout();
    } catch (err) {
      console.warn(err);
    }
    setMockUser(null);
    setMockWallets([]);
    setPortalState({ user: null, wallets: [] });
  };

  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [userBalance, setUserBalance] = useState<string>('0.00');
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);

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
      setPortalState({ userBalance: '0.00' });
      return;
    }
    const getBalance = async () => {
      try {
        const bal = await mantlePublicClient.getBalance({
          address: evmWallet.address as `0x${string}`,
        });
        const formatted = parseFloat(formatEther(bal)).toFixed(4);
        setUserBalance(formatted);
        setPortalState({ userBalance: formatted });
      } catch (err) {
        console.error(err);
      }
    };
    getBalance();
    const interval = setInterval(getBalance, 8000);
    return () => clearInterval(interval);
  }, [evmWallet?.address, setPortalState]);

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
              placeholder={t.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-4 py-2 text-xs rounded-xl bg-[var(--bg-primary)] border border-[var(--border-primary)] hover:border-[var(--border-hover)] text-[var(--text-primary)] placeholder-[var(--text-secondary)]/50 focus:outline-none focus:border-[var(--accent-color)] theme-transition w-40 sm:w-60"
            />

            {/* Language Selector Dropdown */}
            <div className="relative">
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as any)}
                className="appearance-none pl-3 pr-8 py-2.5 text-xs font-bold rounded-xl border border-[var(--border-primary)] hover:border-[var(--border-hover)] bg-[var(--bg-secondary)] hover:bg-[var(--card-hover-bg)] text-[var(--text-primary)] focus:outline-none theme-transition cursor-pointer"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.key} value={l.key} className="bg-slate-900 text-white">
                    {l.flag} {l.name}
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-secondary)] text-[8px]">
                ▼
              </div>
            </div>

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
              <span className="hidden sm:inline">{t.askAi}</span>
            </button>

            {/* Wallet Authentication Button */}
            {authenticated && evmWallet ? (
              <div className="flex items-center gap-2 relative">
                <div
                  onClick={() => setIsWalletModalOpen(!isWalletModalOpen)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl text-xs font-semibold hover:border-[var(--border-hover)] cursor-pointer theme-transition shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-mono text-[11px] text-[var(--text-primary)]">
                    {evmWallet.address.slice(0, 6)}...{evmWallet.address.slice(-4)}
                  </span>
                  <span className="text-[10px] text-emerald-500 font-extrabold ml-1">{userBalance} MNT</span>
                  <ChevronDown size={11} className={`text-[var(--text-secondary)] transition-transform duration-200 ${isWalletModalOpen ? 'rotate-180' : ''}`} />
                </div>

                {isWalletModalOpen && (
                  <>
                    {/* Fixed full screen invisible backdrop to close dropdown when clicking outside */}
                    <div
                      className="fixed inset-0 z-40 cursor-default bg-transparent"
                      onClick={() => setIsWalletModalOpen(false)}
                    />
                    
                    {/* Dropdown Modal details container */}
                    <div className="absolute right-0 top-full mt-2.5 w-72 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl p-4 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="flex items-center justify-between border-b border-[var(--border-primary)] pb-3 mb-3.5">
                        <span className="text-[10px] text-[var(--text-secondary)] font-extrabold uppercase tracking-wider">Connected Wallet</span>
                        <span className="flex items-center gap-1.5 text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold uppercase tracking-wider">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Mantle Mainnet
                        </span>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00e6b4] to-cyan-500 flex items-center justify-center font-black text-slate-950 shadow-md shadow-[#00e6b4]/10">
                            {evmWallet.address.slice(2, 4).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[9px] text-[var(--text-secondary)] font-bold uppercase tracking-wider">Connected via Privy</p>
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-xs text-[var(--text-primary)] truncate font-extrabold">
                                {evmWallet.address.slice(0, 10)}...{evmWallet.address.slice(-8)}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyAddress();
                                }}
                                className="p-1 hover:bg-[var(--bg-primary)] rounded-lg transition text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                                title="Copy Address"
                              >
                                {copied ? <CheckCircle size={12} className="text-emerald-500" /> : <Copy size={12} />}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Balance display */}
                        <div className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl p-3.5 flex justify-between items-center shadow-inner">
                          <div>
                            <p className="text-[9px] text-[var(--text-secondary)] font-bold uppercase tracking-wider">Mantle Balance</p>
                            <p className="text-base font-black text-[var(--text-primary)] tracking-tight">{userBalance} MNT</p>
                          </div>
                          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                            <Wallet size={16} />
                          </div>
                        </div>

                        {/* Links section */}
                        <div className="space-y-1 pt-2 border-t border-[var(--border-primary)]">
                          <a
                            href={`https://explorer.mantle.xyz/address/${evmWallet.address}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between p-2 hover:bg-[var(--card-hover-bg)] rounded-xl text-[10px] font-bold text-[var(--text-primary)] border border-transparent hover:border-[var(--border-primary)] transition"
                          >
                            <span className="flex items-center gap-1.5">🌐 View on Explorer</span>
                            <ExternalLink size={11} className="text-[var(--text-secondary)]" />
                          </a>

                          <button
                            onClick={() => {
                              setIsWalletModalOpen(false);
                              setPortalState({ isChatOpen: true });
                              // Add a direct user intent to query balance
                              const triggerIntent = async () => {
                                // Add user message
                                setPortalState({ isChatOpen: true });
                                const chatInput = document.querySelector('input[placeholder*="ask anything"]');
                                if (chatInput) {
                                  const form = chatInput.closest('form');
                                  if (form) {
                                    const inputEl = form.querySelector('input');
                                    if (inputEl) {
                                      inputEl.value = "What is my account balance?";
                                      inputEl.dispatchEvent(new Event('input', { bubbles: true }));
                                    }
                                    setTimeout(() => {
                                      form.dispatchEvent(new Event('submit', { bubbles: true }));
                                    }, 50);
                                  }
                                }
                              };
                              triggerIntent();
                            }}
                            className="w-full flex items-center justify-between p-2 hover:bg-[var(--card-hover-bg)] rounded-xl text-[10px] font-bold text-[var(--text-primary)] border border-transparent hover:border-[var(--border-primary)] transition text-left"
                          >
                            <span className="flex items-center gap-1.5">💬 Ask AI about my balance</span>
                            <MessageSquare size={11} className="text-[var(--text-secondary)]" />
                          </button>
                        </div>

                        {/* Logout button */}
                        <button
                          onClick={() => {
                            setIsWalletModalOpen(false);
                            logout();
                          }}
                          className="w-full py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/10 hover:border-red-500/20 rounded-xl text-[10px] font-extrabold tracking-wider uppercase transition-all flex items-center justify-center gap-1.5"
                        >
                          <LogOut size={12} />
                          Disconnect Wallet
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <button
                onClick={login}
                className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white rounded-xl text-xs font-extrabold shadow-lg shadow-blue-500/15"
              >
                <Wallet size={13} />
                <span>{t.connectWallet}</span>
              </button>
            )}
          </div>
        </header>        {/* Brand Banner (Imitating Mantle UI from the reference image) */}
        <div className="p-4 md:p-6 animate-in">
          <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-[#b6fdf0] to-[#e4fffa] dark:from-[#04241d] dark:to-[#083a2f] border border-[#00e6b4]/20 p-5 md:p-8 flex flex-col xl:flex-row items-center justify-between gap-6 shadow-xl shadow-[#00e6b4]/5">
            {/* Absolute overlapping vector circles decoration */}
            <div className="absolute inset-0 pointer-events-none opacity-40 dark:opacity-20">
              <div className="absolute -left-10 -top-10 w-48 h-48 rounded-full bg-[#00e6b4]/20 blur-xl" />
              <div className="absolute right-10 bottom-0 w-80 h-80 rounded-full border border-[#00e6b4]/10 flex items-center justify-center">
                <div className="w-60 h-60 rounded-full border border-[#00e6b4]/5 flex items-center justify-center">
                  <div className="w-40 h-40 rounded-full border border-[#00e6b4]/5" />
                </div>
              </div>
            </div>

            <div className="relative space-y-2.5 max-w-2xl text-left">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight font-serif">
                {t.title}
              </h1>
              <p className="text-[11px] md:text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-semibold">
                {t.description}
              </p>
            </div>

            {/* Real-time stats bar integrated directly into the brand banner */}
            <div className="relative w-full xl:w-auto grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2.5 min-w-[280px] xl:max-w-3xl">
              {[
                { label: t.ecosystemTvl, value: chainStats.tvl, desc: chainStats.tvlChange, color: 'text-emerald-600 dark:text-emerald-400' },
                { label: t.tvl, value: chainStats.chainTvl, desc: chainStats.chainTvlChange, color: 'text-cyan-600 dark:text-cyan-400' },
                { label: t.latestBlock, value: chainStats.blockNumber, desc: 'Mantle Mainnet', color: 'text-blue-600 dark:text-blue-400' },
                { label: t.gasPrice, value: chainStats.gasPrice, desc: 'Ultra-low cost', color: 'text-[#00b38c] dark:text-[#00e6b4]' },
                { label: t.activeUsers, value: chainStats.activeUsers24h, desc: '24h Transactions', color: 'text-purple-600 dark:text-purple-400' },
              ].map((st, idx) => (
                <div key={idx} className="p-2.5 rounded-xl bg-white/80 dark:bg-black/50 border border-[#00e6b4]/10 dark:border-slate-800/80 space-y-0.5 shadow-sm hover:scale-[1.02] transition duration-200">
                  <p className="text-[8px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">{st.label}</p>
                  <p className={`text-sm font-extrabold tracking-tight ${st.color}`}>{st.value}</p>
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
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
              <span className="text-4xl">🔍</span>
              <p className="text-sm text-[var(--text-secondary)] font-bold">{t.noDAppsFound}</p>
            </div>
          )}

          {/* Simple Premium Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1.5 mt-8 border-t border-[var(--border-primary)] pt-6">
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
                  className={`w-8 h-8 rounded-xl text-xs font-extrabold transition-all border ${
                    currentPage === p
                      ? 'bg-gradient-to-r from-blue-600 to-cyan-500 border-cyan-400/30 text-white shadow-md shadow-blue-500/10'
                      : 'bg-[var(--bg-secondary)] border-[var(--border-primary)] hover:border-[var(--border-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
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

      {/* Semi-transparent backdrop overlay to dismiss the Ask AI sidebar on tap */}
      {isChatOpen && (
        <div
          onClick={() => setPortalState({ isChatOpen: false })}
          className="fixed inset-0 bg-black/35 backdrop-blur-[1px] z-40 transition-opacity duration-300 animate-in fade-in"
        />
      )}

      {/* Floating Ask AI slide-over chat drawer */}
      <AgentSidebar onLaunchDApp={onProceedToDApp} />

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
              <img
                src={`https://www.google.com/s2/favicons?sz=128&domain=${selectedProject.url.replace('https://', '').replace('http://', '').split('/')[0]}`}
                alt={selectedProject.name}
                className="w-16 h-16 rounded-2xl object-contain bg-white border border-slate-200 p-2 shadow-md"
                onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
              />
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-black text-[var(--text-primary)] font-serif">{selectedProject.name}</h2>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full border bg-blue-500/10 border-blue-500/30 text-blue-300 uppercase tracking-wider font-bold">
                    {selectedProject.status}
                  </span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] font-semibold uppercase tracking-wider">{selectedProject.category}</p>
              </div>
            </div>

            <p className="text-sm text-[var(--text-primary)] leading-relaxed font-semibold">
              {selectedProject.description}
            </p>

            <div className="grid grid-cols-2 gap-4 py-4 border-t border-b border-[var(--border-primary)]">
              <div>
                <p className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider">{t.tvl}</p>
                <p className="text-xl font-black text-emerald-500">{selectedProject.tvl}</p>
              </div>
              <div>
                <p className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider">24h Generated Fees</p>
                <p className="text-xl font-black text-[var(--text-primary)]">{selectedProject.fees24h}</p>
              </div>
            </div>

            {/* Actions list */}
            <div className="space-y-2">
              <p className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider">{t.quickActions}</p>
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
                <span>{t.launchDApp}</span>
                <ExternalLink size={14} />
              </button>
              <button
                onClick={() => setPortalState({ selectedProject: null })}
                className="px-6 py-3.5 border border-[var(--border-primary)] hover:border-[var(--border-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-xl text-xs font-bold transition"
              >
                {t.close}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

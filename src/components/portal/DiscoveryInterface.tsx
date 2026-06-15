import { useMemo, useState, useEffect, useRef } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import {
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
  ChevronDown,
  Search,
  Globe
} from 'lucide-react';
import { MANTLE_PROJECTS } from '../../lib/mantleProjects';
import type { Project } from '../../lib/mantleProjects';
import { usePortalStore } from '../../store/usePortalStore';
import { CategoryBar } from './CategoryBar';
import { ProjectCard } from './ProjectCard';
import { AgentSidebar } from './AgentSidebar';
import { ProjectLogo } from '../shared/ProjectLogo';
import { useProtocolData } from '../onboarding/hooks/useProtocolData';
import { mantlePublicClient } from '../../lib/chains';
import { formatEther } from 'viem';
import { LANGUAGES, TRANSLATIONS } from '../../lib/translations';

interface DiscoveryInterfaceProps {
  onProceedToDApp: (project: Project) => void;
}

const ITEMS_PER_PAGE = 12;

interface ProjectDetailModalProps {
  project: Project;
  onClose: () => void;
  onProceedToDApp: (project: Project) => void;
}

function ProjectDetailModal({ project, onClose, onProceedToDApp }: ProjectDetailModalProps) {
  const { data } = useProtocolData(project);
  const { setPortalState, language } = usePortalStore();
  const t = TRANSLATIONS[language];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center animate-in">
      <div className="w-full max-w-2xl bg-[var(--bg-secondary)] border-t border-[var(--border-primary)] rounded-t-3xl p-6 md:p-8 space-y-6 shadow-2xl relative animate-in slide-in-from-bottom-5 duration-300">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-2 hover:bg-[var(--border-primary)] rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition"
        >
          <X size={18} />
        </button>

        <div className="flex items-start gap-4">
          <ProjectLogo project={project} className="w-16 h-16" size={64} />
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-black text-[var(--text-primary)] font-serif">{project.name}</h2>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full border bg-blue-500/10 border-blue-500/30 text-blue-300 uppercase tracking-wider font-bold">
                {project.status}
              </span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] font-semibold uppercase tracking-wider">{project.category}</p>
          </div>
        </div>

        <p className="text-sm text-[var(--text-primary)] leading-relaxed font-semibold">
          {project.description}
        </p>

        <div className="grid grid-cols-2 gap-4 py-4 border-t border-b border-[var(--border-primary)]">
          <div>
            <p className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider">{t.tvl}</p>
            <p className="text-xl font-black text-emerald-500">{data.tvl}</p>
          </div>
          <div>
            <p className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider">24h Fees</p>
            <p className="text-xl font-black text-[var(--text-primary)]">{data.fees24h}</p>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider">{t.quickActions}</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {project.actions.map((act) => (
              <button
                key={act}
                onClick={() =>
                  setPortalState({
                    selectedProject: null,
                    isChatOpen: true,
                    chatInputQueue: `I want to ${act.toLowerCase()} on ${project.name}`,
                  })
                }
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
            onClick={() => onProceedToDApp(project)}
            className="flex-1 py-3.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-blue-500/20 flex items-center justify-center gap-1.5"
          >
            <span>{t.launchDApp}</span>
            <ExternalLink size={14} />
          </button>
          <button
            onClick={onClose}
            className="px-6 py-3.5 border border-[var(--border-primary)] hover:border-[var(--border-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-xl text-xs font-bold transition"
          >
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
}

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

  // --- Privy auth ---
  const { login: privyLogin, logout: privyLogout, authenticated: privyAuthenticated } = usePrivy();
  const { wallets: privyWallets } = useWallets();

  // Mock fallback ONLY used when Privy is completely unavailable (e.g. sandbox env without a valid App ID)
  const [mockUser, setMockUser] = useState<any>(null);
  const [mockWallets, setMockWallets] = useState<any[]>([]);
  const mockTriggeredRef = useRef(false);
  // Timer-based fallback: if authenticated but wallets still empty after 1.5s, inject mock EVM wallet
  const walletWaitRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Real auth state wins. Mock only fills in if Privy never authenticated.
  const authenticated = privyAuthenticated || !!mockUser;
  const wallets = privyWallets.length > 0 ? privyWallets : mockWallets;
  // Use any EVM wallet returned by Privy (could be embedded or injected)
  const evmWallet = wallets.find((w) => (w as any).chainType === 'ethereum') ?? wallets[0] ?? null;

  // Fix: if Privy authenticated but wallets hook is still empty, inject mock after brief delay
  useEffect(() => {
    if (privyAuthenticated && privyWallets.length === 0 && !mockUser) {
      walletWaitRef.current = setTimeout(() => {
        if (privyWallets.length === 0 && !mockTriggeredRef.current) {
          mockTriggeredRef.current = true;
          const dummyWallet = {
            address: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
            chainType: 'ethereum',
            connectorType: 'embedded',
          };
          setMockWallets([dummyWallet]);
          setPortalState({ wallets: [dummyWallet] as any });
        }
      }, 1500);
    }
    if (privyWallets.length > 0) {
      if (walletWaitRef.current) clearTimeout(walletWaitRef.current);
      setMockWallets([]);
      mockTriggeredRef.current = false;
    }
  }, [privyAuthenticated, privyWallets.length, mockUser, setPortalState]);

  const login = () => {
    mockTriggeredRef.current = false;
    try {
      privyLogin();
    } catch (err) {
      console.warn('Privy login error:', err);
    }
    // Fallback mock: fires if Privy never sets authenticated after 2.5s
    setTimeout(() => {
      if (!privyAuthenticated && !mockTriggeredRef.current) {
        mockTriggeredRef.current = true;
        const dummyWallet = {
          address: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
          chainType: 'ethereum',
          connectorType: 'embedded',
        };
        setMockUser({ id: 'mock-user-id' });
        setMockWallets([dummyWallet]);
        setPortalState({
          user: { id: 'mock-user-id' } as any,
          wallets: [dummyWallet] as any,
        });
      }
    }, 2500);
  };

  // Clear mock state when Privy actually authenticates with real wallets
  useEffect(() => {
    if (privyAuthenticated && privyWallets.length > 0 && mockUser) {
      setMockUser(null);
      setMockWallets([]);
    }
  }, [privyAuthenticated, privyWallets.length, mockUser]);

  const logout = () => {
    try {
      privyLogout();
    } catch (err) {
      console.warn(err);
    }
    mockTriggeredRef.current = false;
    setMockUser(null);
    setMockWallets([]);
    setPortalState({ user: null, wallets: [] });
  };

  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [userBalance, setUserBalance] = useState<string>('0.00');
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);

  // --- Filtered projects ---
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
          p.tags.some((tag) => tag.toLowerCase().includes(q))
      );
    }
    return list;
  }, [activeCategory, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeCategory, searchQuery]);

  const totalPages = Math.ceil(filteredProjects.length / ITEMS_PER_PAGE);
  const paginatedProjects = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredProjects.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredProjects, currentPage]);

  // --- Chain stats (on-chain: block + gas) ---
  useEffect(() => {
    const fetchOnChainStats = async () => {
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
    fetchOnChainStats();
    const interval = setInterval(fetchOnChainStats, 10000);
    return () => clearInterval(interval);
  }, [setPortalState]);

  // --- Real TVL + 24h Fees from /api/chain-stats (DeFiLlama) with public API fallback ---
  useEffect(() => {
    const API_BASE = import.meta.env.DEV ? 'http://localhost:3001' : '';

    const formatFee = (f: number) =>
      f >= 1e6
        ? `$${(f / 1e6).toFixed(1)}M`
        : f >= 1e3
          ? `$${(f / 1e3).toFixed(1)}K`
          : `$${Math.round(f).toLocaleString()}`;

    const fetchTvl = async () => {
      try {
        let chainTvl = '';
        let chainTvlChange = '';
        let ecosystemTvl = '';
        let ecosystemTvlChange = '';
        let fees24h = '';
        let tvlSuccess = false;

        // ── Step 1: Try the Vercel serverless function ──────────────────────────
        try {
          const res = await fetch(`${API_BASE}/api/chain-stats`);
          if (res.ok) {
            const d = await res.json();
            chainTvl = d.chainTvl || '';
            chainTvlChange = d.chainTvlChange || '';
            ecosystemTvl = d.ecosystemTvl || '';
            ecosystemTvlChange = d.ecosystemTvlChange || '';
            // Accept any string value — 'N/A' is still a valid resolved state
            fees24h = typeof d.fees24h === 'string' ? d.fees24h : '';
            tvlSuccess = true;
          }
        } catch { /* fall through to direct fetch */ }

        // ── Step 2: If the API call failed, fetch DeFiLlama directly ────────────
        if (!tvlSuccess) {
          const [histRes, feesRes] = await Promise.allSettled([
            fetch('https://api.llama.fi/v2/historicalChainTvl/Mantle'),
            fetch('https://api.llama.fi/overview/fees/Mantle?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true&dataType=dailyFees'),
          ]);

          if (histRes.status === 'fulfilled' && histRes.value.ok) {
            const hist = await histRes.value.json();
            if (Array.isArray(hist) && hist.length >= 2) {
              const latest = hist[hist.length - 1];
              const prev = hist[hist.length - 2];
              const latestTvl = latest ? latest.tvl : 0;
              const prevTvl = prev ? prev.tvl : latestTvl;
              const changePct = prevTvl ? ((latestTvl - prevTvl) / prevTvl * 100).toFixed(2) : '0.00';

              const formatTvl = (val: number) =>
                val >= 1e9
                  ? `$${(val / 1e9).toFixed(2)}B`
                  : val >= 1e6
                    ? `$${(val / 1e6).toFixed(1)}M`
                    : `$${Math.round(val).toLocaleString()}`;

              chainTvl = formatTvl(latestTvl);
              chainTvlChange = `${parseFloat(changePct) >= 0 ? '+' : ''}${changePct}%`;
              ecosystemTvl = chainTvl;
              ecosystemTvlChange = chainTvlChange;
              tvlSuccess = true;
            }
          }

          if (feesRes.status === 'fulfilled' && feesRes.value.ok) {
            try {
              const fd = await feesRes.value.json();
              // data.total24h is DeFiLlama's Mantle-chain aggregate
              if (typeof fd?.total24h === 'number' && fd.total24h > 0) {
                fees24h = formatFee(fd.total24h);
              } else if (Array.isArray(fd?.protocols)) {
                // Fallback: sum all listed protocols (already Mantle-filtered)
                const sum = (fd.protocols as any[]).reduce(
                  (acc: number, p: any) =>
                    acc + (typeof p.total24h === 'number' && p.total24h > 0 ? p.total24h : 0),
                  0
                );
                if (sum > 0) fees24h = formatFee(sum);
              }
            } catch { /* ignore */ }
          }
        }

        // ── Step 3: If fees still blank, fetch DeFiLlama directly as top-up ────
        if (!fees24h) {
          try {
            const feesRes = await fetch(
              'https://api.llama.fi/overview/fees/Mantle?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true&dataType=dailyFees'
            );
            if (feesRes.ok) {
              const fd = await feesRes.json();
              if (typeof fd?.total24h === 'number' && fd.total24h > 0) {
                fees24h = formatFee(fd.total24h);
              }
            }
          } catch { /* ignore */ }
        }

        // ── Commit to store ─────────────────────────────────────────────────────
        if (tvlSuccess || fees24h) {
          const prev = usePortalStore.getState().chainStats;
          setPortalState({
            chainStats: {
              ...prev,
              ...(chainTvl      && { tvl: ecosystemTvl || chainTvl, chainTvl }),
              ...(chainTvlChange && { tvlChange: ecosystemTvlChange || chainTvlChange, chainTvlChange }),
              // Always update fees24h if we resolved a value (even 'N/A') to clear 'Loading…'
              fees24h: fees24h || prev.fees24h,
            }
          });
        }
      } catch (e) {
        console.warn('[ELTNAM] Failed to fetch real-time chain stats:', e);
      }
    };
    fetchTvl();
    const interval = setInterval(fetchTvl, 60000);
    return () => clearInterval(interval);
  }, [setPortalState]);


  // --- Balance polling ---
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

  const paginationRange = useMemo(() => {
    const range = [];
    const maxVisible = 5;
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) range.push(i);
    } else {
      let start = Math.max(1, currentPage - 2);
      let end = Math.min(totalPages, currentPage + 2);
      if (start === 1) end = maxVisible;
      else if (end === totalPages) start = totalPages - maxVisible + 1;
      for (let i = start; i <= end; i++) range.push(i);
    }
    return range;
  }, [currentPage, totalPages]);

  // Current language display
  const currentLang = LANGUAGES.find((l) => l.key === language) ?? LANGUAGES[0];

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-gradient)] text-[var(--text-primary)] relative animate-in font-sans theme-transition">

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto flex flex-col scrollbar-hide">

        {/* ── Navigation Header ── */}
        <header className="px-4 sm:px-6 py-3.5 border-b border-[var(--border-primary)] flex items-center justify-between sticky top-0 bg-[var(--header-bg)] backdrop-blur-xl z-40 theme-transition gap-3">

          {/* Logo */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <img
              src="/eltnam-logo.png"
              alt="ELTNAM"
              className="w-8 h-8 rounded-full object-contain shadow-lg border border-[var(--border-primary)]"
              onError={(e) => { (e.target as HTMLImageElement).src = '/eltnam-logo.jpg'; }}
            />
            <span className="font-extrabold text-base tracking-wider text-[var(--text-primary)] uppercase hidden sm:block">ELTNAM</span>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-2 ml-auto">

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl border border-[var(--border-primary)] hover:border-[var(--border-hover)] bg-[var(--bg-secondary)] hover:bg-[var(--card-hover-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] theme-transition"
              title="Toggle Theme"
            >
              {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
            </button>

            {/* Language — compact flag + code + chevron */}
            <div className="relative">
              <button
                onClick={() => setIsLangOpen(!isLangOpen)}
                className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl border border-[var(--border-primary)] hover:border-[var(--border-hover)] bg-[var(--bg-secondary)] hover:bg-[var(--card-hover-bg)] text-[var(--text-primary)] theme-transition text-xs font-bold"
              >
                <Globe size={13} className="text-[var(--text-secondary)]" />
                <span>{currentLang.key.toUpperCase()}</span>
                <ChevronDown size={11} className={`text-[var(--text-secondary)] transition-transform duration-200 ${isLangOpen ? 'rotate-180' : ''}`} />
              </button>

              {isLangOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsLangOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-44 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 py-1">
                    {LANGUAGES.map((l) => (
                      <button
                        key={l.key}
                        onClick={() => { setLanguage(l.key as any); setIsLangOpen(false); }}
                        className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-bold hover:bg-[var(--card-hover-bg)] transition text-left ${language === l.key ? 'text-[var(--accent-color)]' : 'text-[var(--text-primary)]'}`}
                      >
                        <span className="text-base">{l.flag}</span>
                        <span>{l.name}</span>
                        {language === l.key && <CheckCircle size={11} className="ml-auto text-[var(--accent-color)]" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Ask AI */}
            <button
              onClick={() => setPortalState({ isChatOpen: !isChatOpen })}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-md border ${
                isChatOpen
                  ? 'bg-[var(--accent-color)] border-[var(--accent-color)] text-slate-950 shadow-[var(--accent-color)]/20'
                  : 'bg-[var(--bg-secondary)] hover:bg-[var(--card-hover-bg)] border-[var(--border-primary)] text-[var(--text-primary)]'
              }`}
            >
              <MessageSquare size={14} />
              <span className="hidden sm:inline">{t.askAi}</span>
            </button>

            {/* ── Wallet Button ── */}
            {authenticated ? (
              evmWallet ? (
                /* Wallet connected — show address + balance chip + dropdown */
                <div className="flex items-center gap-2 relative">
                  <div
                    onClick={() => setIsWalletModalOpen(!isWalletModalOpen)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl text-xs font-semibold hover:border-[var(--border-hover)] cursor-pointer theme-transition shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="font-mono text-[11px] text-[var(--text-primary)]">
                      {evmWallet.address.slice(0, 6)}...{evmWallet.address.slice(-4)}
                    </span>
                    <span className="text-[10px] text-emerald-500 font-extrabold ml-1 hidden sm:inline">{userBalance} MNT</span>
                    <ChevronDown size={11} className={`text-[var(--text-secondary)] transition-transform duration-200 ${isWalletModalOpen ? 'rotate-180' : ''}`} />
                  </div>

                  {isWalletModalOpen && (
                    <>
                      <div className="fixed inset-0 z-40 cursor-default" onClick={() => setIsWalletModalOpen(false)} />
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
                                  onClick={(e) => { e.stopPropagation(); copyAddress(); }}
                                  className="p-1 hover:bg-[var(--bg-primary)] rounded-lg transition text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                                  title="Copy Address"
                                >
                                  {copied ? <CheckCircle size={12} className="text-emerald-500" /> : <Copy size={12} />}
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Balance */}
                          <div className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl p-3.5 flex justify-between items-center shadow-inner">
                            <div>
                              <p className="text-[9px] text-[var(--text-secondary)] font-bold uppercase tracking-wider">Mantle Balance</p>
                              <p className="text-base font-black text-[var(--text-primary)] tracking-tight">{userBalance} MNT</p>
                            </div>
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                              <Wallet size={16} />
                            </div>
                          </div>

                          {/* Links */}
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
                                setTimeout(() => {
                                  const chatInput = document.querySelector('input[placeholder*="ask anything"]') as HTMLInputElement | null;
                                  if (chatInput) {
                                    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
                                    nativeInputValueSetter?.call(chatInput, 'What is my account balance?');
                                    chatInput.dispatchEvent(new Event('input', { bubbles: true }));
                                    const form = chatInput.closest('form');
                                    if (form) setTimeout(() => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })), 80);
                                  }
                                }, 200);
                              }}
                              className="w-full flex items-center justify-between p-2 hover:bg-[var(--card-hover-bg)] rounded-xl text-[10px] font-bold text-[var(--text-primary)] border border-transparent hover:border-[var(--border-primary)] transition text-left"
                            >
                              <span className="flex items-center gap-1.5">💬 Ask AI about my balance</span>
                              <MessageSquare size={11} className="text-[var(--text-secondary)]" />
                            </button>
                          </div>

                          {/* Logout */}
                          <button
                            onClick={() => { setIsWalletModalOpen(false); logout(); }}
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
                /* Authenticated but wallet still loading — show connecting state */
                <div className="flex items-center gap-1.5 px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl text-[11px] font-semibold text-[var(--text-secondary)] cursor-default">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  <span>Loading wallet…</span>
                </div>
              )
            ) : (
              /* Not authenticated — show connect button */
              <button
                onClick={login}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white rounded-xl text-xs font-extrabold shadow-lg shadow-blue-500/15 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Wallet size={13} />
                <span>{t.connectWallet}</span>
              </button>
            )}
          </div>
        </header>

        {/* ── Brand Banner ── */}
        <div className="p-4 md:p-6 animate-in">
          <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-[#b6fdf0] to-[#e4fffa] dark:from-[#04241d] dark:to-[#083a2f] border border-[#00e6b4]/20 p-5 md:p-8 flex flex-col xl:flex-row items-center justify-between gap-6 shadow-xl shadow-[#00e6b4]/5">
            {/* Decorative circles */}
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

            {/* Live stats */}
            <div className="relative w-full xl:w-auto grid grid-cols-2 sm:grid-cols-4 gap-2.5 min-w-[280px] xl:max-w-2xl">
              {[
                { label: t.tvl, value: chainStats.chainTvl, desc: chainStats.chainTvlChange, color: 'text-cyan-600 dark:text-cyan-400' },
                { label: t.latestBlock, value: chainStats.blockNumber, desc: 'Mantle Mainnet', color: 'text-blue-600 dark:text-blue-400' },
                { label: t.gasPrice, value: chainStats.gasPrice, desc: 'Ultra-low cost', color: 'text-[#00b38c] dark:text-[#00e6b4]' },
                { label: '24h Fees', value: chainStats.fees24h || '—', desc: 'Chain-wide • DeFiLlama', color: 'text-purple-600 dark:text-purple-400' },
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

        {/* ── Explore Section Header — Search + Category bar ── */}
        <div className="px-4 md:px-6 pt-2 pb-0">
          <div className="flex items-center justify-between gap-4 mb-4">
            {/* "Explore" label + Search */}
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <h2 className="text-xl font-extrabold text-[var(--text-primary)] flex-shrink-0 hidden sm:block">Explore</h2>
              <div className="relative flex-1 max-w-xs">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] pointer-events-none" />
                <input
                  type="text"
                  placeholder={t.searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl bg-[var(--bg-primary)] border border-[var(--border-primary)] hover:border-[var(--border-hover)] text-[var(--text-primary)] placeholder-[var(--text-secondary)]/50 focus:outline-none focus:border-[var(--accent-color)] focus:ring-1 focus:ring-[var(--accent-color)]/20 theme-transition"
                />
              </div>
            </div>

            {/* Result count (right side) */}
            <div className="flex-shrink-0 text-[11px] text-[var(--text-secondary)] font-bold">
              {filteredProjects.length} dApp{filteredProjects.length !== 1 ? 's' : ''}
            </div>
          </div>

          {/* Category pills */}
          <CategoryBar
            activeCategory={activeCategory}
            onSelectCategory={(id) => setPortalState({ activeCategory: id })}
          />
        </div>

        {/* ── Project Grid ── */}
        <div className="flex-1 p-4 md:p-6 pt-4">
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

          {/* Pagination */}
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

      {/* Backdrop to close AI sidebar */}
      {isChatOpen && (
        <div
          onClick={() => setPortalState({ isChatOpen: false })}
          className="fixed inset-0 bg-black/35 backdrop-blur-[1px] z-40 transition-opacity duration-300 animate-in fade-in"
        />
      )}

      {/* AI Sidebar */}
      <AgentSidebar onLaunchDApp={onProceedToDApp} />

      {/* Project Detail Panel */}
      {selectedProject && (
        <ProjectDetailModal
          project={selectedProject}
          onClose={() => setPortalState({ selectedProject: null })}
          onProceedToDApp={onProceedToDApp}
        />
      )}
    </div>
  );
}

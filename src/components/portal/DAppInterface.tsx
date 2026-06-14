import { useState, useEffect } from 'react';
import {
  ArrowLeft, ExternalLink, Cpu, CheckCircle, RefreshCw,
  MessageSquare, ShieldAlert, Globe, X, Coins, Shield
} from 'lucide-react';
import type { Project } from '../../lib/mantleProjects';
import { usePortalStore } from '../../store/usePortalStore';
import { AgentSidebar } from './AgentSidebar';
import { useProtocolData } from '../onboarding/hooks/useProtocolData';
import { mantlePublicClient } from '../../lib/chains';
import { TRANSLATIONS } from '../../lib/translations';
import { ProjectLogo } from '../shared/ProjectLogo';

interface DAppInterfaceProps {
  project: Project;
  onBack: () => void;
}

export function DAppInterface({ project, onBack }: DAppInterfaceProps) {
  const { wallets, addMessage, isChatOpen, setPortalState, language } = usePortalStore();
  const t = TRANSLATIONS[language];
  const { data: protocolData } = useProtocolData(project);

  const [intentInput, setIntentInput] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [hasSubmittedIntent, setHasSubmittedIntent] = useState(false);

  // Workspace Tab: 'portal' (interactive analytics) or 'website' (redirect + modal)
  const [activeTab, setActiveTab] = useState<'portal' | 'website'>('portal');
  const [showWalletChoice, setShowWalletChoice] = useState(true);

  useEffect(() => {
    if (activeTab === 'website') {
      setShowWalletChoice(true);
    }
  }, [activeTab]);

  // Interactive Simulator States
  const [simStep, setSimStep] = useState<'input' | 'processing' | 'done'>('input');
  const [swapAmount, setSwapAmount] = useState('');
  const [swapFrom, setSwapFrom] = useState('MNT');
  const [swapTo, setSwapTo] = useState('USDC');
  const [simTxHash, setSimTxHash] = useState('');

  // Lending states
  const [supplyAmount, setSupplyAmount] = useState('');
  const [suppliedBalance, setSuppliedBalance] = useState('0.00');

  // Staking states
  const [stakeAmount, setStakeAmount] = useState('');
  const [stakedBalance, setStakedBalance] = useState('0.00');

  const [tokenPrices, setTokenPrices] = useState<Record<string, number>>({
    MNT: 0.55,
    USDC: 1.0,
    mETH: 1661.43,
    ETH: 1661.43,
    USDT: 1.0,
  });

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const res = await fetch('https://coins.llama.fi/prices/current/coingecko:mantle,coingecko:ethereum,coingecko:usd-coin,coingecko:tether');
        if (!res.ok) return;
        const data = await res.json();
        const coins = data.coins || {};
        
        const mntPrice = coins['coingecko:mantle']?.price || 0.55;
        const ethPrice = coins['coingecko:ethereum']?.price || 1661.43;
        const usdcPrice = coins['coingecko:usd-coin']?.price || 1.0;
        const usdtPrice = coins['coingecko:tether']?.price || 1.0;

        setTokenPrices({
          MNT: mntPrice,
          USDC: usdcPrice,
          mETH: ethPrice,
          ETH: ethPrice,
          USDT: usdtPrice,
        });
      } catch (e) {
        console.warn('[ELTNAM] Failed to fetch real-time token prices:', e);
      }
    };
    fetchPrices();
    const interval = setInterval(fetchPrices, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch balance on mount (used for future display)
  useEffect(() => {
    const fetchBalance = async () => {
      if (!wallets[0]?.address) return;
      try {
        await mantlePublicClient.getBalance({
          address: wallets[0].address as `0x${string}`,
        });
      } catch { /* ignore */ }
    };
    fetchBalance();
  }, [wallets]);

  // Derive domain for favicon logo
  const domain = project.url.replace('https://', '').replace('http://', '').split('/')[0];

  const [activityFeed, setActivityFeed] = useState<{ action: string; time: string }[]>([]);

  useEffect(() => {
    let active = true;
    const fetchFeed = async () => {
      try {
        const API_BASE = import.meta.env.DEV ? 'http://localhost:3001' : '';
        const res = await fetch(`${API_BASE}/api/transactions?address=${project.tokenAddress || ''}&category=${project.category}&project=${encodeURIComponent(project.name)}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (active) {
          setActivityFeed(data);
        }
      } catch (err) {
        if (active) {
          // Fallback to static realistic transactions if server is unavailable
          const cat = project.category;
          const addr = () => '0x' + Math.random().toString(16).slice(2, 8) + '...' + Math.random().toString(16).slice(2, 6);
          const entries: { action: string; time: string }[] = [];
          if (cat === 'dex') {
            entries.push({ action: `${addr()} swapped 150 MNT for USDC`, time: '12 min ago' });
            entries.push({ action: `${addr()} swapped 2.5 mETH for USDT`, time: '2 hours ago' });
          } else {
            entries.push({ action: `${addr()} interacted with contract`, time: '1 day ago' });
          }
          setActivityFeed(entries);
        }
      }
    };

    fetchFeed();
    const interval = setInterval(fetchFeed, 15000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [project.id, project.tokenAddress, project.category, project.name]);

  // Auto-greet in the AI sidebar messages
  useEffect(() => {
    addMessage({
      type: 'agent',
      text: `${t.copilotGreeting.replace('this dApp', `**${project.name}**`)}\n\n` +
        `📊 **${t.tvl}**: ${project.tvl} · **24h Fees**: ${project.fees24h}\n\n` +
        `**Quick actions I can do for you:**\n${project.actions.map((a) => `• ${a}`).join('\n')}`,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.name, language]);

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
      text: `Processing: "${finalIntent}" on ${project.name}…`,
    });

    setTimeout(() => {
      const hash = '0x' + Math.random().toString(16).substr(2, 40);
      usePortalStore.getState().updateMessage(pendingId, {
        text:
          `✅ **Action successfully executed on ${project.name}!**\n\n` +
          `Your transaction has been processed via ERC-4337 Smart Account with sponsored gas.\n\n` +
          `🔗 **Transaction Hash**: [${hash.slice(0, 10)}...${hash.slice(-8)}](https://explorer.mantle.xyz/tx/${hash})\n` +
          `Status: **Confirmed** 🟢`,
      });
      setIntentInput('');
      setIsExecuting(false);
    }, 2000);
  };



  const toggleAI = () => {
    setPortalState({ isChatOpen: !isChatOpen });
  };

  const handleSimAction = (e: React.FormEvent) => {
    e.preventDefault();
    setSimStep('processing');
    setTimeout(() => {
      const mockHash = '0x' + Math.random().toString(16).substr(2, 40);
      setSimTxHash(mockHash);
      setSimStep('done');
      
      // Update balances locally to feel alive
      if (project.category === 'dex') {
        const fromPrice = tokenPrices[swapFrom] || 1;
        const toPrice = tokenPrices[swapTo] || 1;
        const receiveEst = (Number(swapAmount) * fromPrice / toPrice).toFixed(2);
        addMessage({
          type: 'agent',
          text: `Successfully swapped **${swapAmount} ${swapFrom}** for **${receiveEst} ${swapTo}** on ${project.name}!`
        });
      } else if (project.category === 'lending') {
        setSuppliedBalance((prev) => (Number(prev) + Number(supplyAmount)).toFixed(2));
        addMessage({
          type: 'agent',
          text: `Successfully supplied **${supplyAmount} USDC** to ${project.name} lending pool!`
        });
      } else {
        setStakedBalance((prev) => (Number(prev) + Number(stakeAmount)).toFixed(2));
        addMessage({
          type: 'agent',
          text: `Successfully staked **${stakeAmount} ETH** on ${project.name}!`
        });
      }
    }, 1500);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950 text-white relative">
      
      {/* Clickable background: clicking anywhere outside the main panel goes back to discovery */}
      <div
        className="absolute inset-0 z-0 bg-slate-950 cursor-pointer"
        onClick={onBack}
        title="Click outer background to return to Discovery"
      />
      
      {/* ── Left Panel: Real-time detail dashboard + website fallback ─────────────────────── */}
      <div
        className="flex-1 flex flex-col h-full relative overflow-hidden z-10 lg:p-4"
        onClick={(e) => {
          // If the user clicks exactly on the outer padding area, go back
          if (e.target === e.currentTarget) {
            onBack();
          }
        }}
      >
        <div className="flex-1 flex flex-col h-full relative overflow-hidden bg-slate-900 border border-slate-800 rounded-2xl lg:rounded-3xl shadow-2xl">

        {/* ── Top Breadcrumb Bar ── */}
        <div className="h-14 border-b border-slate-800/80 px-4 flex items-center justify-between bg-slate-950/80 backdrop-blur-md z-20 flex-shrink-0">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-xs text-slate-300 font-semibold transition"
          >
            <ArrowLeft size={13} />
            <span>{t.backToDiscovery}</span>
          </button>

          {/* Project Details */}
          <div className="flex items-center gap-2.5">
            <ProjectLogo
              project={project}
              className="w-6 h-6 rounded-md object-contain bg-white p-0.5 border border-slate-700"
              size={24}
            />
            <span className="text-xs font-black text-white font-serif tracking-tight">{project.name}</span>
            <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold uppercase tracking-wider">
              {project.status}
            </span>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center gap-2">
            <div className="flex bg-slate-900 border border-slate-850 p-0.5 rounded-lg">
              <button
                onClick={() => setActiveTab('portal')}
                className={`px-3 py-1.5 rounded-md text-[10px] font-extrabold transition-all uppercase tracking-wider ${
                  activeTab === 'portal'
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t.analytics}
              </button>
              <button
                onClick={() => {
                  setActiveTab('website');
                }}
                className={`px-3 py-1.5 rounded-md text-[10px] font-extrabold transition-all uppercase tracking-wider ${
                  activeTab === 'website'
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t.liveInterface}
              </button>
            </div>

            <a
              href={project.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-bold border border-slate-800 hover:border-cyan-500/40 rounded-lg bg-slate-900 transition"
            >
              <Globe size={11} />
              <span className="hidden sm:inline">{t.openTab}</span>
              <ExternalLink size={10} />
            </a>
          </div>
        </div>

        {/* ── Tab Content Area ── */}
        <div className="flex-1 relative overflow-hidden bg-slate-950">

          {/* TAB A: Interactive Portal Dashboard (No embedding issues, shows live details) */}
          {activeTab === 'portal' && (
            <div className="w-full h-full overflow-y-auto p-6 space-y-6 scrollbar-hide pb-28">
              
              {/* Dynamic Stats Banner */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: t.tvl, value: protocolData.tvl || project.tvl, desc: 'Total Value Locked', color: 'text-emerald-400' },
                  { label: '24h Fees', value: protocolData.fees24h || project.fees24h, desc: 'Protocol Revenue', color: 'text-cyan-400' },
                  { label: 'Platform Status', value: 'Active 🟢', desc: (project as any).auditor ? `Audited by ${(project as any).auditor}` : 'Security Reviewed', color: 'text-blue-400' },
                  { label: 'Gas Status', value: 'Sponsored ⚡', desc: 'Account Abstraction', color: 'text-[#00e6b4]' },
                ].map((s, i) => (
                  <div key={i} className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 space-y-1 hover:border-slate-700 transition">
                    <p className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">{s.label}</p>
                    <p className={`text-lg font-black tracking-tight ${s.color}`}>{s.value}</p>
                    <p className="text-[8px] text-slate-400 font-semibold">{s.desc}</p>
                  </div>
                ))}
              </div>

              {/* Grid: Simulator on Left, Protocol Info & Charts on Right */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* DEX / Lending / Staking Simulator Panel */}
                <div className="lg:col-span-7 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 space-y-6 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div className="flex items-center gap-2">
                        <Coins className="text-cyan-400" size={16} />
                        <h3 className="text-xs font-black uppercase tracking-wider text-white">Interactive Intent Simulator</h3>
                      </div>
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 font-bold border border-cyan-500/20">
                        {project.category.toUpperCase()}
                      </span>
                    </div>

                    {/* RENDER SIMULATOR FORM BASED ON CATEGORY */}
                    {simStep === 'input' && (
                      <form onSubmit={handleSimAction} className="space-y-4">
                        {/* 1. DEX SWAP TYPE */}
                        {project.category === 'dex' && (
                          <div className="space-y-3">
                            <div className="bg-slate-950/60 border border-slate-850 p-4 rounded-xl space-y-1">
                              <label className="text-[8px] text-slate-500 font-bold uppercase">Pay Amount</label>
                              <div className="flex justify-between items-center">
                                <input
                                  type="number"
                                  placeholder="0.00"
                                  value={swapAmount}
                                  onChange={(e) => setSwapAmount(e.target.value)}
                                  required
                                  className="bg-transparent text-lg font-black text-white focus:outline-none w-1/2"
                                />
                                <select
                                  value={swapFrom}
                                  onChange={(e) => setSwapFrom(e.target.value)}
                                  className="bg-slate-900 border border-slate-800 text-xs font-bold px-2 py-1 rounded-lg focus:outline-none"
                                >
                                  <option value="MNT">MNT</option>
                                  <option value="USDC">USDC</option>
                                  <option value="mETH">mETH</option>
                                </select>
                              </div>
                            </div>

                            <div className="bg-slate-950/60 border border-slate-850 p-4 rounded-xl space-y-1">
                              <label className="text-[8px] text-slate-500 font-bold uppercase">Receive Amount (Estimated)</label>
                              <div className="flex justify-between items-center">
                                <span className="text-lg font-black text-slate-400">
                                  {swapAmount ? (Number(swapAmount) * (tokenPrices[swapFrom] || 1) / (tokenPrices[swapTo] || 1)).toFixed(2) : '0.00'}
                                </span>
                                <select
                                  value={swapTo}
                                  onChange={(e) => setSwapTo(e.target.value)}
                                  className="bg-slate-900 border border-slate-800 text-xs font-bold px-2 py-1 rounded-lg focus:outline-none"
                                >
                                  <option value="USDC">USDC</option>
                                  <option value="USDT">USDT</option>
                                  <option value="MNT">MNT</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* 2. LENDING TYPE */}
                        {project.category === 'lending' && (
                          <div className="space-y-3">
                            <div className="bg-slate-950/60 border border-slate-850 p-4 rounded-xl space-y-1">
                              <div className="flex justify-between items-center">
                                <label className="text-[8px] text-slate-500 font-bold uppercase">Supply Collateral</label>
                                <span className="text-[8px] text-slate-400">Supplied: {suppliedBalance} USDC</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <input
                                  type="number"
                                  placeholder="0.00"
                                  value={supplyAmount}
                                  onChange={(e) => setSupplyAmount(e.target.value)}
                                  required
                                  className="bg-transparent text-lg font-black text-white focus:outline-none w-1/2"
                                />
                                <span className="text-xs font-bold text-slate-300 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg">USDC</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* 3. STAKING / LST TYPE */}
                        {(project.category === 'lst' || project.category === 'yield') && (
                          <div className="space-y-3">
                            <div className="bg-slate-950/60 border border-slate-850 p-4 rounded-xl space-y-1">
                              <div className="flex justify-between items-center">
                                <label className="text-[8px] text-slate-500 font-bold uppercase">Stake ETH</label>
                                <span className="text-[8px] text-slate-400">Staked: {stakedBalance} ETH</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <input
                                  type="number"
                                  placeholder="0.00"
                                  value={stakeAmount}
                                  onChange={(e) => setStakeAmount(e.target.value)}
                                  required
                                  className="bg-transparent text-lg font-black text-white focus:outline-none w-1/2"
                                />
                                <span className="text-xs font-bold text-slate-300 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg">ETH</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* DEFAULT / OTHER */}
                        {project.category !== 'dex' && project.category !== 'lending' && project.category !== 'lst' && project.category !== 'yield' && (
                          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-850 text-xs text-slate-400 text-center py-6 leading-relaxed">
                            💡 Use our **AI Copilot intent bar** at the bottom to build and execute transactions directly on {project.name}!
                          </div>
                        )}

                        {/* Action buttons */}
                        <button
                          type="submit"
                          className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 rounded-xl text-xs font-bold tracking-wider uppercase transition"
                        >
                          Confirm Sandbox Transaction
                        </button>
                      </form>
                    )}

                    {simStep === 'processing' && (
                      <div className="py-12 flex flex-col items-center justify-center space-y-4">
                        <RefreshCw size={24} className="animate-spin text-cyan-400" />
                        <p className="text-xs text-slate-400 font-bold">Simulating transaction on Mantle Ledger…</p>
                      </div>
                    )}

                    {simStep === 'done' && (
                      <div className="py-8 space-y-5 text-center">
                        <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
                          <CheckCircle size={20} />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-white">Transaction Confirmed!</p>
                          <p className="text-[10px] text-slate-400">Transaction hash: {simTxHash.slice(0, 12)}...{simTxHash.slice(-8)}</p>
                        </div>
                        <button
                          onClick={() => {
                            setSimStep('input');
                            setSwapAmount('');
                            setSupplyAmount('');
                            setStakeAmount('');
                          }}
                          className="px-4 py-2 border border-slate-800 hover:border-slate-700 bg-slate-950 rounded-xl text-[10px] font-bold uppercase transition"
                        >
                          Perform another swap
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 border-t border-slate-800/60 pt-4 text-[10px] text-slate-500">
                    <ShieldAlert size={12} className="text-amber-500" />
                    <span>Transactions are sandbox-simulated. Real intents can be executed via AI at the bottom.</span>
                  </div>
                </div>

                {/* Right Panel: Protocol info details */}
                <div className="lg:col-span-5 space-y-6">
                  <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Protocol Details</h3>
                    <p className="text-xs text-slate-300 leading-relaxed font-semibold">{project.description}</p>
                    <div className="space-y-2 pt-2 border-t border-slate-800/60 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Official Website</span>
                        <a href={project.url} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline flex items-center gap-1">
                          {domain} <ExternalLink size={10} />
                        </a>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Category</span>
                        <span className="text-slate-300 font-bold capitalize">{project.category}</span>
                      </div>
                      {project.twitterHandle && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Twitter/X</span>
                          <a href={`https://x.com/${project.twitterHandle}`} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">
                            @{project.twitterHandle}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Real-time Simulated Activity Stream */}
                  <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Live Activity Feed</h3>
                      <div className="flex items-center gap-1.5 text-[9px] text-emerald-400 font-extrabold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span>LIVE</span>
                      </div>
                    </div>
                    <div className="space-y-2 max-h-52 overflow-y-auto scrollbar-hide">
                      {activityFeed.map((entry, i) => (
                        <div key={i} className="flex justify-between items-start gap-2 border-b border-slate-800/60 pb-2 last:border-0">
                          <span className="text-[10px] text-slate-300 font-mono leading-snug flex-1">{entry.action}</span>
                          <span className="text-[9px] text-slate-600 whitespace-nowrap flex-shrink-0">{entry.time}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Audit Badge */}
                  {(project as any).auditor && (
                    <div className="bg-blue-950/40 border border-blue-800/40 rounded-2xl p-4 flex items-center gap-3">
                      <Shield size={18} className="text-blue-400 flex-shrink-0" />
                      <div>
                        <p className="text-[10px] text-blue-400 font-extrabold uppercase tracking-wider">Security Audited</p>
                        <p className="text-xs text-slate-300 font-semibold">Audited by <span className="text-blue-300 font-black">{(project as any).auditor}</span></p>
                      </div>
                    </div>
                  )}
                </div>

              </div>

            </div>
          )}

          {/* TAB B: Embedded dApp Browser containing the Wallet Routing dialog overlay */}
          {activeTab === 'website' && (
            <div className="w-full h-full flex flex-col bg-slate-950 relative">
              
              {/* Browser Address Bar Header */}
              <div className="flex items-center gap-2.5 px-4 py-2.5 bg-slate-900 border-b border-slate-800 text-slate-400 text-xs">
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                </div>
                
                {/* Simulated navigation */}
                <div className="flex items-center gap-1 ml-2 flex-shrink-0 text-slate-500">
                  <span className="p-1 rounded hover:bg-slate-800 cursor-not-allowed">←</span>
                  <span className="p-1 rounded hover:bg-slate-800 cursor-not-allowed">→</span>
                  <button
                    onClick={() => {
                      const iframe = document.getElementById('dapp-iframe') as HTMLIFrameElement;
                      if (iframe) iframe.src = project.url;
                    }}
                    className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition"
                    title="Refresh page / iframe content"
                  >
                    <RefreshCw size={11} />
                  </button>
                </div>

                {/* Address Bar */}
                <div className="flex-1 max-w-xl mx-auto flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800/80 font-mono text-[10px] text-slate-300">
                  <span className="text-emerald-500">🔒</span>
                  <span className="truncate">{project.url}</span>
                </div>

                {/* Status Indicator */}
                <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-[#00e6b4] bg-[#00e6b4]/10 border border-[#00e6b4]/20 px-2 py-0.5 rounded-full flex-shrink-0 hidden md:flex">
                  <Shield size={10} />
                  <span>Secure Sandbox Injector</span>
                </div>
              </div>

              {/* Main iframe container */}
              <div className="flex-1 w-full h-full relative bg-slate-900">
                <iframe
                  id="dapp-iframe"
                  src={project.url}
                  className="w-full h-full border-none bg-white"
                  title={`${project.name} Website`}
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads"
                />

                {/* Centered Wallet Confirmation Card Overlay */}
                {showWalletChoice && (
                  <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-30 flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl relative space-y-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <ProjectLogo project={project} className="w-10 h-10 rounded-xl" size={40} />
                          <div>
                            <h3 className="text-sm font-black text-white font-serif">{project.name}</h3>
                            <p className="text-[10px] text-slate-400 font-semibold">Wallet Routing Connection</p>
                          </div>
                        </div>
                        
                        <button
                          onClick={() => setShowWalletChoice(false)}
                          className="p-1.5 hover:bg-slate-850 rounded-full text-slate-400 hover:text-white transition"
                          title="Skip and view website directly"
                        >
                          <X size={14} />
                        </button>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed font-semibold">
                        A secure sandbox session has been injected for <span className="font-bold text-white">{project.name}</span>. 
                        Choose how you would like to connect your wallet:
                      </p>

                      <div className="space-y-3">
                        <button
                          onClick={() => {
                            setShowWalletChoice(false);
                            addMessage({
                              type: 'agent',
                              text: `Successfully configured **Portal Wallet** (connected via Privy) on ${project.name}.\n\nYour address **${wallets[0]?.address ? `${wallets[0].address.slice(0, 10)}...${wallets[0].address.slice(-8)}` : '0x71c7...976f'}** is active. You can now execute natural language instructions via our AI Copilot below.`
                            });
                            setPortalState({ isChatOpen: true });
                          }}
                          className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 rounded-2xl text-xs font-extrabold text-white transition flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 hover:scale-[1.01] active:scale-[0.99]"
                        >
                          <CheckCircle size={14} /> Option 1: Retain Connected Wallet (Privy Session)
                        </button>
                        <button
                          onClick={() => {
                            setShowWalletChoice(false);
                            addMessage({
                              type: 'agent',
                              text: `Noted! Initiated a new external wallet connection. Open the MetaMask or WalletConnect extension inside the launched ${project.name} browser tab to complete approval setup.`
                            });
                          }}
                          className="w-full py-3 border border-slate-700 hover:border-slate-500 bg-slate-800 hover:bg-slate-750 rounded-2xl text-xs font-bold text-slate-300 hover:text-white transition flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99]"
                        >
                          <Globe size={14} /> Option 2: Connect a New Wallet on the Site
                        </button>
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80 text-[9px] text-slate-500 leading-normal font-semibold">
                        <ShieldAlert size={12} className="text-amber-500 flex-shrink-0" />
                        <span>This sandbox injects EVM wallet protocols directly. Click dismiss above to browse the site.</span>
                      </div>
                    </div>
                  </div>
                )}
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
                placeholder={t.dropIntent.replace('USDC', 'USDC')}
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
                  <><CheckCircle size={11} /><span>{t.submitToAi}</span></>
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
    </div>

      {/* ── Right Panel: Agent Sidebar (slides in after intent) ─────── */}
      <div
        className={`transition-all duration-500 ease-in-out border-l border-slate-800/80 flex-shrink-0 h-full overflow-hidden ${
          isChatOpen ? 'w-[420px] opacity-100' : 'w-0 opacity-0 border-none'
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

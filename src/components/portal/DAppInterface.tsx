import { useState, useEffect } from 'react';
import { ArrowLeft, ExternalLink, Cpu, CheckCircle, RefreshCw, ArrowDown } from 'lucide-react';
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
  
  // Custom states for interactive simulators & layout
  const [hasSubmittedIntent, setHasSubmittedIntent] = useState(false);
  const [simTab, setSimTab] = useState<'swap' | 'stake' | 'supply' | 'borrow' | 'trade' | 'console'>('swap');
  
  // DEX Swapper states
  const [tokenFrom, setTokenFrom] = useState('MNT');
  const [tokenTo, setTokenTo] = useState('USDC');
  const [amountFrom, setAmountFrom] = useState('');
  const [amountTo, setAmountTo] = useState('');

  // Lending states
  const [suppliedUSDC, setSuppliedUSDC] = useState('0.00');
  const [borrowedUSDC] = useState('0.00');
  const [supplyInput, setSupplyInput] = useState('');
  
  // Trading states
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
  const [tradeMode, setTradeMode] = useState<'limit' | 'market'>('market');
  const [tradeAmount, setTradeAmount] = useState('');
  const [tradeLeverage, setTradeLeverage] = useState('1');

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
    
    // Choose appropriate tab depending on category
    if (project.category === 'dex') {
      setSimTab('swap');
    } else if (project.category === 'lending') {
      setSimTab('supply');
    } else if (project.category === 'derivatives') {
      setSimTab('trade');
    } else {
      setSimTab('console');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.name]);

  // Sync amount from and to for simulated swapping
  useEffect(() => {
    if (!amountFrom) {
      setAmountTo('');
      return;
    }
    const val = parseFloat(amountFrom);
    if (isNaN(val)) return;
    
    let rate = 1;
    if (tokenFrom === 'MNT' && tokenTo === 'USDC') rate = 0.85;
    else if (tokenFrom === 'USDC' && tokenTo === 'MNT') rate = 1.17;
    else if (tokenFrom === 'MNT' && tokenTo === 'MOE') rate = 12.4;
    else if (tokenFrom === 'MOE' && tokenTo === 'MNT') rate = 0.08;
    
    setAmountTo((val * rate).toFixed(3));
  }, [amountFrom, tokenFrom, tokenTo]);

  // Handle transaction intents inside the co-pilot transaction bar
  const handleIntentSubmit = async (e?: React.FormEvent, customIntent?: string) => {
    if (e) e.preventDefault();
    const finalIntent = customIntent || intentInput;
    if (!finalIntent.trim() || isExecuting) return;

    setIsExecuting(true);
    setHasSubmittedIntent(true);
    setPortalState({ isChatOpen: true }); // Open sidebar in store to keep sync

    addMessage({
      type: 'user',
      text: finalIntent,
    });

    const pendingMsgId = addMessage({
      type: 'agent',
      text: `Processing intent: "${finalIntent}" on ${project.name}…`,
    });

    setTimeout(() => {
      let successMsg = `Successfully executed transaction on **${project.name}**! 🎉\n\nYour intent was processed via ERC-4337 smart account paymaster (gas sponsored). Transaction hash: **0x9b7e...61f4**`;
      
      // Customize success output based on action types
      if (finalIntent.toLowerCase().includes('swap')) {
        successMsg = `Swap completed successfully on **${project.name}**! 🔄\n\nSwapped ${amountFrom || '10'} ${tokenFrom} for ${amountTo || '8.5'} ${tokenTo}.\nGas fee: **$0.00** (Sponsored by Paymaster)!\nTx Hash: **0x4d12...c89b**`;
        setAmountFrom('');
      } else if (finalIntent.toLowerCase().includes('supply') || finalIntent.toLowerCase().includes('lend')) {
        successMsg = `Collateral supplied successfully to **${project.name}**! 💰\n\nDeposited ${supplyInput || '50'} USDC.\nAccount Health Factor is now a safe **2.48 APY**.\nTx Hash: **0x8e23...e45f**`;
        setSuppliedUSDC((prev) => (parseFloat(prev) + parseFloat(supplyInput || '50')).toFixed(2));
        setSupplyInput('');
      }
      
      updateMessage(pendingMsgId, {
        text: successMsg,
      });
      setIntentInput('');
      setIsExecuting(false);
    }, 2200);
  };

  const triggerQuickAction = (actionLabel: string) => {
    setIntentInput(actionLabel);
    handleIntentSubmit(undefined, actionLabel);
  };

  const updateMessage = (id: string, updates: any) => {
    usePortalStore.getState().updateMessage(id, updates);
  };

  // Determine which simulator template to display
  const isMerchantMoe = project.defillamaSlug === 'merchant-moe' || project.name.toLowerCase().includes('moe');
  const isInitCapital = project.defillamaSlug === 'init-capital' || project.name.toLowerCase().includes('init');
  const isVertex = project.defillamaSlug === 'vertex-protocol' || project.name.toLowerCase().includes('vertex');

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950 text-white animate-in fade-in duration-300">
      
      {/* Embedded dApp Simulator Area (Expands to 100% when drawer is closed) */}
      <div className="flex-1 flex flex-col h-full bg-slate-900/10 relative overflow-hidden theme-transition">
        {/* Top Breadcrumb Header */}
        <div className="h-14 border-b border-slate-800/80 px-4 flex items-center justify-between bg-slate-950/60 backdrop-blur-md z-10 theme-transition">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-xs text-slate-300 font-semibold transition"
          >
            <ArrowLeft size={13} />
            <span>Back to Discovery</span>
          </button>
          
          <div className="flex items-center gap-2">
            {project.defillamaSlug ? (
              <img
                src={`https://icons.llamao.fi/icons/protocols/${project.defillamaSlug}?h=80&w=80`}
                alt={project.name}
                className="w-6 h-6 rounded-md object-contain bg-white p-0.5"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : null}
            <span className="text-xs font-bold text-white font-serif">{project.name}</span>
            <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold uppercase tracking-wider">
              Copilot Ready
            </span>
            <span className="text-[10px] text-slate-400 bg-slate-900 px-2 py-1 rounded border border-slate-800 hidden sm:inline">
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

        {/* Dynamic Simulator Widget Container */}
        <div className="flex-1 w-full bg-slate-950 p-6 relative flex flex-col justify-between overflow-y-auto pb-32">
          
          {/* Main Simulator UI cards */}
          <div className="flex-1 w-full flex items-center justify-center">
            
            {/* 1. Merchant Moe Swap/Stake Simulator */}
            {isMerchantMoe && (
              <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 shadow-2xl space-y-5 animate-in">
                {/* Tabs */}
                <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                  <button
                    onClick={() => setSimTab('swap')}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                      simTab === 'swap' ? 'bg-[#00e6b4] text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Swap Tokens
                  </button>
                  <button
                    onClick={() => setSimTab('stake')}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                      simTab === 'stake' ? 'bg-[#00e6b4] text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Stake MOE
                  </button>
                </div>

                {simTab === 'swap' ? (
                  <div className="space-y-4">
                    {/* Swap Box From */}
                    <div className="bg-slate-950/80 rounded-2xl p-4 border border-slate-800 relative">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] text-slate-500 font-bold uppercase">From</span>
                        <span className="text-[10px] text-slate-500">Balance: {balance.split(' ')[0]}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <input
                          type="text"
                          placeholder="0.00"
                          value={amountFrom}
                          onChange={(e) => setAmountFrom(e.target.value)}
                          className="bg-transparent text-xl font-bold text-white focus:outline-none w-2/3"
                        />
                        <select
                          value={tokenFrom}
                          onChange={(e) => setTokenFrom(e.target.value)}
                          className="bg-slate-900 border border-slate-800 rounded-xl px-2 py-1 text-xs font-bold focus:outline-none"
                        >
                          <option>MNT</option>
                          <option>USDC</option>
                          <option>MOE</option>
                        </select>
                      </div>
                    </div>

                    {/* Swap Direction Indicator */}
                    <div className="flex justify-center -my-2.5 relative z-10">
                      <button className="w-8 h-8 rounded-full bg-[#00e6b4] border-4 border-slate-950 flex items-center justify-center text-slate-950 hover:scale-110 transition shadow-lg shadow-[#00e6b4]/10">
                        <ArrowDown size={14} className="stroke-[3]" />
                      </button>
                    </div>

                    {/* Swap Box To */}
                    <div className="bg-slate-950/80 rounded-2xl p-4 border border-slate-800">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] text-slate-500 font-bold uppercase">To (Estimated)</span>
                        <span className="text-[10px] text-slate-500">Balance: 120.40</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <input
                          type="text"
                          readOnly
                          placeholder="0.00"
                          value={amountTo}
                          className="bg-transparent text-xl font-bold text-slate-400 focus:outline-none w-2/3 cursor-default"
                        />
                        <select
                          value={tokenTo}
                          onChange={(e) => setTokenTo(e.target.value)}
                          className="bg-slate-900 border border-slate-800 rounded-xl px-2 py-1 text-xs font-bold focus:outline-none"
                        >
                          <option>USDC</option>
                          <option>MOE</option>
                          <option>MNT</option>
                        </select>
                      </div>
                    </div>

                    {/* Rates */}
                    <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800/40 text-[10px] text-slate-400 space-y-1">
                      <div className="flex justify-between">
                        <span>Exchange Rate:</span>
                        <span className="font-bold text-slate-200">1 {tokenFrom} ≈ {(parseFloat(amountTo || '1') / parseFloat(amountFrom || '1')).toFixed(4)} {tokenTo}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Price Impact:</span>
                        <span className="font-bold text-emerald-400">&lt; 0.01%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Slippage Tolerance:</span>
                        <span className="font-bold text-slate-200">0.50%</span>
                      </div>
                    </div>

                    <button
                      onClick={() => triggerQuickAction(`Swap ${amountFrom || '10'} ${tokenFrom} for ${tokenTo}`)}
                      className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold rounded-2xl text-xs shadow-lg shadow-blue-500/20 active:scale-95 transition"
                    >
                      Swap Assets via AI Paymaster
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4 text-center">
                    <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Moe Staking Rewards</p>
                      <p className="text-2xl font-black text-[#00e6b4]">14.24% APR</p>
                      <p className="text-[11px] text-slate-400">Stake your MOE tokens to receive sMOE and collect platform trading fees automatically.</p>
                    </div>

                    <div className="bg-slate-950/80 rounded-2xl p-4 border border-slate-800 text-left">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] text-slate-500 font-bold uppercase">Amount to Stake</span>
                        <span className="text-[10px] text-slate-500">Balance: 5,420 MOE</span>
                      </div>
                      <input
                        type="text"
                        placeholder="0.00 MOE"
                        className="bg-transparent text-xl font-bold text-white focus:outline-none w-full"
                      />
                    </div>

                    <button
                      onClick={() => triggerQuickAction('Stake 1000 MOE in Staking Contract')}
                      className="w-full py-3 bg-[#00e6b4] hover:bg-[#00ffc8] text-slate-950 font-bold rounded-2xl text-xs active:scale-95 transition shadow-lg shadow-[#00e6b4]/10"
                    >
                      Stake MOE Now
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* 2. INIT Capital Lending/Borrowing Simulator */}
            {isInitCapital && (
              <div className="w-full max-w-2xl bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 shadow-2xl space-y-6 animate-in">
                {/* Protocol Header Metrics */}
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: 'Collateral supplied', value: `$${suppliedUSDC}`, desc: 'Earn interest', color: 'text-emerald-400' },
                    { label: 'Total Borrowed', value: `$${borrowedUSDC}`, desc: 'Active debt', color: 'text-rose-400' },
                    { label: 'Borrow Capacity', value: '45%', desc: '$450.00 left', color: 'text-blue-400' },
                    { label: 'Health Factor', value: '2.48', desc: 'Secure status', color: 'text-emerald-400' },
                  ].map((it, idx) => (
                    <div key={idx} className="bg-slate-950/80 border border-slate-800/60 p-3 rounded-2xl text-center space-y-0.5">
                      <p className="text-[8px] text-slate-500 font-bold uppercase">{it.label}</p>
                      <p className={`text-sm font-black ${it.color}`}>{it.value}</p>
                      <p className="text-[7px] text-slate-500 font-semibold">{it.desc}</p>
                    </div>
                  ))}
                </div>

                {/* Tabs */}
                <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                  <button
                    onClick={() => setSimTab('supply')}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                      simTab === 'supply' ? 'bg-[#00e6b4] text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Supply Collateral
                  </button>
                  <button
                    onClick={() => setSimTab('borrow')}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                      simTab === 'borrow' ? 'bg-[#00e6b4] text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Borrow Assets
                  </button>
                </div>

                {simTab === 'supply' ? (
                  <div className="space-y-4">
                    {/* Lending Assets Grid */}
                    <div className="space-y-3">
                      {[
                        { token: 'USDC', apy: '8.24% APY', totalSupplied: '24.2M USDC', balance: '250.00 USDC' },
                        { token: 'mETH', apy: '12.42% APY', totalSupplied: '184.2K mETH', balance: '0.05 mETH' },
                        { token: 'MNT', apy: '5.40% APY', totalSupplied: '45.1M MNT', balance: balance.split(' ')[0] },
                      ].map((item) => (
                        <div key={item.token} className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center font-bold text-xs">{item.token}</span>
                            <div>
                              <p className="text-xs font-bold text-white">{item.token}</p>
                              <p className="text-[9px] text-slate-500">Total Supplied: {item.totalSupplied}</p>
                            </div>
                          </div>
                          
                          <div className="text-right flex items-center gap-6">
                            <div>
                              <p className="text-xs font-extrabold text-emerald-400">{item.apy}</p>
                              <p className="text-[9px] text-slate-500">Wallet: {item.balance}</p>
                            </div>
                            <button
                              onClick={() => {
                                setSupplyInput('100');
                                triggerQuickAction(`Supply 100 ${item.token} to Collateral Pool`);
                              }}
                              className="px-4 py-2 bg-slate-900 hover:bg-[#00e6b4] hover:text-slate-950 border border-slate-800 hover:border-[#00e6b4] text-xs font-bold rounded-xl transition"
                            >
                              Supply
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Borrowing Assets Grid */}
                    <div className="space-y-3">
                      {[
                        { token: 'USDC', borrowApy: '9.45% APY', totalBorrowed: '15.1M USDC', capacity: 'Up to $450' },
                        { token: 'WETH', borrowApy: '7.20% APY', totalBorrowed: '25.4K WETH', capacity: 'Up to $220' },
                        { token: 'MNT', borrowApy: '6.80% APY', totalBorrowed: '12.8M MNT', capacity: 'Up to $150' },
                      ].map((item) => (
                        <div key={item.token} className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center font-bold text-xs">{item.token}</span>
                            <div>
                              <p className="text-xs font-bold text-white">{item.token}</p>
                              <p className="text-[9px] text-slate-500">Total Borrowed: {item.totalBorrowed}</p>
                            </div>
                          </div>
                          
                          <div className="text-right flex items-center gap-6">
                            <div>
                              <p className="text-xs font-extrabold text-rose-400">{item.borrowApy}</p>
                              <p className="text-[9px] text-slate-500">Capacity: {item.capacity}</p>
                            </div>
                            <button
                              onClick={() => triggerQuickAction(`Borrow 50 ${item.token} against USDC Collateral`)}
                              className="px-4 py-2 bg-slate-900 hover:bg-rose-500 hover:text-white border border-slate-800 hover:border-rose-500 text-xs font-bold rounded-xl transition"
                            >
                              Borrow
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 3. Vertex Trading Terminal Simulator */}
            {isVertex && (
              <div className="w-full max-w-5xl bg-slate-900/40 backdrop-blur-xl border border-slate-800/60 rounded-3xl p-5 shadow-2xl flex flex-col lg:flex-row gap-5 animate-in">
                {/* 3.1 Sleek Mock Candlestick Chart */}
                <div className="flex-1 bg-slate-950 rounded-2xl p-4 border border-slate-800 flex flex-col justify-between min-h-[300px]">
                  <div className="flex justify-between items-center border-b border-slate-800/80 pb-2 mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-white font-serif">MNT/USDT Spot</span>
                      <span className="text-[10px] text-emerald-400 font-extrabold">$0.8524 (+3.12%)</span>
                    </div>
                    <span className="text-[8px] text-slate-500 uppercase font-bold tracking-wider">Live Candlestick Feed</span>
                  </div>

                  {/* Chart canvas simulation */}
                  <div className="flex-1 flex items-end justify-between px-2 pt-6 pb-2 relative min-h-[160px]">
                    {/* Grid lines */}
                    <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-10">
                      {[1, 2, 3, 4].map((i) => <div key={i} className="border-b border-white w-full" />)}
                    </div>

                    {/* Mock Candlesticks */}
                    {[
                      { h: '60px', color: 'bg-emerald-500/80', shadow: 'bg-emerald-400' },
                      { h: '80px', color: 'bg-emerald-500/80', shadow: 'bg-emerald-400' },
                      { h: '70px', color: 'bg-rose-500/80', shadow: 'bg-rose-400' },
                      { h: '95px', color: 'bg-emerald-500/80', shadow: 'bg-emerald-400' },
                      { h: '120px', color: 'bg-emerald-500/80', shadow: 'bg-emerald-400' },
                      { h: '110px', color: 'bg-rose-500/80', shadow: 'bg-rose-400' },
                      { h: '135px', color: 'bg-emerald-500/80', shadow: 'bg-emerald-400' },
                      { h: '150px', color: 'bg-emerald-500/80', shadow: 'bg-emerald-400' },
                    ].map((c, idx) => (
                      <div key={idx} className="flex flex-col items-center w-6 sm:w-8" style={{ height: c.h }}>
                        {/* wick */}
                        <div className={`w-0.5 flex-1 ${c.shadow}`} />
                        {/* body */}
                        <div className={`w-full rounded-md shadow-sm border border-slate-900 ${c.color}`} style={{ height: '70%' }} />
                        {/* wick */}
                        <div className={`w-0.5 flex-1 ${c.shadow}`} />
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between border-t border-slate-800/80 pt-2 text-[8px] text-slate-500 font-bold">
                    <span>14:00</span>
                    <span>14:30</span>
                    <span>15:00</span>
                    <span>15:30</span>
                    <span>16:00</span>
                  </div>
                </div>

                {/* 3.2 Real-time Order Book */}
                <div className="w-56 bg-slate-950 rounded-2xl p-4 border border-slate-800 flex flex-col justify-between text-xs">
                  <div>
                    <h4 className="text-[10px] text-slate-500 font-bold uppercase tracking-wider border-b border-slate-800 pb-1.5 mb-2">Order Book</h4>
                    {/* Ask Prices */}
                    <div className="space-y-1">
                      {['0.8532', '0.8529', '0.8526'].map((price, idx) => (
                        <div key={idx} className="flex justify-between font-mono text-[10px] text-rose-400">
                          <span>{price}</span>
                          <span className="text-slate-500">{(Math.random() * 5000 + 100).toFixed(0)}</span>
                        </div>
                      ))}
                    </div>
                    {/* Spread */}
                    <div className="py-2 my-2 border-y border-slate-900 text-center font-bold text-[10px]">
                      Spread: <span className="text-slate-400">0.0002 USDC</span>
                    </div>
                    {/* Bid Prices */}
                    <div className="space-y-1">
                      {['0.8524', '0.8521', '0.8518'].map((price, idx) => (
                        <div key={idx} className="flex justify-between font-mono text-[10px] text-emerald-400">
                          <span>{price}</span>
                          <span className="text-slate-500">{(Math.random() * 5000 + 100).toFixed(0)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="pt-2 text-[8px] text-slate-600 font-semibold">Live spread feed updating...</div>
                </div>

                {/* 3.3 Spot/Perp Trading card */}
                <div className="w-64 bg-slate-950 rounded-2xl p-4 border border-slate-800 flex flex-col justify-between gap-4">
                  <div className="space-y-4">
                    {/* Buy/Sell tab */}
                    <div className="flex p-0.5 bg-slate-900 border border-slate-800 rounded-xl">
                      <button
                        onClick={() => setTradeType('buy')}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg ${
                          tradeType === 'buy' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Buy
                      </button>
                      <button
                        onClick={() => setTradeType('sell')}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg ${
                          tradeType === 'sell' ? 'bg-rose-500 text-white' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Sell
                      </button>
                    </div>

                    {/* Mode */}
                    <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase">
                      <button onClick={() => setTradeMode('limit')} className={tradeMode === 'limit' ? 'text-cyan-400 border-b border-cyan-400 pb-0.5' : ''}>Limit</button>
                      <button onClick={() => setTradeMode('market')} className={tradeMode === 'market' ? 'text-cyan-400 border-b border-cyan-400 pb-0.5' : ''}>Market</button>
                    </div>

                    {/* Inputs */}
                    <div className="space-y-2.5">
                      <div className="bg-slate-900 border border-slate-850 p-2.5 rounded-xl flex justify-between items-center">
                        <span className="text-[9px] text-slate-500 font-bold uppercase">Price</span>
                        <span className="text-xs font-bold text-white font-mono">{tradeMode === 'market' ? 'Market Price' : '0.8524'}</span>
                      </div>

                      <div className="bg-slate-900 border border-slate-850 p-2.5 rounded-xl flex justify-between items-center">
                        <span className="text-[9px] text-slate-500 font-bold uppercase">Amount</span>
                        <input
                          type="text"
                          placeholder="0.0 MNT"
                          value={tradeAmount}
                          onChange={(e) => setTradeAmount(e.target.value)}
                          className="bg-transparent text-xs font-bold text-right text-white focus:outline-none w-1/2 font-mono"
                        />
                      </div>
                    </div>

                    {/* Leverage Slider */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[8px] text-slate-500 font-bold uppercase">
                        <span>Leverage Limit</span>
                        <span className="text-cyan-400 font-extrabold">{tradeLeverage}x</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="20"
                        value={tradeLeverage}
                        onChange={(e) => setTradeLeverage(e.target.value)}
                        className="w-full h-1 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-[#00e6b4]"
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => triggerQuickAction(`${tradeType === 'buy' ? 'Buy' : 'Sell'} ${tradeAmount || '100'} MNT Spot Order at Market Price`)}
                    className={`w-full py-3 font-bold rounded-2xl text-xs active:scale-95 transition ${
                      tradeType === 'buy'
                        ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                        : 'bg-rose-500 hover:bg-rose-400 text-white'
                    }`}
                  >
                    Place {tradeType === 'buy' ? 'Buy' : 'Sell'} Order
                  </button>
                </div>
              </div>
            )}

            {/* 4. Sandbox Console Simulator (For any other dApps to prevent Refused-To-Connect iframe errors) */}
            {!isMerchantMoe && !isInitCapital && !isVertex && (
              <div className="w-full max-w-2xl bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 shadow-2xl flex flex-col gap-6 animate-in">
                {/* Browser Sandbox frame */}
                <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden">
                  <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex items-center justify-between text-[10px] text-slate-500">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    </div>
                    <div className="px-6 py-0.5 rounded bg-slate-950 border border-slate-800 flex items-center gap-1.5 font-mono text-[9px] w-64 text-center justify-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-emerald-400">Secure Shield:</span>
                      <span className="text-slate-400">{project.url.replace('https://', '')}</span>
                    </div>
                    <Cpu size={12} className="text-slate-400" />
                  </div>
                  
                  {/* Console body */}
                  <div className="p-5 font-mono text-[10px] text-slate-400 space-y-2 bg-black/60 min-h-[160px] text-left">
                    <p className="text-slate-500 font-bold uppercase tracking-wider mb-2 border-b border-slate-900 pb-1">RPC Log Terminal</p>
                    <p className="text-emerald-400">🟢 [RPC-5000] Connected to Mantle Mainnet Node successfully</p>
                    <p className="text-cyan-400">🔑 [Privy-Auth] Active Session detected for Account: {wallets[0]?.address || 'Guest Account (No wallet connected)'}</p>
                    <p className="text-slate-400">🛠️ [Sandbox] inline Frame blocker bypass activated (Refused-To-Connect avoided)</p>
                    <p className="text-amber-400">🤖 [ELTNAM-Agent] AI Copilot standing by. Drop your intent or select a quick action below to begin executing contract calls securely!</p>
                  </div>
                </div>

                {/* Simulated contract interactors / actions */}
                <div className="space-y-3">
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider text-left">Trigger intent quick action</p>
                  <div className="grid grid-cols-2 gap-3">
                    {project.actions.map((act) => (
                      <button
                        key={act}
                        onClick={() => triggerQuickAction(act)}
                        className="p-3 text-left bg-slate-950 hover:bg-slate-900 border border-slate-850 hover:border-blue-500/50 text-xs font-bold rounded-xl transition flex items-center justify-between hover:translate-x-0.5"
                      >
                        <span className="text-slate-200">{act}</span>
                        <Cpu size={11} className="text-blue-400" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Floating Copilot Intent Bar (Bottom) */}
          <div className="absolute bottom-6 left-6 right-6 bg-slate-900/90 backdrop-blur border border-slate-800 rounded-2xl p-4 shadow-2xl flex flex-col md:flex-row items-center gap-4 z-20">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Cpu size={16} className={`text-slate-950 ${isExecuting ? 'animate-spin' : ''}`} style={{ animationDuration: '6s' }} />
              </div>
              <div className="text-left">
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
                className="flex-1 bg-slate-950 border border-slate-800/80 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/60 transition disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!intentInput.trim() || isExecuting}
                className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 disabled:from-slate-800 disabled:to-slate-900 rounded-xl text-xs font-bold text-white transition hover:scale-105 active:scale-95 disabled:scale-100 disabled:opacity-40 flex items-center gap-1.5 shadow-md shadow-blue-500/10"
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

      {/* Dynamic Slide-over Agent Sidebar (Slides in automatically as soon as intent is dropped) */}
      <div
        className={`transition-all duration-500 ease-in-out border-l border-slate-800/80 flex-shrink-0 h-full overflow-hidden flex bg-slate-950 ${
          hasSubmittedIntent || isChatOpen ? 'w-96 opacity-100' : 'w-0 opacity-0 border-none'
        }`}
      >
        <div className="w-96 h-full flex-shrink-0">
          <AgentSidebar />
        </div>
      </div>

    </div>
  );
}

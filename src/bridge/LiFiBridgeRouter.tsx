// src/bridge/LiFiBridgeRouter.tsx

import { useState, useEffect, useCallback } from 'react';
import {
  ArrowRight, ArrowDown, CheckCircle, AlertTriangle,
  TrendingUp, RefreshCw, ExternalLink, Info,
  Shield, Loader, ChevronDown, ChevronUp, Layers
} from 'lucide-react';
import { useLiFiBridgeRouter, useLiFiEarn } from './lifiHooks';
import { type StrategyResult } from './bridgeStrategyEngine';


// ── Strategy Badge ─────────────────────────────────────────────────────────────
interface StrategyBadgeProps {
  strategy: StrategyResult | null;
}

function StrategyBadge({ strategy }: StrategyBadgeProps) {
  if (!strategy) return null;
  const colors = {
    OFT:     'bg-orange-500/15 border-orange-500/40 text-orange-300',
    INTENTS: 'bg-blue-500/15 border-blue-500/40 text-blue-300',
    CLASSIC: 'bg-purple-500/15 border-purple-500/40 text-purple-300',
  }[strategy.strategy];

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold ${colors}`}>
      <span>{strategy.icon}</span>
      <span>{strategy.label}</span>
      <span className="text-slate-500">·</span>
      <span className="text-slate-400">{strategy.estimatedTime}</span>
    </div>
  );
}

// ── Quote Card ─────────────────────────────────────────────────────────────────
interface QuoteCardProps {
  quote: any;
  strategy: StrategyResult | null;
}

function QuoteCard({ quote, strategy }: QuoteCardProps) {
  const [expanded, setExpanded] = useState(false);
  if (!quote || strategy?.strategy === 'OFT') return null;

  const estimate = quote.estimate || {};
  const toAmount = estimate.toAmount || quote.toAmount;
  const toToken = quote.action?.toToken?.symbol || 'USDC';

  // Amount parsing helper to prevent NaN or extreme values
  const formatReceivedAmount = () => {
    if (!toAmount) return '—';
    const amountVal = parseFloat(toAmount);
    // If it is already in standard format or raw decimal formats
    if (amountVal > 1e10) {
      return (amountVal / 1e18).toFixed(4);
    } else if (amountVal > 1e7) {
      return (amountVal / 1e6).toFixed(2);
    }
    // Fallback display raw or formatted
    return amountVal > 100000 ? (amountVal / 1e6).toFixed(2) : amountVal.toFixed(2);
  };

  return (
    <div className="p-4 bg-slate-800/50 border border-slate-700/50 rounded-xl space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-400">You receive</span>
        <span className="text-lg font-bold text-white">
          {formatReceivedAmount()} {toToken}
        </span>
      </div>

      {estimate.executionDuration && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">Est. time</span>
          <span className="text-slate-300">{estimate.executionDuration}s</span>
        </div>
      )}

      {estimate.feeCosts && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">Bridge fee</span>
          <span className="text-slate-300">
            ${estimate.feeCosts.reduce((a: number, f: any) => a + parseFloat(f.amountUSD || 0), 0).toFixed(3)}
          </span>
        </div>
      )}

      {/* Route details toggle */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-400 transition"
      >
        {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        Route details
      </button>

      {expanded && quote.tool && (
        <div className="space-y-1 text-xs text-slate-500">
          <div className="flex justify-between">
            <span>Route via</span>
            <span className="text-slate-300 font-mono">{quote.tool}</span>
          </div>
          {quote.toolDetails?.name && (
            <div className="flex items-center justify-between">
              <span>Bridge used</span>
              <span className="text-slate-300">{quote.toolDetails.name}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Transfer Status Tracker ────────────────────────────────────────────────────
interface TransferStatusProps {
  status: string | null;
  txHash: string | null;
  strategy: StrategyResult | null;
}

function TransferStatus({ status, txHash, strategy }: TransferStatusProps) {
  const steps = {
    OFT: ['Burn on source', 'DVN attestation', 'Mint on Mantle'],
    INTENTS: ['Intent submitted', 'Solver delivering', 'Funds on Mantle'],
    CLASSIC: ['Transaction sent', 'Bridge processing', 'Funds on Mantle'],
  }[strategy?.strategy || 'CLASSIC'];

  const currentStep = {
    pending: 1,
    done:    3,
    failed:  0,
  }[status || ''] ?? 0;

  if (!status || !['pending', 'done', 'failed'].includes(status)) return null;

  return (
    <div className="p-4 bg-slate-800/40 border border-slate-700/40 rounded-xl space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold">
        {status === 'done'   && <CheckCircle size={16} className="text-emerald-400" />}
        {status === 'failed' && <AlertTriangle size={16} className="text-red-400" />}
        {status === 'pending'&& <Loader size={16} className="animate-spin text-blue-400" />}
        <span className="text-white">
          {status === 'done' ? 'Transfer complete' : status === 'failed' ? 'Transfer failed' : 'Transfer in progress…'}
        </span>
      </div>

      {/* Step indicators */}
      <div className="space-y-2">
        {steps.map((step, i) => {
          const isDone    = i < currentStep;
          const isActive  = i === currentStep - 1 && status === 'pending';
          return (
            <div key={step} className="flex items-center gap-3">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold
                ${isDone ? 'bg-emerald-500 text-white' : isActive ? 'bg-blue-500 text-white animate-pulse' : 'bg-slate-750 text-slate-500 border border-slate-700'}`}>
                {isDone ? '✓' : i + 1}
              </div>
              <span className={`text-xs ${isDone ? 'text-emerald-400' : isActive ? 'text-blue-300' : 'text-slate-500'}`}>
                {step}
              </span>
            </div>
          );
        })}
      </div>

      {txHash && (
        <a href={`https://explorer.mantle.xyz/tx/${txHash}`}
           target="_blank" rel="noopener noreferrer"
           className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition">
          <ExternalLink size={11} />
          View on Mantle Explorer
        </a>
      )}
    </div>
  );
}

// ── Strategy Explainer ─────────────────────────────────────────────────────────
interface StrategyExplainerProps {
  strategy: StrategyResult | null;
}

function StrategyExplainer({ strategy }: StrategyExplainerProps) {
  if (!strategy) return null;
  const info = {
    OFT: {
      how: 'Your tokens are burned on the source chain. LayerZero DVNs verify the burn cryptographically. Equivalent tokens are minted on Mantle. No solver inventory required — works for any amount.',
      when: 'OFT-standard tokens: mETH, MNT, USDY, FBTC',
      trust: 'DVN attestation — multiple independent verifiers',
    },
    INTENTS: {
      how: 'A solver (professional market maker) already holds the output token on Mantle. They deliver to you instantly from their inventory, then reclaim your source tokens after settlement. You get exact output with zero slippage.',
      when: 'Major stablecoins: USDC, USDT, DAI — where solvers maintain deep inventory',
      trust: 'Solver capital + escrow-based settlement on source chain',
    },
    CLASSIC: {
      how: 'LI.FI aggregates 30+ bridges and DEX aggregators to find the optimal route. May involve a swap on the source chain, bridging, and a swap on Mantle. Route is selected to minimise fees and slippage.',
      when: 'Any token — fallback when OFT and Intents are not optimal',
      trust: 'LI.FI Diamond contract — audited, non-custodial',
    },
  }[strategy.strategy];

  return (
    <div className="p-4 bg-slate-800/30 border border-slate-700/30 rounded-xl space-y-3">
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
        <Info size={12} />
        How this route works
      </div>
      <p className="text-xs text-slate-400 leading-relaxed">{info.how}</p>
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <p className="text-slate-600 mb-0.5">Best for</p>
          <p className="text-slate-300 font-semibold">{info.when}</p>
        </div>
        <div>
          <p className="text-slate-600 mb-0.5">Trust model</p>
          <p className="text-slate-300 font-semibold">{info.trust}</p>
        </div>
      </div>
    </div>
  );
}

// ── Earn Vaults Panel ─────────────────────────────────────────────────────────
interface EarnVaultsPanelProps {
  onSelectVault?: (vault: any) => void;
  filterAsset?: string;
}

export function EarnVaultsPanel({ onSelectVault, filterAsset }: EarnVaultsPanelProps) {
  const { vaults, loading, error } = useLiFiEarn({
    asset: filterAsset,
    sortBy: 'apy',
    limit: 6,
  });

  if (loading) return (
    <div className="flex items-center gap-2 text-sm text-slate-500 py-6 justify-center">
      <Loader size={14} className="animate-spin text-emerald-400" /> Loading yield opportunities…
    </div>
  );

  if (error) return (
    <p className="text-xs text-slate-500 py-6 text-center">Unable to load yield data. Check back shortly.</p>
  );

  if (!vaults.length) return (
    <p className="text-xs text-slate-500 py-6 text-center">No vaults found for this asset on Mantle yet.</p>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <TrendingUp size={14} className="text-emerald-400" />
        <span className="text-sm font-semibold text-white">Top Yield Opportunities on Mantle</span>
      </div>
      <div className="space-y-2">
        {vaults.map(vault => (
          <button
            key={vault.address || vault.slug}
            onClick={() => onSelectVault?.(vault)}
            className="w-full flex items-center justify-between p-3.5 bg-slate-900/60 border border-slate-800/60
                       hover:border-emerald-500/40 hover:bg-slate-900/90 rounded-xl transition group text-left"
          >
            <div>
              <p className="text-sm font-semibold text-white group-hover:text-emerald-300 transition">
                {vault.protocol?.name || 'Yield Protocol'}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5 uppercase tracking-wider font-mono">
                {vault.underlyingTokens?.map((t: any) => t.symbol).join(' + ') || 'Asset Vault'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-emerald-400">
                {vault.analytics?.apy?.total
                  ? `${(vault.analytics.apy.total * 100).toFixed(2)}%`
                  : vault.apy7d
                  ? `${(vault.apy7d * 100).toFixed(2)}%`
                  : '—'}
              </p>
              <p className="text-[10px] text-slate-500">
                TVL ${vault.tvl?.usd
                  ? (vault.tvl.usd / 1e6).toFixed(1) + 'M'
                  : '—'}
              </p>
            </div>
          </button>
        ))}
      </div>
      <p className="text-[9px] text-slate-600 text-right">
        Powered by LI.FI Earn · earn.li.fi
      </p>
    </div>
  );
}

// ── Main Bridge Router ─────────────────────────────────────────────────────────
interface LiFiBridgeRouterProps {
  walletAddress: string;
  detectedChain?: string;
  onBridgeComplete?: () => void;
  initialFromToken?: string;
  initialToToken?: string;
  initialAmount?: string;
}

export default function LiFiBridgeRouter({
  walletAddress,
  detectedChain = 'ethereum',
  onBridgeComplete,
  initialFromToken = 'USDC',
  initialToToken = 'USDC',
  initialAmount = '100',
}: LiFiBridgeRouterProps) {
  const { quote, strategy, status, txHash, error, getQuote, execute } = useLiFiBridgeRouter();
  const [fromToken, setFromToken] = useState(initialFromToken);
  const [toToken, setToToken] = useState(initialToToken);
  const [amount, setAmount] = useState(initialAmount);
  const [showEarn, setShowEarn] = useState(false);
  const [isGettingQuote, setIsGettingQuote] = useState(false);

  // Auto-quote trigger
  const handleGetQuote = useCallback(async () => {
    if (!walletAddress || !amount || parseFloat(amount) <= 0) return;
    setIsGettingQuote(true);
    try {
      await getQuote({
        fromChain: detectedChain,
        fromToken,
        toToken,
        amountUSD: parseFloat(amount),
        fromAddress: walletAddress,
      });
    } catch (_) {}
    setIsGettingQuote(false);
  }, [walletAddress, amount, fromToken, toToken, detectedChain, getQuote]);

  useEffect(() => {
    if (status === 'done') {
      onBridgeComplete?.();
    }
  }, [status, onBridgeComplete]);

  const canExecute = status === 'ready' || status === 'oft-route';
  const isProcessing = status === 'pending' || isGettingQuote;

  return (
    <div className="space-y-4 w-full">
      {/* Header Tabs */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Layers size={16} className="text-blue-400" />
          <h3 className="text-xs font-black uppercase tracking-wider text-white">LI.FI Multi-Bridge Engine</h3>
        </div>
        <button
          onClick={() => setShowEarn(v => !v)}
          className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition font-bold"
        >
          <TrendingUp size={12} />
          {showEarn ? 'Bridge Router' : 'Yield Finder'}
        </button>
      </div>

      {!showEarn ? (
        <>
          {/* Token selectors */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl space-y-1.5">
                <label className="text-[8px] text-slate-500 font-bold uppercase block">Source Asset</label>
                <select
                  value={fromToken}
                  onChange={e => {
                    setFromToken(e.target.value);
                    if (status) handleGetQuote();
                  }}
                  className="w-full bg-slate-950 border border-slate-800 text-xs font-bold text-white px-2 py-1.5 rounded-lg focus:outline-none focus:border-cyan-500 transition"
                >
                  {['USDC', 'USDT', 'DAI', 'ETH', 'WBTC', 'SOL'].map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl space-y-1.5">
                <label className="text-[8px] text-slate-500 font-bold uppercase block">Amount (USD)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="100"
                  className="w-full bg-transparent text-sm font-black text-white focus:outline-none border-b border-slate-800 focus:border-cyan-500 py-0.5"
                />
              </div>
            </div>

            {/* Direction Arrow */}
            <div className="flex justify-center -my-1">
              <div className="p-1.5 bg-slate-900 border border-slate-800 rounded-full z-10 shadow-lg">
                <ArrowDown size={12} className="text-slate-400" />
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl space-y-1.5">
              <label className="text-[8px] text-slate-500 font-bold uppercase block">Destination Asset (Mantle)</label>
              <select
                value={toToken}
                onChange={e => {
                  setToToken(e.target.value);
                  if (status) handleGetQuote();
                }}
                className="w-full bg-slate-950 border border-slate-800 text-xs font-bold text-white px-2 py-1.5 rounded-lg focus:outline-none focus:border-cyan-500 transition"
              >
                {['USDC', 'USDT', 'mETH', 'USDY', 'MNT'].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Action Trigger */}
          {status !== 'pending' && status !== 'done' && (
            <button
              onClick={handleGetQuote}
              disabled={isProcessing || !walletAddress}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 uppercase tracking-wider shadow-lg disabled:opacity-40"
            >
              {isGettingQuote ? (
                <><RefreshCw size={13} className="animate-spin text-cyan-400" /> Routing quotation…</>
              ) : (
                <>Fetch Bridge Route Quote</>
              )}
            </button>
          )}

          {/* Strategy indicators */}
          {strategy && <StrategyBadge strategy={strategy} />}

          {/* Quote details card */}
          {quote && strategy?.strategy !== 'OFT' && (
            <QuoteCard quote={quote} strategy={strategy} />
          )}

          {/* LayerZero OFT notice */}
          {strategy?.strategy === 'OFT' && status === 'oft-route' && (
            <div className="p-3.5 bg-orange-500/10 border border-orange-500/30 rounded-xl space-y-1 text-xs">
              <p className="font-semibold text-orange-300">🔥 LayerZero OFT standard route</p>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                {toToken} will be bridged natively via burn-mint contracts, verified by decentralized oracle networks. Free from solver inventory reliance.
              </p>
            </div>
          )}

          {/* Strategy Details */}
          {strategy && <StrategyExplainer strategy={strategy} />}

          {/* Execution triggers */}
          {canExecute && (
            <button
              onClick={() => execute({ signerAddress: walletAddress, walletClient: null })}
              className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 uppercase tracking-wider shadow-xl shadow-emerald-500/10"
            >
              {strategy?.strategy === 'OFT' ? (
                <>🔥 Complete LayerZero OFT Transfer</>
              ) : strategy?.strategy === 'INTENTS' ? (
                <>⚡ Fill Instant Intents Quote</>
              ) : (
                <>🔀 Execute Aggregated LI.FI Bridge</>
              )}
              <ArrowRight size={13} />
            </button>
          )}

          {/* Status logs */}
          <TransferStatus status={status} txHash={txHash} strategy={strategy} />

          {/* Error alerts */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex gap-2">
              <AlertTriangle className="text-red-400 flex-shrink-0" size={14} />
              <p className="text-xs text-red-300 leading-normal">{error}</p>
            </div>
          )}

          {/* Non-custodial assurance */}
          <div className="flex items-center justify-between text-[9px] text-slate-600 pt-2 border-t border-slate-800">
            <span className="flex items-center gap-1"><Shield size={9} className="text-emerald-500" /> Non-custodial settlement</span>
            <span>Audited & Verified protocols only</span>
          </div>
        </>
      ) : (
        <EarnVaultsPanel
          filterAsset={toToken !== 'MNT' ? toToken : undefined}
          onSelectVault={(vault) => {
            setShowEarn(false);
            setFromToken('USDC');
            setToToken(vault.underlyingTokens?.[0]?.symbol || 'USDC');
            handleGetQuote();
          }}
        />
      )}
    </div>
  );
}

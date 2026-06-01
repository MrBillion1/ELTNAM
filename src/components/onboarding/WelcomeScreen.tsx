import { Zap, ArrowRight } from 'lucide-react';

interface WelcomeScreenProps {
  onGetStarted: () => void;
}

export function WelcomeScreen({ onGetStarted }: WelcomeScreenProps) {
  return (
    <div className="space-y-8 text-center animate-in fade-in duration-300">
      <div>
        <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-2xl shadow-blue-500/30">
          <Zap size={36} className="text-white" />
        </div>
        <h1 className="text-4xl font-black tracking-tight mb-3">
          <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent uppercase tracking-widest">ELTNAM</span>
        </h1>
        <p className="text-slate-400 text-base leading-relaxed max-w-xs mx-auto">
          Explore the Mantle ecosystem with our autonomous AI agent guide. Safe, fast, and completely effortless.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: '🔑', label: 'No seed phrases' },
          { icon: '⛽', label: 'Gas covered' },
          { icon: '🌐', label: 'Any chain' },
        ].map((f) => (
          <div key={f.label} className="p-3 bg-slate-900/50 border border-slate-800/80 rounded-xl">
            <div className="text-2xl mb-1">{f.icon}</div>
            <p className="text-xs text-slate-400 font-semibold">{f.label}</p>
          </div>
        ))}
      </div>

      <button
        onClick={onGetStarted}
        className="w-full py-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 rounded-xl font-bold text-lg text-white transition shadow-xl shadow-blue-600/30 flex items-center justify-center gap-2 group"
      >
        Get Started <ArrowRight size={20} className="group-hover:translate-x-1 transition" />
      </button>

      <p className="text-xs text-slate-600">Powered by Privy · SOC 2 Compliant · Non-custodial</p>
    </div>
  );
}

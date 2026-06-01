import { useMemo } from 'react';
import { Rocket, TrendingUp, Zap, X, ExternalLink, Globe, ArrowUpRight } from 'lucide-react';
import { MANTLE_PROJECTS } from '../../lib/mantleProjects';
import type { Project } from '../../lib/mantleProjects';
import { usePortalStore } from '../../store/usePortalStore';
import { CategoryBar } from './CategoryBar';
import { ProjectCard } from './ProjectCard';
import { AgentSidebar } from './AgentSidebar';

interface DiscoveryInterfaceProps {
  onProceedToDApp: (project: Project) => void;
}

export function DiscoveryInterface({ onProceedToDApp }: DiscoveryInterfaceProps) {
  const { activeCategory, selectedProject, setPortalState } = usePortalStore();

  // Filter projects by active category
  const filteredProjects = useMemo(() => {
    if (activeCategory === 'all') {
      return MANTLE_PROJECTS;
    }
    return MANTLE_PROJECTS.filter((p) => p.category === activeCategory);
  }, [activeCategory]);

  // Aggregate stats
  const stats = useMemo(() => {
    // Hardcoded sums or baseline calculations
    const activeCount = MANTLE_PROJECTS.length;
    const featuredCount = MANTLE_PROJECTS.filter(p => p.status === 'Featured').length;
    
    return {
      totalTvl: '$4.38B',
      activeCount,
      featuredCount,
      topApy: '8.5% APY',
    };
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950 text-white animate-in fade-in duration-300">
      {/* Main Content (70%) */}
      <div className="flex-1 overflow-y-auto flex flex-col scrollbar-hide">
        
        {/* Compact Hero Section */}
        <div className="p-6 md:p-8 space-y-4 border-b border-slate-900/60 bg-gradient-to-b from-slate-900/20 to-transparent">
          <div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-none">
              <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent uppercase font-black tracking-widest">ELTNAM</span>
              <span className="text-blue-100/80 font-light block text-2xl mt-1.5 font-sans">Mantle Agentic Ecosystem Portal</span>
            </h1>
            <p className="text-xs md:text-sm text-slate-400 max-w-2xl mt-2 leading-relaxed font-sans">
              Discover, fund, bridge, and explore the most secure DeFi protocols on Mantle. Seamlessly driven by autonomous AI intents.
            </p>
          </div>

          {/* Quick Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
            {[
              { label: 'Ecosystem TVL', value: stats.totalTvl, desc: 'Across L2 protocols', icon: TrendingUp, color: 'text-emerald-400' },
              { label: 'Total Verified dApps', value: stats.activeCount, desc: 'Indexed registries', icon: Rocket, color: 'text-cyan-400' },
              { label: 'Featured Builders', value: stats.featuredCount, desc: 'EcoFund projects', icon: Zap, color: 'text-yellow-400' },
              { label: 'mETH Stake Yield', value: stats.topApy, desc: 'Top organic APY', icon: Globe, color: 'text-blue-400' },
            ].map((st, i) => {
              const Icon = st.icon;
              return (
                <div key={i} className="p-4 bg-slate-900/40 border border-slate-800/80 rounded-xl space-y-1 hover:border-slate-700/80 transition-colors">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{st.label}</p>
                    <Icon size={14} className={st.color} />
                  </div>
                  <p className="text-lg font-black text-white">{st.value}</p>
                  <p className="text-[9px] text-slate-500">{st.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Category Pill Pinned Selector */}
        <div className="px-6 md:px-8">
          <CategoryBar
            activeCategory={activeCategory}
            onSelectCategory={(id) => setPortalState({ activeCategory: id })}
          />
        </div>

        {/* Grid List */}
        <div className="flex-1 p-6 md:p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredProjects.map((proj) => (
              <ProjectCard
                key={proj.id}
                project={proj}
                onSelect={(p) => setPortalState({ selectedProject: p })}
                onProceedToDApp={onProceedToDApp}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Fixed Right Agent Sidebar (30%) */}
      <div className="hidden lg:block w-96 flex-shrink-0 border-l border-slate-800/80">
        <AgentSidebar />
      </div>

      {/* Slide-Up Detail Panel overlay */}
      {selectedProject && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center animate-in fade-in duration-300">
          <div className="w-full max-w-2xl bg-slate-900 border-t border-slate-800 rounded-t-2xl p-6 md:p-8 space-y-6 shadow-2xl relative animate-in slide-in-from-bottom duration-300">
            <button
              onClick={() => setPortalState({ selectedProject: null })}
              className="absolute right-4 top-4 p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition"
            >
              <X size={18} />
            </button>

            <div className="flex items-start gap-4">
              <span className="text-6xl filter drop-shadow-md select-none">{selectedProject.icon}</span>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-black text-white">{selectedProject.name}</h2>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full border bg-blue-500/10 border-blue-500/30 text-blue-300 uppercase tracking-wider font-bold">
                    {selectedProject.status}
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">{selectedProject.category}</p>
              </div>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed">
              {selectedProject.description}
            </p>

            <div className="grid grid-cols-2 gap-4 py-4 border-t border-b border-slate-800/80">
              <div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Value Locked (Baseline)</p>
                <p className="text-xl font-black text-emerald-400">{selectedProject.tvl}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">24h Generated Fees</p>
                <p className="text-xl font-black text-slate-300">{selectedProject.fees24h}</p>
              </div>
            </div>

            {/* Actions list */}
            <div className="space-y-2">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Integrations & Commands</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {selectedProject.actions.map((act) => (
                  <button
                    key={act}
                    onClick={() => {
                      // Trigger prompt intent in sidebar
                      setPortalState({ selectedProject: null });
                      // Add trigger message or handle in sidebar
                    }}
                    className="p-3 bg-slate-950 border border-slate-800 hover:border-slate-700 text-xs rounded-xl hover:-translate-y-0.5 transition text-slate-300 font-semibold flex items-center justify-between text-left group"
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
                className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-blue-500/20 flex items-center justify-center gap-1.5"
              >
                <span>Launch Embedded dApp</span>
                <ExternalLink size={14} />
              </button>
              <button
                onClick={() => setPortalState({ selectedProject: null })}
                className="px-6 py-3 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white rounded-xl text-xs font-bold transition"
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

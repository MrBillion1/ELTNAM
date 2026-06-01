import { useState } from 'react';
import { ChevronRight, ArrowUpRight } from 'lucide-react';
import type { Project } from '../../lib/mantleProjects';
import { useProtocolData } from '../onboarding/hooks/useProtocolData';

interface ProjectCardProps {
  project: Project;
  onSelect: (project: Project) => void;
  onProceedToDApp: (project: Project) => void;
}

export function ProjectCard({ project, onSelect, onProceedToDApp }: ProjectCardProps) {
  const { data } = useProtocolData(project);
  const [isExpanded, setIsExpanded] = useState(false);

  const statusStyles = {
    Featured: 'bg-blue-500/20 border-blue-500/40 text-blue-300',
    EcoFund: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300',
    Active: 'bg-slate-800/60 border-slate-700/60 text-slate-400',
  }[project.status];

  return (
    <div
      onClick={() => setIsExpanded(!isExpanded)}
      className={`rounded-xl border transition-all duration-200 cursor-pointer overflow-hidden p-6 bg-slate-900/80 backdrop-blur-xl group hover:scale-[1.02] ${
        isExpanded
          ? 'border-blue-500/60 shadow-lg shadow-blue-500/10'
          : 'border-slate-800/80 hover:border-slate-700'
      }`}
    >
      <div className="space-y-4">
        {/* Top bar */}
        <div className="flex items-start justify-between">
          <span className="text-4xl filter drop-shadow-md select-none">{project.icon}</span>
          <div className="flex gap-2">
            <span className={`text-[10px] px-2.5 py-0.5 rounded-full border font-bold uppercase tracking-wider ${statusStyles}`}>
              {project.status}
            </span>
            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-slate-800/60 border border-slate-700/60 text-slate-400 uppercase tracking-wider font-semibold">
              {project.category}
            </span>
          </div>
        </div>

        {/* Title & Desc */}
        <div>
          <h3 className="text-lg font-bold text-white group-hover:text-cyan-400 transition-colors">
            {project.name}
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed mt-1 line-clamp-2">
            {project.description}
          </p>
        </div>

        {/* Stats Row */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800/60">
          <div>
            <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">TVL</p>
            <p className="text-sm font-bold text-emerald-400">{data.tvl}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">24h Fees</p>
            <p className="text-sm font-bold text-slate-300">{data.fees24h}</p>
          </div>
        </div>

        {/* Live source indicator */}
        <div className="flex items-center justify-between text-[9px] text-slate-600">
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${data.isStale ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
            <span>Source: <strong className="text-slate-500">{data.dataSource}</strong></span>
          </div>
          {data.isStale && <span className="text-amber-500/60">Baseline Data</span>}
        </div>

        {/* Expanded Actions & CTA */}
        {isExpanded && (
          <div className="pt-4 border-t border-slate-800/60 space-y-4 animate-in fade-in duration-300" onClick={(e) => e.stopPropagation()}>
            <div className="space-y-1.5">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Quick Actions</p>
              <div className="grid grid-cols-2 gap-2">
                {project.actions.map((act) => (
                  <button
                    key={act}
                    onClick={() => onSelect(project)}
                    className="p-2 text-left bg-slate-950/60 hover:bg-slate-950 border border-slate-800 hover:border-slate-700 text-xs rounded-lg transition-all duration-200 hover:-translate-y-0.5 text-slate-300 font-medium truncate flex items-center justify-between"
                  >
                    <span>{act}</span>
                    <ChevronRight size={10} className="text-slate-500" />
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => onProceedToDApp(project)}
              className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 shadow-lg shadow-blue-500/10 group/btn"
            >
              <span>Use Protocol</span>
              <ArrowUpRight size={14} className="group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

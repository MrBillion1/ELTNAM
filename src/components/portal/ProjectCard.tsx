import { useState } from 'react';
import { Globe, MessageSquare, ChevronRight, ArrowUpRight } from 'lucide-react';
import type { Project } from '../../lib/mantleProjects';
import { useProtocolData } from '../onboarding/hooks/useProtocolData';
import { usePortalStore } from '../../store/usePortalStore';
import { TRANSLATIONS } from '../../lib/translations';
import { ProjectLogo } from '../shared/ProjectLogo';

const TwitterIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" {...props}>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

interface ProjectCardProps {
  project: Project;
  onSelect: (project: Project) => void;
  onProceedToDApp: (project: Project) => void;
}

export function ProjectCard({ project, onSelect, onProceedToDApp }: ProjectCardProps) {
  const { data } = useProtocolData(project);
  const { language } = usePortalStore();
  const t = TRANSLATIONS[language];
  
  const [isExpanded, setIsExpanded] = useState(false);

  const statusStyles = {
    Featured: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400',
    EcoFund: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-600 dark:text-cyan-400',
    Active: 'bg-slate-500/10 border-slate-500/20 text-slate-600 dark:text-slate-400',
  }[project.status];

  const handleSocialClick = (e: React.MouseEvent, url: string) => {
    e.stopPropagation();
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      onClick={() => setIsExpanded(!isExpanded)}
      className={`rounded-2xl border theme-transition duration-300 cursor-pointer overflow-hidden p-6 bg-[var(--card-bg)] hover:bg-[var(--card-hover-bg)] shadow-md hover:shadow-xl shadow-[var(--shadow-color)] hover:scale-[1.01] ${
        isExpanded
          ? 'border-[var(--accent-color)] ring-1 ring-[var(--accent-color)]/20'
          : 'border-[var(--border-primary)] hover:border-[var(--border-hover)]'
      }`}
    >
      <div className="space-y-4">
        {/* Top bar with icon and tags */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3.5">
            <ProjectLogo project={project} className="w-12 h-12" size={48} />
            <div>
              <h3 className="text-base font-extrabold tracking-tight text-[var(--text-primary)] hover:text-[var(--accent-color)] transition-colors font-serif">
                {project.name}
              </h3>
              <p className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-secondary)]">
                {project.category}
              </p>
            </div>
          </div>
          <span className={`text-[9px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-wider ${statusStyles}`}>
            {project.status}
          </span>
        </div>

        {/* Description */}
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed line-clamp-2">
          {project.description}
        </p>

        {/* Stats Section */}
        <div className="grid grid-cols-2 gap-2 py-3 border-t border-[var(--border-primary)]">
          <div>
            <p className="text-[9px] text-[var(--text-secondary)] font-bold uppercase tracking-wider">TVL ON MANTLE</p>
            <p className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">{data.mantleTvl || data.tvl}</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] text-[var(--text-secondary)] font-bold uppercase tracking-wider">24h Fees</p>
            <p className="text-sm font-extrabold text-[var(--text-primary)]">{data.fees24h}</p>
          </div>
        </div>

        {/* Footer: Social details and quick view */}
        <div className="flex items-center justify-between pt-2 border-t border-[var(--border-primary)]/40 text-[10px] text-[var(--text-secondary)]">
          {/* Social Icons directly on card */}
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => handleSocialClick(e, project.url)}
              className="p-1.5 hover:bg-[var(--border-primary)] rounded-lg transition-colors hover:text-[var(--accent-color)]"
              title="Website"
            >
              <Globe size={13} />
            </button>
            {project.twitterHandle && (
              <button
                onClick={(e) => handleSocialClick(e, `https://x.com/${project.twitterHandle}`)}
                className="p-1.5 hover:bg-[var(--border-primary)] rounded-lg transition-colors hover:text-[var(--accent-color)]"
                title="Twitter"
              >
                <TwitterIcon className="w-3.5 h-3.5" />
              </button>
            )}
            {project.discordInvite && (
              <button
                onClick={(e) => handleSocialClick(e, `https://discord.gg/${project.discordInvite}`)}
                className="p-1.5 hover:bg-[var(--border-primary)] rounded-lg transition-colors hover:text-[var(--accent-color)]"
                title="Discord"
              >
                <MessageSquare size={13} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${data.isStale ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
            <span className="font-semibold text-[9px] capitalize text-[var(--text-secondary)]/80">
              {data.dataSource}
            </span>
          </div>
        </div>

        {/* Expanded actions list */}
        {isExpanded && (
          <div
            className="pt-4 border-t border-[var(--border-primary)] space-y-4 animate-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-1.5">
              <p className="text-[9px] text-[var(--text-secondary)] font-bold uppercase tracking-wider">{t.quickActions}</p>
              <div className="grid grid-cols-2 gap-2">
                {project.actions.map((act) => (
                  <button
                    key={act}
                    onClick={() => onSelect(project)}
                    className="p-2.5 text-left bg-[var(--bg-secondary)] hover:bg-[var(--card-hover-bg)] border border-[var(--border-primary)] hover:border-[var(--accent-color)] text-xs rounded-xl theme-transition hover:-translate-y-0.5 text-[var(--text-primary)] font-bold truncate flex items-center justify-between"
                  >
                    <span>{act}</span>
                    <ChevronRight size={11} className="text-[var(--text-secondary)]" />
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => onProceedToDApp(project)}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 shadow-lg shadow-blue-500/10 group/btn"
            >
              <span>{t.launchDApp}</span>
              <ArrowUpRight size={14} className="group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

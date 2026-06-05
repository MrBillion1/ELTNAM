import { useState, useEffect } from 'react';
import type { Project } from '../../lib/mantleProjects';

interface ProjectLogoProps {
  project: Project;
  className?: string;
  size?: number;
}

export function ProjectLogo({ project, className = 'w-12 h-12', size = 48 }: ProjectLogoProps) {
  const [src, setSrc] = useState<string>('');
  const [fallbackLevel, setFallbackLevel] = useState(0);

  const domain = project.url.replace('https://', '').replace('http://', '').split('/')[0];

  useEffect(() => {
    // Priority 1: Explicit logo URL
    if (project.logoUrl) {
      setSrc(project.logoUrl);
    }
    // Priority 2: DeFiLlama icons API
    else if (project.defillamaSlug) {
      setSrc(`https://icons.llama.fi/${project.defillamaSlug}.png`);
    }
    // Priority 3: Twitter/X avatar via unavatar.io
    else if (project.twitterHandle) {
      setSrc(`https://unavatar.io/x/${project.twitterHandle}`);
    }
    // Priority 4: Clearbit Logo
    else {
      setSrc(`https://logo.clearbit.com/${domain}?size=${size * 2}`);
    }
    setFallbackLevel(0);
  }, [project, domain, size]);

  const handleError = () => {
    if (fallbackLevel === 0) {
      // Level 1: try unavatar Twitter
      if (project.twitterHandle) {
        setSrc(`https://unavatar.io/x/${project.twitterHandle}`);
      } else {
        setSrc(`https://logo.clearbit.com/${domain}?size=${size * 2}`);
      }
      setFallbackLevel(1);
    } else if (fallbackLevel === 1) {
      // Level 2: try clearbit or google favicon API
      setSrc(`https://www.google.com/s2/favicons?sz=${size * 2}&domain=${domain}`);
      setFallbackLevel(2);
    } else {
      // Level 3: render fallback SVG/emoji/letter (done by rendering null and showing fallback UI)
      setSrc('');
      setFallbackLevel(3);
    }
  };

  if (fallbackLevel === 3 || !src) {
    // Return custom initials / emoji placeholder using project gradient
    return (
      <div
        className={`${className} rounded-xl bg-gradient-to-br ${project.color || 'from-slate-800 to-slate-900'} border border-slate-700/30 flex items-center justify-center font-bold text-white shadow-inner select-none`}
        style={{ fontSize: `${size * 0.4}px` }}
      >
        {project.name.charAt(0).toUpperCase()}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={project.name}
      className={`${className} object-contain rounded-xl bg-white border border-slate-200 dark:border-slate-800 p-1 shadow-sm transform transition`}
      onError={handleError}
    />
  );
}

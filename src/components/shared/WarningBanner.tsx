import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface WarningBannerProps {
  type?: 'orange' | 'blue';
  title: string;
  body: string;
  actions?: React.ReactNode;
}

export function WarningBanner({ type = 'orange', title, body, actions }: WarningBannerProps) {
  const styles = {
    orange: { wrap: 'bg-orange-500/10 border-orange-500/40', icon: 'text-orange-400', text: 'text-orange-100' },
    blue: { wrap: 'bg-blue-500/10 border-blue-500/40', icon: 'text-blue-400', text: 'text-blue-100' },
  }[type];

  return (
    <div className={`rounded-xl border p-4 ${styles.wrap} mb-3`}>
      <div className="flex gap-3">
        <AlertTriangle className={`${styles.icon} flex-shrink-0 mt-0.5`} size={18} />
        <div className="flex-1 space-y-1">
          <p className={`font-semibold text-sm ${styles.text}`}>{title}</p>
          <p className="text-xs text-slate-400 leading-relaxed">{body}</p>
          {actions && <div className="flex flex-wrap gap-2 mt-3">{actions}</div>}
        </div>
      </div>
    </div>
  );
}

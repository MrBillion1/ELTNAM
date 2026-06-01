import type { OnrampOption } from '../../lib/constants';

interface OnrampCardProps {
  option: OnrampOption;
  walletAddress?: string;
}

export function OnrampCard({ option, walletAddress }: OnrampCardProps) {
  const url = option.url.replace('{walletAddress}', walletAddress || '');

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-between p-4 bg-slate-900/40 border border-slate-800/80 hover:border-blue-500/50 hover:bg-slate-900/80 rounded-xl transition group"
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">{option.logo}</span>
        <div>
          <p className="font-semibold text-sm text-white group-hover:text-cyan-400 transition">{option.name}</p>
          <p className="text-xs text-slate-500">{option.description}</p>
        </div>
      </div>
      <div className="text-right space-y-0.5">
        <p className="text-xs text-emerald-400 font-semibold">{option.time}</p>
        <p className="text-xs text-slate-500">{option.fee}</p>
      </div>
    </a>
  );
}

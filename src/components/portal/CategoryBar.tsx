import { CATEGORIES } from '../../lib/constants';

interface CategoryBarProps {
  activeCategory: string;
  onSelectCategory: (id: string) => void;
}

export function CategoryBar({ activeCategory, onSelectCategory }: CategoryBarProps) {
  return (
    <div className="w-full overflow-x-auto scrollbar-hide py-2 border-b border-slate-800/60 sticky top-0 bg-slate-950/80 backdrop-blur-md z-10">
      <div className="flex items-center gap-2.5 px-1 min-w-max">
        {CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/20'
                  : 'bg-slate-900/50 border border-slate-800/80 text-slate-400 hover:text-white hover:border-slate-700 hover:-translate-y-0.5'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-500 group-hover:text-slate-400'
              }`}>
                {cat.approxCount}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

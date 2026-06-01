interface StepDotsProps {
  total: number;
  current: number;
}

export function StepDots({ total, current }: StepDotsProps) {
  return (
    <div className="flex items-center gap-2 justify-center mb-8">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full transition-all duration-500 ${
            i < current ? 'w-6 bg-cyan-400' : i === current ? 'w-10 bg-blue-500' : 'w-6 bg-slate-700'
          }`}
        />
      ))}
    </div>
  );
}

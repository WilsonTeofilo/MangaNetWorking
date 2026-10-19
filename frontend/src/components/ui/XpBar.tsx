export interface XpBarProps {
  value: number;
  max: number;
  totalBlocks?: number;
  className?: string;
}

export function XpBar({
  value,
  max,
  totalBlocks = 12,
  className = '',
}: XpBarProps) {
  const percentage = Math.min(Math.max(value / (max || 1), 0), 1);
  const filledBlocks = Math.round(percentage * totalBlocks);

  return (
    <div className={`space-y-1.5 select-none ${className}`}>
      <div className="flex justify-between items-center font-pixel text-[12px] tracking-wider">
        <span className="text-[#A9A59A]">PROGRESSO DA TEMPORADA</span>
        <span className="text-[#FFD400] font-bold tabular-nums">
          XP {value}/{max}
        </span>
      </div>

      <div className="flex gap-1 p-1 bg-[#0B0B0C] border-2 border-[#34343A]">
        {Array.from({ length: totalBlocks }).map((_, i) => (
          <div
            key={i}
            className={`flex-1 h-3 transition-colors duration-75 ${
              i < filledBlocks ? 'bg-[#FFD400]' : 'bg-[#212125]'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

export interface MarqueeProps {
  items?: string[];
  className?: string;
}

export function Marquee({
  items = [
    'NOVO CAPÍTULO DISPONÍVEL',
    'SEASON 01 ATIVA',
    'APOIE O MANGÁ INDEPENDENTE',
    'MONETIZAÇÃO DIRETA',
    'LEIA OBRAS ORIGINAIS',
    'SEM PIRATARIA',
  ],
  className = '',
}: MarqueeProps) {
  const content = items.join(' • ') + ' • ';

  return (
    <div
      className={`w-full overflow-hidden bg-[#FFD400] text-[#0B0B0C] border-y-2 border-[#0B0B0C] py-2 select-none ${className}`}
      aria-hidden="true"
    >
      <div className="flex whitespace-nowrap animate-marquee motion-reduce:animate-none">
        <span className="font-display text-base tracking-widest uppercase mr-4">
          {content}
        </span>
        <span className="font-display text-base tracking-widest uppercase mr-4">
          {content}
        </span>
      </div>
    </div>
  );
}

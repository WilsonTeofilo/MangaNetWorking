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
      className={`w-full overflow-hidden bg-[var(--mn-yellow)] text-[var(--mn-ink)] border-y-2 border-[var(--mn-ink)] py-2 select-none ${className}`}
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

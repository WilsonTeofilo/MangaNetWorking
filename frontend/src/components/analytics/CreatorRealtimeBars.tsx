import { useState } from 'react';
import { hourRangeLabel, number } from './analyticsFormatters';

interface CreatorRealtimeBarsProps {
  data: { hour: string; views: number }[];
}

export function CreatorRealtimeBars({ data }: CreatorRealtimeBarsProps) {
  const [hovered, setHovered] = useState<number | null>(null);

  if (data.length === 0) {
    return <p className="mt-3 font-pixel text-[10px] uppercase text-[var(--mn-mute)]">Sem dados em tempo real.</p>;
  }

  const max = Math.max(1, ...data.map((hour) => Number(hour.views)));
  const active = hovered !== null ? data[hovered] : null;
  const activePercent = hovered !== null ? ((hovered + 0.5) / data.length) * 100 : 50;
  const clampedPercent = Math.min(88, Math.max(12, activePercent));

  return (
    <div className="relative mt-3">
      {active && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none absolute z-10 w-max max-w-[190px] border border-[var(--mn-line)] bg-[var(--mn-ink)] px-2.5 py-1.5 text-left shadow-[3px_3px_0_var(--mn-line)]"
          style={{
            left: `${clampedPercent}%`,
            top: 0,
            transform: `translateY(-100%) translateX(${
              clampedPercent > 65 ? '-85%' : clampedPercent < 35 ? '-15%' : '-50%'
            })`,
          }}
        >
          <p className="font-pixel text-[9px] uppercase text-[var(--mn-mute)]">{hourRangeLabel(active.hour)}</p>
          <p className="font-display text-lg leading-tight text-[var(--mn-teal)] tabular-nums">
            {number(Number(active.views))}
          </p>
        </div>
      )}
      <div className="flex h-24 items-end gap-[2px]">
        {data.map((hour, index) => (
          <button
            key={hour.hour}
            type="button"
            className="min-w-0 flex-1 cursor-pointer border-0 bg-[var(--mn-yellow)] p-0 focus-visible:outline focus-visible:outline-1 focus-visible:outline-[var(--mn-paper)]"
            style={{
              height: `${Math.max(3, (Number(hour.views) / max) * 100)}%`,
              opacity: Number(hour.views) === 0 ? 0.25 : hovered === index ? 1 : 0.85,
            }}
            onMouseEnter={() => setHovered(index)}
            onMouseLeave={() => setHovered(null)}
            onFocus={() => setHovered(index)}
            onBlur={() => setHovered(null)}
            onTouchStart={() => setHovered(index)}
            aria-label={`${hourRangeLabel(hour.hour)}: ${number(Number(hour.views))} ${
              Number(hour.views) === 1 ? 'visualização' : 'visualizações'
            }`}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between font-pixel text-[9px] uppercase text-[var(--mn-mute)]">
        <span>48h atrás</span>
        <span>agora</span>
      </div>
    </div>
  );
}
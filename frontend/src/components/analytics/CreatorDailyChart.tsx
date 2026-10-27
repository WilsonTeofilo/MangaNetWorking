import { useMemo, useRef, useState } from 'react';
import { CreatorAnalyticsDto } from '../../api/creatorAnalyticsApi';
import { dateLabel, number } from './analyticsFormatters';

interface CreatorDailyChartProps {
  data: { date: string; views: number; uniqueReaders: number }[];
  comparison?: CreatorAnalyticsDto['comparison'];
}

export function CreatorDailyChart({ data, comparison }: CreatorDailyChartProps) {
  const [active, setActive] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const width = 760;
  const height = 250;
  const padX = 42;
  const padY = 22;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;

  const previousByDate = useMemo(() => {
    const map = new Map<string, number>();
    for (const day of comparison?.viewsPerDay ?? []) {
      map.set(day.date, day.views);
    }
    return map;
  }, [comparison]);

  if (data.length === 0) {
    return <p className="font-pixel text-xs uppercase text-[var(--mn-mute)]">Sem visualizações no período.</p>;
  }

  const max = Math.max(
    1,
    ...data.map((day) => Number(day.views)),
    ...data.map((day) => previousByDate.get(day.date) ?? 0)
  );
  const x = (index: number) =>
    padX + (data.length <= 1 ? innerW / 2 : (index / (data.length - 1)) * innerW);
  const y = (value: number) => padY + innerH - (value / max) * innerH;
  const points = data.map((day, index) => `${x(index)},${y(Number(day.views))}`);
  const line = points.length > 0 ? `M${points.join(' L')}` : '';
  const area = points.length > 0 ? `${line} L${x(data.length - 1)},${padY + innerH} L${x(0)},${padY + innerH} Z` : '';
  const previousPoints = data.map((day, index) => `${x(index)},${y(previousByDate.get(day.date) ?? 0)}`);
  const previousLine = comparison && previousPoints.length > 0 ? `M${previousPoints.join(' L')}` : '';
  const grid = [0, 0.5, 1].map((factor) => y(max * factor));

  const activeDay = active !== null ? data[active] : null;
  const activePrevious = activeDay ? previousByDate.get(activeDay.date) : undefined;
  const activeXPercent = active !== null ? (x(active) / width) * 100 : 50;

  const pick = (clientX: number, element: SVGSVGElement) => {
    const rect = element.getBoundingClientRect();
    if (rect.width === 0) return;
    const svgX = ((clientX - rect.left) / rect.width) * width;
    const raw = data.length <= 1 ? 0 : ((svgX - padX) / innerW) * (data.length - 1);
    const index = Math.min(data.length - 1, Math.max(0, Math.round(raw)));
    setActive(index);
  };

  const moveActive = (direction: 1 | -1) => {
    setActive((current) => {
      if (current === null) return direction === 1 ? 0 : data.length - 1;
      return Math.min(data.length - 1, Math.max(0, current + direction));
    });
  };

  return (
    <div className="relative min-w-0">
      <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-pixel text-[9px] uppercase text-[var(--mn-mute)]">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4 bg-[var(--mn-yellow)]" aria-hidden="true" /> Período atual
        </span>
        {comparison && (
          <span className="inline-flex items-center gap-1.5">
            <span className="h-0.5 w-4 border-t-2 border-dashed border-[var(--mn-teal)]" aria-hidden="true" />
            Período anterior
          </span>
        )}
        <span className="normal-case text-[var(--mn-mute)]">Toque, passe o mouse ou use ← →</span>
      </div>

      {activeDay && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none absolute top-8 z-10 w-max max-w-[230px] border border-[var(--mn-line)] bg-[var(--mn-ink)] px-2.5 py-1.5 text-left shadow-[3px_3px_0_var(--mn-line)]"
          style={{
            left: `${Math.min(88, Math.max(12, activeXPercent))}%`,
            transform: `translateX(${
              activeXPercent > 65 ? '-85%' : activeXPercent < 35 ? '-15%' : '-50%'
            })`,
          }}
        >
          <p className="font-pixel text-[9px] uppercase text-[var(--mn-mute)]">{dateLabel(activeDay.date)}</p>
          <p className="font-display text-lg leading-tight text-[var(--mn-teal)] tabular-nums">
            {number(activeDay.views)} {activeDay.views === 1 ? 'visualização' : 'visualizações'}
          </p>
          {comparison && (
            <p className="font-body text-[10px] text-[var(--mn-mute)]">
              Período anterior: {number(activePrevious ?? 0)}
            </p>
          )}
          <p className="font-body text-[10px] text-[var(--mn-mute)]">
            {number(activeDay.uniqueReaders)}{' '}
            {activeDay.uniqueReaders === 1 ? 'leitor único' : 'leitores únicos'}
          </p>
        </div>
      )}

      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full touch-pan-y focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--mn-yellow)]"
        role="img"
        tabIndex={0}
        aria-label={`Visualizações por dia entre ${dateLabel(data[0].date)} e ${dateLabel(data[data.length - 1].date)}. Use as setas para explorar os dias.`}
        onPointerMove={(event) => pick(event.clientX, event.currentTarget)}
        onPointerLeave={() => setActive(null)}
        onPointerDown={(event) => pick(event.clientX, event.currentTarget)}
        onBlur={() => setActive(null)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowRight') {
            event.preventDefault();
            moveActive(1);
          } else if (event.key === 'ArrowLeft') {
            event.preventDefault();
            moveActive(-1);
          } else if (event.key === 'Home') {
            event.preventDefault();
            setActive(0);
          } else if (event.key === 'End') {
            event.preventDefault();
            setActive(data.length - 1);
          } else if (event.key === 'Escape') {
            setActive(null);
          }
        }}
      >
        {grid.map((position, index) => (
          <line
            key={`grid-${index}`}
            x1={padX}
            y1={position}
            x2={width - padX}
            y2={position}
            stroke="var(--mn-line)"
            strokeWidth={1}
            strokeDasharray={index === 2 ? '0' : '3 4'}
          />
        ))}
        {area && <path d={area} fill="url(#readsArea)" />}
        <defs>
          <linearGradient id="readsArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--mn-yellow)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--mn-yellow)" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {previousLine && (
          <path
            d={previousLine}
            fill="none"
            stroke="var(--mn-teal)"
            strokeWidth={1.5}
            strokeDasharray="5 5"
            opacity={0.75}
          />
        )}
        {line && <path d={line} fill="none" stroke="var(--mn-yellow)" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />}
        {active !== null && (
          <line
            x1={x(active)}
            y1={padY}
            x2={x(active)}
            y2={padY + innerH}
            stroke="var(--mn-yellow)"
            strokeWidth={1}
            strokeDasharray="2 3"
            opacity={0.8}
          />
        )}
        {data.map((day, index) => (
          <circle
            key={day.date}
            cx={x(index)}
            cy={y(Number(day.views))}
            r={active === index ? 4.5 : 2.5}
            fill="var(--mn-yellow)"
            stroke={active === index ? 'var(--mn-ink)' : 'none'}
            strokeWidth={1.5}
          >
            <title>{`${dateLabel(day.date)}: ${number(day.views)} visualização(ões)`}</title>
          </circle>
        ))}
        <text x={padX} y={height - 2} fill="var(--mn-mute)" fontSize="10">
          {dateLabel(data[0].date)}
        </text>
        <text x={width - padX} y={height - 2} fill="var(--mn-mute)" fontSize="10" textAnchor="end">
          {dateLabel(data[data.length - 1].date)}
        </text>
        <text x={padX - 6} y={padY + 4} fill="var(--mn-mute)" fontSize="10" textAnchor="end">
          {max}
        </text>
        <text x={padX - 6} y={padY + innerH / 2 + 4} fill="var(--mn-mute)" fontSize="10" textAnchor="end">
          {Math.round(max / 2)}
        </text>
        <text x={padX - 6} y={padY + innerH} fill="var(--mn-mute)" fontSize="10" textAnchor="end">
          0
        </text>
      </svg>
      <p className="mt-1 font-body text-[10px] text-[var(--mn-mute)]">
        Datas no fuso America/Sao_Paulo. O valor de cada dia é a visualização válida, não a página lida.
      </p>
    </div>
  );
}

import { useState } from 'react';
import type { CreatorAnalyticsDto } from '../../api/creatorAnalyticsApi';
import { MIN_SAMPLE, number, weekdayLabels } from './analyticsFormatters';

interface CreatorAudienceHeatmapProps {
  heatmap?: CreatorAnalyticsDto['audienceHeatmap'];
}

export function CreatorAudienceHeatmap({ heatmap }: CreatorAudienceHeatmapProps) {
  const [active, setActive] = useState<{ weekday: number; hour: number; views: number } | null>(null);

  if (!heatmap) {
    return <p className="font-pixel text-xs uppercase text-[var(--mn-mute)]">Relatório indisponível.</p>;
  }
  if (heatmap.sampleSize < MIN_SAMPLE) {
    return (
      <div className="space-y-2 border-2 border-dashed border-[var(--mn-line)] p-4">
        <p className="font-pixel text-[10px] uppercase text-[var(--mn-mute)]">
          Dados insuficientes para este relatório
        </p>
        <p className="font-body text-xs text-[var(--mn-mute)]">
          Amostra: {number(heatmap.sampleSize)}{' '}
          {heatmap.sampleSize === 1 ? 'visualização' : 'visualizações'} nos últimos {heatmap.days} dias. A
          matriz por dia/hora aparece a partir de {MIN_SAMPLE} visualizações.
        </p>
      </div>
    );
  }

  const cells = new Map<string, number>();
  for (const cell of heatmap.cells) {
    cells.set(`${cell.weekday}-${cell.hour}`, cell.views);
  }
  const max = Math.max(1, ...heatmap.cells.map((cell: { weekday: number; hour: number; views: number }) => cell.views));

  return (
    <div>
      <div className="overflow-x-auto pb-1">
        <div className="min-w-[620px]">
          <div
            className="grid items-center gap-[2px]"
            style={{ gridTemplateColumns: '34px repeat(24, minmax(14px, 1fr))' }}
          >
            <span aria-hidden="true" />
            {Array.from({ length: 24 }, (_, hour) => (
              <span key={`h-${hour}`} className="text-center font-pixel text-[8px] text-[var(--mn-mute)]">
                {hour % 3 === 0 ? String(hour).padStart(2, '0') : ''}
              </span>
            ))}
            {weekdayLabels.map((label, index) => {
              const weekday = index + 1;
              return (
                <div key={label} className="contents">
                  <span className="font-pixel text-[9px] text-[var(--mn-mute)]">{label}</span>
                  {Array.from({ length: 24 }, (_, hour) => {
                    const views = cells.get(`${weekday}-${hour}`) ?? 0;
                    const opacity = views === 0 ? 0.06 : 0.18 + (views / max) * 0.82;
                    return (
                      <button
                        key={`${weekday}-${hour}`}
                        type="button"
                        className="aspect-square min-h-[14px] w-full border border-[var(--mn-ink)] p-0 focus-visible:outline focus-visible:outline-1 focus-visible:outline-[var(--mn-paper)]"
                        style={{ backgroundColor: `rgba(255, 212, 0, ${opacity})` }}
                        onMouseEnter={() => setActive({ weekday, hour, views })}
                        onMouseLeave={() => setActive(null)}
                        onFocus={() => setActive({ weekday, hour, views })}
                        onBlur={() => setActive(null)}
                        onClick={() => setActive({ weekday, hour, views })}
                        aria-label={`${label}, ${String(hour).padStart(2, '0')}h às ${String(
                          (hour + 1) % 24
                        ).padStart(2, '0')}h: ${views} ${views === 1 ? 'visualização' : 'visualizações'}`}
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <p role="status" aria-live="polite" className="mt-2 min-h-[18px] font-body text-xs text-[var(--mn-paper)]">
        {active
          ? `${weekdayLabels[active.weekday - 1]}, ${String(active.hour).padStart(2, '0')}h às ${String(
              (active.hour + 1) % 24
            ).padStart(2, '0')}h: ${number(active.views)} ${
              active.views === 1 ? 'visualização' : 'visualizações'
            }`
          : 'Toque, passe o mouse ou navegue por teclado nas células.'}
      </p>
      <p className="mt-1 font-body text-[10px] leading-snug text-[var(--mn-mute)]">
        Últimos {heatmap.days} dias • fuso {heatmap.timezone} • amostra {number(heatmap.sampleSize)}{' '}
        visualizações. Horário observado não é garantia de alcance.
      </p>
    </div>
  );
}
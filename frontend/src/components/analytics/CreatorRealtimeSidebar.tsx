import { TrendingUp } from 'lucide-react';
import type { CreatorAnalyticsDto } from '../../api/creatorAnalyticsApi';
import { Button } from '../ui/Button';
import { number } from './analyticsFormatters';
import { CreatorRealtimeBars } from './CreatorRealtimeBars';

interface CreatorRealtimeSidebarProps {
  realtime: { hour: string; views: number }[];
  realtimeTotal: number;
  works: NonNullable<CreatorAnalyticsDto['works']>;
  onViewContent: () => void;
}

export function CreatorRealtimeSidebar({
  realtime,
  realtimeTotal,
  works,
  onViewContent,
}: CreatorRealtimeSidebarProps) {
  return (
    <aside className="space-y-4 min-w-0">
      <div className="border-2 border-[var(--mn-line)] bg-[var(--mn-ink-2)] p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display text-lg uppercase text-[var(--mn-paper)]">Em tempo real</h2>
          <span className="inline-flex items-center gap-1.5 font-pixel text-[10px] uppercase text-[var(--mn-ok)]">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--mn-ok)]" /> ao vivo
          </span>
        </div>

        <p className="mt-4 font-display text-3xl text-[var(--mn-paper)] tabular-nums">{number(realtimeTotal)}</p>
        <p className="font-body text-xs text-[var(--mn-mute)]">Visualizações • últimas 48 horas</p>
        <p className="mt-1 font-pixel text-[9px] uppercase text-[var(--mn-mute)]">
          Toque ou passe o mouse nas barras para ver a hora e o total
        </p>

        <CreatorRealtimeBars data={realtime} />

        <div className="mt-4 border-t border-[var(--mn-line)] pt-3">
          <p className="font-pixel text-[10px] uppercase text-[var(--mn-mute)]">Conteúdo principal</p>
          <ul className="mt-2 space-y-2">
            {works.slice(0, 5).map((work) => (
              <li key={work.workId} className="flex items-center gap-2">
                <div className="h-8 w-6 shrink-0 overflow-hidden border border-[var(--mn-line)] bg-[var(--mn-ink)]">
                  {work.coverUrl ? (
                    <img src={work.coverUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
                  ) : null}
                </div>
                <span className="min-w-0 flex-1 truncate font-body text-xs text-[var(--mn-paper)]" title={work.title}>
                  {work.title}
                </span>
                <span className="font-pixel text-[10px] tabular-nums text-[var(--mn-mute)]">
                  {number(work.views)}
                </span>
              </li>
            ))}
            {works.length === 0 && (
              <li className="font-body text-xs text-[var(--mn-mute)]">Sem obras ainda.</li>
            )}
          </ul>
        </div>
      </div>

      <div className="border-2 border-[var(--mn-yellow)] bg-[var(--mn-yellow)] p-4 text-[var(--mn-ink)]">
        <p className="font-pixel text-[10px] uppercase">Dica de canal</p>
        <p className="mt-2 font-body text-xs leading-relaxed">
          Compare a página em que os leitores param com o gancho do capítulo seguinte. A curva
          mostra progresso observado, não confirmação de que cada página foi olhada.
        </p>
        <Button
          variant="ghost"
          onClick={onViewContent}
          className="mt-3 !border-[var(--mn-ink)] !text-[var(--mn-ink)]"
        >
          <TrendingUp size={14} className="mr-1" aria-hidden="true" /> VER CONTEÚDO
        </Button>
      </div>
    </aside>
  );
}
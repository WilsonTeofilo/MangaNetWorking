import type { CreatorAnalyticsDto } from '../../api/creatorAnalyticsApi';
import { Win } from '../ui/Win';
import { number, percent } from './analyticsFormatters';
import { Metric } from './StatCard';

interface CreatorDetailedWorksListProps {
  works: NonNullable<CreatorAnalyticsDto['works']>;
}

export function CreatorDetailedWorksList({ works }: CreatorDetailedWorksListProps) {
  if (works.length === 0) {
    return (
      <p className="border-2 border-dashed border-[var(--mn-line)] p-6 font-pixel text-xs uppercase text-[var(--mn-mute)]">
        Nenhuma obra publicada ainda.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {works.map((work) => (
        <Win key={work.workId} title={work.title.toUpperCase()}>
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="w-24 shrink-0 border-2 border-[var(--mn-line)] bg-[var(--mn-ink)] aspect-[2/3] overflow-hidden">
              {work.coverUrl ? (
                <img src={work.coverUrl} alt={work.title} className="h-full w-full object-cover" loading="lazy" />
              ) : (
                <div className="flex h-full items-center justify-center font-pixel text-[10px] text-[var(--mn-mute)]">
                  SEM CAPA
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1 space-y-3">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
                <Metric label="Visualizações" value={number(work.views)} />
                <Metric label="Leitores únicos" value={number(work.uniqueReaders)} />
                <Metric label="Impressões" value={number(work.impressions)} />
                <Metric label="CTR" value={percent(work.ctrPercent)} />
                <Metric label="Conclusão" value={percent(work.completionRatePercent)} />
                <Metric label="Capítulos" value={number(work.chapters.length)} />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] border-collapse text-left">
                  <thead>
                    <tr className="border-b-2 border-[var(--mn-line)] font-pixel text-[10px] uppercase text-[var(--mn-mute)]">
                      <th className="py-1.5 pr-3">Capítulo</th>
                      <th className="py-1.5 pr-3">Visualizações</th>
                      <th className="py-1.5 pr-3">Leitores únicos</th>
                      <th className="py-1.5">Conclusão estimada</th>
                    </tr>
                  </thead>
                  <tbody>
                    {work.chapters.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-2 font-body text-xs text-[var(--mn-mute)]">
                          Nenhum capítulo cadastrado.
                        </td>
                      </tr>
                    )}
                    {work.chapters.map((chapter) => (
                      <tr key={chapter.chapterId} className="border-b border-[var(--mn-line)] font-body text-sm">
                        <td className="py-1.5 pr-3 text-[var(--mn-paper)]">
                          <span className="tabular-nums">#{chapter.chapterNumber}</span> {chapter.title}
                        </td>
                        <td className="py-1.5 pr-3 tabular-nums text-[var(--mn-paper)]">{number(chapter.views)}</td>
                        <td className="py-1.5 pr-3 tabular-nums text-[var(--mn-paper)]">{number(chapter.uniqueReaders)}</td>
                        <td className="py-1.5 tabular-nums text-[var(--mn-paper)]">
                          {percent(chapter.completionRatePercent)}
                          {chapter.completionRatePercent === null && (
                            <span className="ml-1 text-[10px] text-[var(--mn-mute)]">prosa: não mensurável</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </Win>
      ))}
    </div>
  );
}
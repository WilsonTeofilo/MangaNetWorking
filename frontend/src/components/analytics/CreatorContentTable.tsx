import React, { useMemo, useState } from 'react';
import { BookOpen, ChevronDown } from 'lucide-react';
import { CreatorAnalyticsDto } from '../../api/creatorAnalyticsApi';
import { number, percent } from './analyticsFormatters';

type WorkAnalytics = NonNullable<CreatorAnalyticsDto['works']>[number];
type SortKey = 'title' | 'views' | 'uniqueReaders' | 'impressions' | 'ctrPercent' | 'completionRatePercent';

function sortValue(work: WorkAnalytics, key: SortKey): number | string {
  if (key === 'title') return work.title.toLowerCase();
  if (key === 'ctrPercent' || key === 'completionRatePercent') {
    return work[key] ?? -1;
  }
  return work[key];
}

interface CreatorContentTableProps {
  works: WorkAnalytics[];
  expandedWork: string | null;
  onToggle: (workId: string) => void;
}

export function CreatorContentTable({ works, expandedWork, onToggle }: CreatorContentTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('views');
  const [ascending, setAscending] = useState(false);

  const sorted = useMemo(() => {
    const copy = [...works];
    copy.sort((a, b) => {
      const left = sortValue(a, sortKey);
      const right = sortValue(b, sortKey);
      const comparison =
        typeof left === 'string' && typeof right === 'string'
          ? left.localeCompare(right, 'pt-BR')
          : Number(left) - Number(right);
      return ascending ? comparison : -comparison;
    });
    return copy;
  }, [works, sortKey, ascending]);

  if (works.length === 0) {
    return <p className="font-pixel text-xs uppercase text-[var(--mn-mute)]">Nenhuma obra publicada ainda.</p>;
  }

  const header = (label: string, key: SortKey, extraClass = '') => (
    <th
      scope="col"
      className={`py-2 pr-3 ${extraClass}`}
      aria-sort={sortKey === key ? (ascending ? 'ascending' : 'descending') : 'none'}
    >
      <button
        type="button"
        className="inline-flex items-center gap-1 font-pixel text-[10px] uppercase text-[var(--mn-mute)] hover:text-[var(--mn-paper)]"
        onClick={() => {
          if (sortKey === key) {
            setAscending((value) => !value);
          } else {
            setSortKey(key);
            setAscending(key === 'title');
          }
        }}
      >
        {label}
        {sortKey === key && (
          <ChevronDown
            size={11}
            aria-hidden="true"
            className={ascending ? 'rotate-180 transition-transform' : 'transition-transform'}
          />
        )}
      </button>
    </th>
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] border-collapse text-left">
        <thead>
          <tr className="border-b-2 border-[var(--mn-line)]">
            {header('Obra', 'title')}
            {header('Visualizações', 'views')}
            {header('Leitores únicos', 'uniqueReaders')}
            {header('Impressões', 'impressions')}
            {header('CTR', 'ctrPercent')}
            {header('Conclusão', 'completionRatePercent')}
            <th scope="col" className="py-2 font-pixel text-[10px] uppercase text-[var(--mn-mute)]">
              Capítulos
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((work) => {
            const expanded = expandedWork === work.workId;
            return (
              <React.Fragment key={work.workId}>
                <tr
                  className="cursor-pointer border-b border-[var(--mn-line)] font-body text-sm hover:bg-[var(--mn-ink-2)]"
                  onClick={() => onToggle(work.workId)}
                >
                  <td className="py-2 pr-3">
                    <div className="flex items-center gap-2">
                      <div className="h-10 w-7 shrink-0 overflow-hidden border border-[var(--mn-line)] bg-[var(--mn-ink)]">
                        {work.coverUrl ? (
                          <img src={work.coverUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
                        ) : null}
                      </div>
                      <span className="min-w-0 break-words text-[var(--mn-paper)]">{work.title}</span>
                      <ChevronDown
                        size={14}
                        className={`shrink-0 text-[var(--mn-mute)] transition-transform ${expanded ? 'rotate-180' : ''}`}
                        aria-hidden="true"
                      />
                    </div>
                  </td>
                  <td className="py-2 pr-3 tabular-nums text-[var(--mn-paper)]">{number(work.views)}</td>
                  <td className="py-2 pr-3 tabular-nums text-[var(--mn-paper)]">{number(work.uniqueReaders)}</td>
                  <td className="py-2 pr-3 tabular-nums text-[var(--mn-paper)]">{number(work.impressions)}</td>
                  <td className="py-2 pr-3 tabular-nums text-[var(--mn-paper)]">{percent(work.ctrPercent)}</td>
                  <td className="py-2 pr-3 tabular-nums text-[var(--mn-paper)]">
                    {percent(work.completionRatePercent)}
                  </td>
                  <td className="py-2 tabular-nums text-[var(--mn-mute)]">{number(work.chapters.length)}</td>
                </tr>
                {expanded && (
                  <tr className="border-b border-[var(--mn-line)] bg-[var(--mn-ink)]">
                    <td colSpan={7} className="px-3 py-3">
                      {work.chapters.length === 0 ? (
                        <p className="font-body text-xs text-[var(--mn-mute)]">Nenhum capítulo cadastrado.</p>
                      ) : (
                        <ul className="space-y-1.5">
                          {work.chapters.map((chapter) => (
                            <li key={chapter.chapterId} className="flex flex-wrap items-center justify-between gap-2 font-body text-xs">
                              <span className="min-w-0 truncate text-[var(--mn-paper)]">
                                <BookOpen size={12} className="mr-1 inline text-[var(--mn-yellow)]" aria-hidden="true" />
                                <span className="tabular-nums">#{chapter.chapterNumber}</span> {chapter.title}
                              </span>
                              <span className="shrink-0 tabular-nums text-[var(--mn-mute)]">
                                {number(chapter.views)} visualizações · {number(chapter.uniqueReaders)} leitores ·{' '}
                                {percent(chapter.completionRatePercent)} conclusão
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

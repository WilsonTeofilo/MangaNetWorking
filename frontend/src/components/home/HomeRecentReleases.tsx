import React from 'react';
import { Work } from '../../types';
import { WorkCard } from '../ui/WorkCard';
import { ReleaseRow } from '../../utils/apiMappers';
import { chapterLabel, relativeTime } from '../../utils/formatMeta';

export interface HomeRecentReleasesProps {
  recentGroups: Array<{ work: Work; chapters: ReleaseRow[] }>;
  onSelectWork: (work: Work) => void;
  onOpenRelease: (release: ReleaseRow) => void;
  favorites?: string[];
  isAuthenticated: boolean;
  coldStartCta?: React.ReactNode;
  onNavigateToCatalog?: () => void;
}

export function HomeRecentReleases({
  recentGroups,
  onSelectWork,
  onOpenRelease,
  favorites = [],
  isAuthenticated,
  coldStartCta,
  onNavigateToCatalog,
}: HomeRecentReleasesProps) {
  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between border-b-2 border-[var(--mn-line)] pb-3">
        <div>
          <h2 className="font-display text-3xl sm:text-4xl text-[var(--mn-paper)] uppercase tracking-wide">
            NOVOS CAPÍTULOS
          </h2>
          <span className="font-body text-xs text-[var(--mn-mute)]">
            Lançamentos independentes publicados direto pelos criadores
          </span>
        </div>
        {onNavigateToCatalog && (
          <button
            type="button"
            onClick={onNavigateToCatalog}
            className="font-pixel text-[12px] text-[var(--mn-yellow)] hover:underline whitespace-nowrap"
          >
            CATÁLOGO COMPLETO →
          </button>
        )}
      </div>

      {recentGroups.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
          {recentGroups.map((group) => (
            <WorkCard
              key={group.work.id}
              work={group.work}
              onSelect={onSelectWork}
              isFavorite={favorites.includes(group.work.id)}
              analyticsSurface="FEED"
              analyticsEnabled={isAuthenticated}
              footer={
                <ul className="space-y-1 border-t border-[var(--mn-line)] pt-1.5">
                  {group.chapters.map((chapter) => (
                    <li key={chapter.chapterId}>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onOpenRelease(chapter);
                        }}
                        className="w-full flex items-center justify-between gap-2 text-left font-body text-[11px] text-[var(--mn-mute)] hover:text-[var(--mn-yellow)]"
                      >
                        <span className="truncate">
                          {chapterLabel(chapter.format, chapter.chapterNumber)} · {chapter.chapterTitle}
                        </span>
                        <span className="shrink-0 tabular-nums">{relativeTime(chapter.publishedAt)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              }
            />
          ))}
        </div>
      ) : (
        coldStartCta ?? (
          <p className="font-body text-sm text-[var(--mn-mute)]">
            Nenhum capítulo publicado neste formato ainda.
          </p>
        )
      )}
    </section>
  );
}

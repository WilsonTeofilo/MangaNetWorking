import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Work } from '../../types';
import { RankRow } from '../ui/RankRow';

export interface HomeTrendingRailsProps {
  showMangaRail: boolean;
  showNovelRail: boolean;
  trendingManga: Work[];
  trendingLightNovel: Work[];
  minRailSize: number;
  onSelectWork: (work: Work) => void;
  onNavigateToCatalog?: () => void;
  mangaColdStartCta?: React.ReactNode;
  novelColdStartCta?: React.ReactNode;
}

export function HomeTrendingRails({
  showMangaRail,
  showNovelRail,
  trendingManga,
  trendingLightNovel,
  minRailSize,
  onSelectWork,
  onNavigateToCatalog,
}: HomeTrendingRailsProps) {
  const hasManga = showMangaRail && trendingManga.length >= minRailSize;
  const hasNovel = showNovelRail && trendingLightNovel.length >= minRailSize;

  if (!hasManga && !hasNovel) {
    return null;
  }

  return (
    <>
      {/* EM ALTA: MANGÁS */}
      {hasManga && (
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b-2 border-[var(--mn-line)] pb-3">
            <h2 className="font-display text-3xl sm:text-4xl text-[var(--mn-paper)] uppercase tracking-wide">
              MANGÁS EM ALTA
            </h2>
            {onNavigateToCatalog && (
              <button
                type="button"
                onClick={onNavigateToCatalog}
                className="flex items-center gap-1 font-pixel text-[12px] text-[var(--mn-yellow)] hover:underline"
              >
                VER TODOS <ArrowRight size={13} aria-hidden="true" />
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-2">
            {trendingManga.slice(0, 5).map((work, idx) => (
              <RankRow key={work.id} rank={idx + 1} work={work} onSelect={onSelectWork} />
            ))}
          </div>
        </section>
      )}

      {/* EM ALTA: LIGHT NOVELS */}
      {hasNovel && (
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b-2 border-[var(--mn-line)] pb-3">
            <h2 className="font-display text-3xl sm:text-4xl text-[var(--mn-paper)] uppercase tracking-wide">
              LIGHT NOVELS EM ALTA
            </h2>
            {onNavigateToCatalog && (
              <button
                type="button"
                onClick={onNavigateToCatalog}
                className="flex items-center gap-1 font-pixel text-[12px] text-[var(--mn-yellow)] hover:underline"
              >
                VER TODAS <ArrowRight size={13} aria-hidden="true" />
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-2">
            {trendingLightNovel.slice(0, 5).map((work, idx) => (
              <RankRow key={work.id} rank={idx + 1} work={work} onSelect={onSelectWork} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}

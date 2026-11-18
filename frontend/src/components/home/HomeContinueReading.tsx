import { Work, Chapter } from '../../types';
import { ReadingProgressDto } from '../../api/authApi';
import { Win } from '../ui/Win';
import { Cover } from '../ui/Cover';
import { FormatBadge } from '../ui/FormatBadge';
import { isLightNovel, chapterLabel } from '../../utils/formatMeta';

export interface HomeContinueReadingProps {
  progress: ReadingProgressDto | null;
  progressWork: Work | null;
  progressChapter: Chapter | null;
  onOpenChapter: (work: Work, chapter: Chapter, page?: number) => void;
  onSelectWork: (work: Work) => void;
}

export function HomeContinueReading({
  progress,
  progressWork,
  progressChapter,
  onOpenChapter,
  onSelectWork,
}: HomeContinueReadingProps) {
  if (!progress || !progressWork || !progressChapter) {
    return null;
  }

  return (
    <section className="space-y-3 max-w-xl">
      <h2 className="font-display text-2xl text-[var(--mn-paper)] uppercase tracking-wide">CONTINUAR LENDO</h2>
      <Win title="CONTINUAR LENDO">
        <div className="flex items-center gap-4">
          <div className="w-[68px] h-[102px] shrink-0 border border-[var(--mn-line)]">
            <Cover src={progressWork.coverUrl} title={progressWork.title} aspectRatio="2/3" dropShadow={false} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <FormatBadge format={progressWork.format} />
              <span className="font-pixel text-[12px] text-[var(--mn-yellow)] block uppercase tracking-wider">
                {isLightNovel(progressWork.format)
                  ? `CAP. ${progress.chapterNumber ?? 1}`
                  : `PÁG. ${progress.page ?? 1}/${progress.totalPages ?? 1}`}
              </span>
            </div>
            <h4 className="font-display text-lg text-[var(--mn-paper)] truncate uppercase mt-1">
              {progressWork.title}
            </h4>
            <p className="font-body text-xs text-[var(--mn-mute)] truncate">
              {chapterLabel(progressWork.format, progress.chapterNumber ?? 1)} — {progress.chapterTitle}
            </p>

            {(progress.totalPages ?? 0) > 1 && (
              <div className="mt-2 h-1.5 w-full bg-[var(--mn-line)] border border-[var(--mn-line)]" aria-hidden="true">
                <div
                  className="h-full bg-[var(--mn-yellow)]"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.round(((progress.page ?? 1) / (progress.totalPages ?? 1)) * 100)
                    )}%`,
                  }}
                />
              </div>
            )}
          </div>

          <div className="shrink-0 flex flex-col gap-1.5">
            <button
              type="button"
              onClick={() => onOpenChapter(progressWork, progressChapter, progress.page ?? undefined)}
              className="px-3.5 py-2 bg-[var(--mn-yellow)] text-[var(--mn-ink)] font-pixel text-[12px] uppercase border-2 border-[var(--mn-ink)] shadow-[3px_3px_0_var(--mn-ink)]"
            >
              CONTINUAR
            </button>
            <button
              type="button"
              onClick={() => onSelectWork(progressWork)}
              className="px-3.5 py-1 font-pixel text-[12px] uppercase text-[var(--mn-mute)] hover:text-[var(--mn-yellow)]"
            >
              FICHA
            </button>
          </div>
        </div>
      </Win>
    </section>
  );
}

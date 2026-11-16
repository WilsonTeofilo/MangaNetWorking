import { Star } from 'lucide-react';
import { Work, Chapter } from '../../types';

interface ReaderNavigationFooterProps {
  work: Work;
  chapter: Chapter;
  isFavorited: boolean;
  onToggleFavorite: () => void;
  onNavigateChapter: (nextNumber: number) => void;
}

export function ReaderNavigationFooter({
  work,
  chapter,
  isFavorited,
  onToggleFavorite,
  onNavigateChapter,
}: ReaderNavigationFooterProps) {
  return (
    <footer className="sticky bottom-0 bg-[var(--mn-ink)] border-t border-[var(--mn-line)] px-4 py-2.5 flex items-center justify-between">
      <button
        type="button"
        onClick={onToggleFavorite}
        className={`px-3 py-1.5 font-display text-xs uppercase flex items-center gap-1.5 border transition-all ${
          isFavorited
            ? 'bg-[var(--mn-yellow)] text-[var(--mn-ink)] border-[var(--mn-ink)]'
            : 'bg-[var(--mn-ink-2)] text-[var(--mn-mute)] border-[var(--mn-line)] hover:text-[var(--mn-paper)]'
        }`}
      >
        <Star size={14} className={isFavorited ? 'fill-[var(--mn-ink)]' : ''} />
        <span>{isFavorited ? 'FAVORITADO' : 'FAVORITAR'}</span>
      </button>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onNavigateChapter(chapter.number - 1)}
          disabled={chapter.number <= 1}
          className="px-3 py-1 font-pixel text-[12px] uppercase border border-[var(--mn-line)] bg-[var(--mn-ink-2)] text-[var(--mn-mute)] hover:text-[var(--mn-paper)] disabled:opacity-30 disabled:cursor-not-allowed"
        >
          CAP. ANTERIOR
        </button>

        <button
          type="button"
          onClick={() => onNavigateChapter(chapter.number + 1)}
          disabled={chapter.number >= (work.totalChapters || 10)}
          className="px-3 py-1 font-pixel text-[12px] uppercase border-2 border-[var(--mn-ink)] bg-[var(--mn-yellow)] text-[var(--mn-ink)] font-bold hover:bg-[var(--mn-yellow-press)] disabled:opacity-30 disabled:cursor-not-allowed"
        >
          PRÓXIMO CAP.
        </button>
      </div>
    </footer>
  );
}

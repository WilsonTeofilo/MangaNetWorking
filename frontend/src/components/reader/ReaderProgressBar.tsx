interface ReaderProgressBarProps {
  chapterFormat: 'IMAGE_PAGES' | 'PROSE';
  currentPage: number;
  totalPages: number;
}

export function ReaderProgressBar({
  chapterFormat,
  currentPage,
  totalPages,
}: ReaderProgressBarProps) {
  if (chapterFormat === 'PROSE') {
    return (
      <div className="w-full h-1 bg-[var(--mn-ink-2)] sticky top-14 z-30" aria-hidden="true">
        <div
          id="prose-progress-bar-top"
          className="h-full bg-[var(--mn-yellow)] transition-all duration-200"
          style={{ width: '0%' }}
        />
      </div>
    );
  }

  return (
    <div className="w-full h-1 bg-[var(--mn-ink-2)]">
      <div
        className="h-full bg-[var(--mn-yellow)] transition-all duration-100"
        style={{ width: `${(currentPage / Math.max(1, totalPages)) * 100}%` }}
      />
    </div>
  );
}

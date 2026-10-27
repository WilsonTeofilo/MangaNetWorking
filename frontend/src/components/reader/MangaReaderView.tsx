import React, { useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../ui/Button';
import { ReadingMode } from './readerTypes';
import { ChapterEndPanel } from './ChapterEndPanel';

interface MangaReaderViewProps {
  readingMode: ReadingMode;
  pages: string[];
  currentPage: number;
  totalPages: number;
  chapterNumber: number;
  totalChapters: number;
  workTitle: string;
  chapterFinished: boolean;
  chapterLiked: boolean;
  chapterLikes: number;
  likePending: boolean;
  likeNotice: string | null;
  supportEnabled: boolean;
  membershipPriceBrl: number | null;
  authorId: string;
  authorName: string;
  workId: string;
  adOpen: boolean;
  firstPageRef: React.RefObject<HTMLDivElement | null>;
  onPageChange: (page: number) => void;
  onFinishChapter: () => void;
  onNavigateChapter: (nextNumber: number) => void;
  onBack: () => void;
  onReplay: () => void;
  onToggleLike: () => void;
  onOpenDonate: (authorId: string, authorName: string, workTitle: string, workId: string) => void;
}

export function MangaReaderView({
  readingMode,
  pages,
  currentPage,
  totalPages,
  chapterNumber,
  totalChapters,
  workTitle,
  chapterFinished,
  chapterLiked,
  chapterLikes,
  likePending,
  likeNotice,
  supportEnabled,
  membershipPriceBrl,
  authorId,
  authorName,
  workId,
  adOpen,
  firstPageRef,
  onPageChange,
  onFinishChapter,
  onNavigateChapter,
  onBack,
  onReplay,
  onToggleLike,
  onOpenDonate,
}: MangaReaderViewProps) {
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    } else {
      onFinishChapter();
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  // Atalhos de teclado no modo paginado (setas e espaço)
  useEffect(() => {
    if (readingMode !== 'paginated' || adOpen || chapterFinished) {
      return;
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        handleNextPage();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevPage();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [readingMode, adOpen, currentPage, totalPages, chapterFinished]);

  // Modo vertical: calcula a página mais visível para atualizar o contador
  useEffect(() => {
    if (readingMode !== 'vertical') {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting);
        if (visible.length === 0) return;
        const mostVisible = visible.reduce((best, entry) =>
          entry.intersectionRatio > best.intersectionRatio ? entry : best
        );
        const page = Number((mostVisible.target as HTMLElement).dataset.page);
        if (page > 0) {
          onPageChange(page);
        }
      },
      { threshold: 0, rootMargin: '-12% 0px -82% 0px' }
    );
    pageRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [readingMode, pages, onPageChange]);

  // Modo vertical: observador do sentinela de fim
  useEffect(() => {
    if (readingMode !== 'vertical' || chapterFinished) {
      return;
    }
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          onFinishChapter();
        }
      },
      { threshold: 0.25 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [readingMode, chapterFinished, pages, onFinishChapter]);

  const endPanel = (
    <ChapterEndPanel
      chapterNumber={chapterNumber}
      totalChapters={totalChapters}
      chapterLiked={chapterLiked}
      chapterLikes={chapterLikes}
      likePending={likePending}
      likeNotice={likeNotice}
      supportEnabled={supportEnabled}
      membershipPriceBrl={membershipPriceBrl}
      authorId={authorId}
      authorName={authorName}
      workId={workId}
      workTitle={workTitle}
      onNavigateChapter={onNavigateChapter}
      onBack={onBack}
      onReplay={onReplay}
      onToggleLike={onToggleLike}
      onOpenDonate={onOpenDonate}
    />
  );

  if (readingMode === 'vertical') {
    return (
      <>
        <div className="w-full space-y-1">
          {pages.map((pageUrl, idx) => (
            <div
              key={idx}
              data-page={idx + 1}
              ref={(el) => {
                pageRefs.current[idx] = el;
                if (idx === 0 && firstPageRef) {
                  (firstPageRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
                }
              }}
              className="relative w-full bg-[#000000]"
            >
              <img
                src={pageUrl}
                alt={`Página ${idx + 1} de ${workTitle}`}
                className="w-full h-auto object-contain select-none"
                loading="lazy"
              />
            </div>
          ))}
        </div>
        {pages.length === 0 && (
          <p role="status" className="p-8 text-[var(--mn-mute)]">
            Este capítulo ainda não tem páginas disponíveis.
          </p>
        )}

        <div ref={sentinelRef} aria-hidden="true" className="w-full h-12" />

        {chapterFinished && endPanel}
      </>
    );
  }

  // Modo Paginado
  if (chapterFinished) {
    return endPanel;
  }

  return (
    <>
      <div
        ref={firstPageRef}
        className="relative w-full overflow-hidden bg-[#000000] flex justify-center"
      >
        <img
          src={pages[currentPage - 1] || pages[0] || ''}
          alt={`Página ${currentPage} de ${workTitle}`}
          className="w-full h-auto object-contain select-none max-h-[85vh]"
        />
      </div>

      {/* Navegação Entre Páginas */}
      <div className="flex items-center justify-between w-full mt-4 bg-[var(--mn-ink-2)] border border-[var(--mn-line)] p-3">
        <Button
          type="button"
          variant="secondary"
          onClick={handlePrevPage}
          disabled={currentPage === 1}
          className="!min-h-[36px] !text-xs !px-3"
        >
          <ChevronLeft size={14} className="mr-1" /> ANTERIOR
        </Button>

        <span className="font-pixel text-[12px] text-[var(--mn-mute)] tabular-nums">
          {currentPage} DE {totalPages}
        </span>

        <Button
          type="button"
          variant="primary"
          onClick={handleNextPage}
          className="!min-h-[36px] !text-xs !px-3"
        >
          {currentPage === totalPages ? 'FINALIZAR' : 'PRÓXIMA'}
          <ChevronRight size={14} className="ml-1" />
        </Button>
      </div>
    </>
  );
}

import React, { useEffect, useRef, useState } from 'react';
import { userApi } from '../../api/authApi';
import { ProseBlock } from './readerTypes';

const PROSE_CHECKPOINTS = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

interface UseReaderTelemetryProps {
  workId: string;
  chapterId: string;
  chapterFormat: 'IMAGE_PAGES' | 'PROSE';
  currentPage: number;
  totalPages: number;
  proseBlocks: ProseBlock[];
  chapterFinished: boolean;
  firstPageRef: React.RefObject<HTMLDivElement | null>;
  onFinishChapter: () => void;
}

export function useReaderTelemetry({
  workId,
  chapterId,
  chapterFormat,
  currentPage,
  totalPages,
  proseBlocks,
  chapterFinished,
  firstPageRef,
  onFinishChapter,
}: UseReaderTelemetryProps) {
  const [viewQualified, setViewQualified] = useState(false);
  const checkpointsSentRef = useRef<Set<number>>(new Set());

  // Reset por capítulo
  useEffect(() => {
    setViewQualified(false);
    checkpointsSentRef.current.clear();
  }, [chapterId]);

  // Qualificação da visualização:
  // Prosa: após 1s de permanência na tela.
  // Mangá: primeira página com >= 50% de visibilidade por 1s ou avanço de página.
  useEffect(() => {
    if (viewQualified) {
      return;
    }
    if (chapterFormat === 'PROSE') {
      const timer = window.setTimeout(() => setViewQualified(true), 1000);
      return () => window.clearTimeout(timer);
    }
    if (currentPage > 1) {
      setViewQualified(true);
      return;
    }
    const el = firstPageRef.current;
    if (!el) {
      return;
    }
    let timer: number | undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.some(
          (entry) => entry.isIntersecting && entry.intersectionRatio >= 0.5
        );
        if (visible) {
          if (timer === undefined) {
            timer = window.setTimeout(() => setViewQualified(true), 1000);
          }
        } else if (timer !== undefined) {
          window.clearTimeout(timer);
          timer = undefined;
        }
      },
      { threshold: [0, 0.5, 1] }
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      if (timer !== undefined) {
        window.clearTimeout(timer);
      }
    };
  }, [chapterId, chapterFormat, currentPage, viewQualified, firstPageRef]);

  // Rastreio de leitura contínua no MongoDB após qualificação
  useEffect(() => {
    if (!viewQualified) {
      return;
    }
    const isProse = chapterFormat === 'PROSE';
    userApi
      .trackReadingProgress({
        workId,
        chapterId,
        page: isProse ? 1 : currentPage,
        totalPages: isProse ? 1 : totalPages,
      })
      .catch(() => {});
  }, [workId, chapterId, currentPage, totalPages, chapterFormat, viewQualified]);

  // Checkpoints de retenção de prosa (10% a 100%)
  useEffect(() => {
    if (chapterFormat !== 'PROSE' || proseBlocks.length === 0) {
      return;
    }

    const handleScroll = () => {
      if (chapterFinished) return;

      const textBlocks = proseBlocks.filter((b) => b.type === 'text');
      if (textBlocks.length === 0) return;

      const blockElements = document.querySelectorAll('[data-prose-block]');
      if (blockElements.length === 0) return;

      const viewportHeight = window.innerHeight;
      let firstVisibleIndex = -1;

      blockElements.forEach((el, idx) => {
        const rect = el.getBoundingClientRect();
        const isVisible = rect.top < viewportHeight && rect.bottom > 0;
        if (isVisible && firstVisibleIndex === -1) {
          firstVisibleIndex = idx;
        }
      });

      if (firstVisibleIndex !== -1) {
        const progress = Math.round(
          (firstVisibleIndex / Math.max(1, blockElements.length - 1)) * 100
        );

        const topBar = document.getElementById('prose-progress-bar-top');
        const bottomBar = document.getElementById('prose-progress-bar');
        if (topBar) topBar.style.width = `${progress}%`;
        if (bottomBar) bottomBar.style.width = `${progress}%`;

        for (const checkpoint of PROSE_CHECKPOINTS) {
          if (progress >= checkpoint && !checkpointsSentRef.current.has(checkpoint)) {
            checkpointsSentRef.current.add(checkpoint);
            userApi
              .trackReadingProgress({
                workId,
                chapterId,
                page: 1,
                totalPages: 1,
              })
              .catch(() => {});
          }
        }

        if (progress >= 100 && !checkpointsSentRef.current.has(100)) {
          checkpointsSentRef.current.add(100);
          onFinishChapter();
        }
      }
    };

    let ticking = false;
    const throttledScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', throttledScroll, { passive: true });
    return () => window.removeEventListener('scroll', throttledScroll);
  }, [chapterFormat, proseBlocks, chapterFinished, workId, chapterId, onFinishChapter]);

  return { viewQualified };
}

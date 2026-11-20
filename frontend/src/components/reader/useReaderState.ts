import { useState, useEffect, useRef } from 'react';
import { Work, Chapter } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { workApi } from '../../api/workApi';
import { ApiError } from '../../api/client';
import { parsePagesJson } from '../../utils/apiMappers';
import { offlineStorage } from '../../services/offlineStorage';
import {
  DEFAULT_PROSE_SETTINGS,
  ProseBlock,
  ProseSettings,
  ReadingMode,
} from './readerTypes';
import { AdSlot } from '../ads/AdOverlay';

const AD_EVERY_PAGES = 30;

interface UseReaderStateProps {
  work: Work;
  chapter: Chapter;
  initialPage?: number;
  onRequireAuth?: () => void;
}

export function useReaderState({
  work,
  chapter,
  initialPage,
  onRequireAuth,
}: UseReaderStateProps) {
  const { isAuthenticated } = useAuth();

  const [currentPage, setCurrentPage] = useState(1);
  const [cumulativePages, setCumulativePages] = useState(0);
  const [adSlot, setAdSlot] = useState<AdSlot | null>(null);
  const [chapterFinished, setChapterFinished] = useState(false);
  const [pages, setPages] = useState<string[]>(chapter.pages ?? []);
  const [chapterFormat, setChapterFormat] = useState<'IMAGE_PAGES' | 'PROSE'>(
    chapter.format ?? 'IMAGE_PAGES'
  );
  const [proseContent, setProseContent] = useState<string | null>(
    chapter.format === 'PROSE' ? chapter.content ?? null : null
  );
  const [proseBlocks, setProseBlocks] = useState<ProseBlock[]>([]);
  const [earlyAccessLocked, setEarlyAccessLocked] = useState(false);
  const [chapterLikes, setChapterLikes] = useState(Number(chapter.likes ?? 0));
  const [chapterLiked, setChapterLiked] = useState(Boolean(chapter.likedByMe));
  const [likePending, setLikePending] = useState(false);
  const [likeNotice, setLikeNotice] = useState<string | null>(null);
  const [supportEnabled, setSupportEnabled] = useState(false);
  const [membershipPriceBrl, setMembershipPriceBrl] = useState<number | null>(null);

  const [readingMode, setReadingMode] = useState<ReadingMode>(() => {
    try {
      return window.localStorage.getItem('mn-reader-mode') === 'vertical' ? 'vertical' : 'paginated';
    } catch {
      return 'paginated';
    }
  });

  const [proseSettings, setProseSettings] = useState<ProseSettings>(() => {
    try {
      const raw = window.localStorage.getItem('mn-prose-settings');
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          fontSize: Number(parsed.fontSize) || DEFAULT_PROSE_SETTINGS.fontSize,
          lineHeight: Number(parsed.lineHeight) || DEFAULT_PROSE_SETTINGS.lineHeight,
          maxWidth: Number(parsed.maxWidth) || DEFAULT_PROSE_SETTINGS.maxWidth,
          serif: parsed.serif !== false,
        };
      }
    } catch {}
    return DEFAULT_PROSE_SETTINGS;
  });

  const updateProseSettings = (patch: Partial<ProseSettings>) => {
    setProseSettings((cur) => {
      const next = { ...cur, ...patch };
      try {
        window.localStorage.setItem('mn-prose-settings', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const changeReadingMode = (mode: ReadingMode) => {
    setReadingMode(mode);
    try {
      window.localStorage.setItem('mn-reader-mode', mode);
    } catch {}
    window.scrollTo({ top: 0 });
  };

  const firstPageRef = useRef<HTMLDivElement | null>(null);
  const lastCountedPageRef = useRef(1);
  const endTriggeredRef = useRef(false);
  const initialPageAppliedRef = useRef<string | null>(null);

  const finishChapter = () => {
    if (endTriggeredRef.current) return;
    endTriggeredRef.current = true;
    setChapterFinished(true);
    setAdSlot('end');
  };

  const replayChapter = () => {
    endTriggeredRef.current = false;
    lastCountedPageRef.current = 1;
    setCumulativePages(0);
    setChapterFinished(false);
    setCurrentPage(1);
    window.scrollTo({ top: 0 });
  };

  const handleToggleChapterLike = async () => {
    if (!isAuthenticated) {
      if (onRequireAuth) onRequireAuth();
      else setLikeNotice('Entre na sua conta para curtir este capítulo.');
      return;
    }
    if (likePending) return;

    const prevLiked = chapterLiked;
    const prevCount = chapterLikes;
    setChapterLiked(!prevLiked);
    setChapterLikes(Math.max(0, prevCount + (prevLiked ? -1 : 1)));
    setLikePending(true);

    try {
      const res = await workApi.toggleChapterLike(work.id, chapter.number);
      setChapterLiked(res.liked);
      setChapterLikes(res.totalLikes);
      setLikeNotice(null);
    } catch {
      setChapterLiked(prevLiked);
      setChapterLikes(prevCount);
      setLikeNotice('Não foi possível registrar a curtida. Tente novamente.');
    } finally {
      setLikePending(false);
    }
  };

  // Carregamento de páginas reais e metadados
  useEffect(() => {
    let active = true;
    setEarlyAccessLocked(false);
    setChapterFormat(chapter.format ?? 'IMAGE_PAGES');
    setProseContent(chapter.format === 'PROSE' ? chapter.content ?? null : null);
    setProseBlocks([]);
    setCurrentPage(initialPage && initialPage > 1 ? initialPage : 1);
    setChapterFinished(false);
    setCumulativePages(0);
    setChapterLikes(Number(chapter.likes ?? 0));
    setChapterLiked(Boolean(chapter.likedByMe));
    setLikeNotice(null);
    setSupportEnabled(false);
    setMembershipPriceBrl(null);
    lastCountedPageRef.current = 1;
    endTriggeredRef.current = false;
    initialPageAppliedRef.current = null;
    setAdSlot('start');

    const offlineMeta = offlineStorage.getOfflineChapters().find((c) => c.chapterId === chapter.id);
    if (offlineMeta && offlineMeta.pages.length > 0) {
      setPages(offlineMeta.pages);
    } else {
      setPages(chapter.pages ?? []);
    }

    workApi
      .readChapter(work.slug, chapter.number)
      .then((resp) => {
        if (!active) return;
        setChapterLikes(Number(resp.likes ?? 0));
        setChapterLiked(Boolean(resp.likedByMe));
        setSupportEnabled(Boolean(resp.supportEnabled));
        setMembershipPriceBrl(resp.membershipPriceBrl ?? null);

        if (resp.format === 'PROSE') {
          setChapterFormat('PROSE');
          setProseContent(resp.content ?? '');
          if (resp.blocksJson) {
            try {
              const blocksDto = JSON.parse(resp.blocksJson);
              setProseBlocks(blocksDto.blocks || []);
            } catch {
              setProseBlocks([]);
            }
          }
          setPages([]);
          return;
        }

        setChapterFormat('IMAGE_PAGES');
        setProseContent(null);
        setProseBlocks([]);
        const realPages = parsePagesJson(resp.pagesJson);
        if (realPages.length > 0) {
          setPages(realPages);
        }
      })
      .catch((err) => {
        if (!active) return;
        if (err instanceof ApiError && err.status === 403) {
          setEarlyAccessLocked(true);
        } else if (offlineMeta && offlineMeta.pages.length > 0) {
          setPages(offlineMeta.pages);
        }
      });

    return () => {
      active = false;
    };
  }, [work.slug, chapter.number, chapter.pages, chapter.format, chapter.content, chapter.blocksJson]);

  // Retomada da página salva (Manga)
  useEffect(() => {
    if (!initialPage || initialPage < 1 || chapterFormat === 'PROSE') return;
    if (initialPageAppliedRef.current === chapter.id) return;
    const limit = pages.length || chapter.pages?.length || 0;
    if (limit <= 0) return;
    setCurrentPage(Math.min(initialPage, limit));
    initialPageAppliedRef.current = chapter.id;
  }, [initialPage, pages.length, chapter.id, chapter.pages, chapterFormat]);

  // Retomada da página salva (Prosa / Light Novel)
  useEffect(() => {
    if (chapterFormat !== 'PROSE' || !initialPage || initialPage <= 1) return;
    if (initialPageAppliedRef.current === chapter.id) return;
    if (proseBlocks.length === 0 && !proseContent) return;

    const timer = window.setTimeout(() => {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (maxScroll > 0) {
        const targetScroll = (maxScroll * Math.min(100, initialPage)) / 100;
        window.scrollTo({ top: targetScroll, behavior: 'auto' });
        initialPageAppliedRef.current = chapter.id;

        const topBar = document.getElementById('prose-progress-bar-top');
        const bottomBar = document.getElementById('prose-progress-bar');
        const pct = Math.min(100, Math.max(0, initialPage));
        if (topBar) topBar.style.width = `${pct}%`;
        if (bottomBar) bottomBar.style.width = `${pct}%`;
      }
    }, 50);

    return () => window.clearTimeout(timer);
  }, [chapterFormat, initialPage, proseBlocks.length, proseContent, chapter.id]);

  useEffect(() => {
    if (!initialPage || initialPage <= 1) {
      window.scrollTo({ top: 0 });
    }
  }, [work.slug, chapter.number, initialPage]);

  // Anúncio a cada 30 páginas lidas (apenas imagem)
  useEffect(() => {
    if (chapterFormat === 'PROSE') return;
    if (currentPage <= lastCountedPageRef.current) return;
    const adv = currentPage - lastCountedPageRef.current;
    lastCountedPageRef.current = currentPage;
    const next = cumulativePages + adv;
    if (next >= AD_EVERY_PAGES) {
      setCumulativePages(0);
      setAdSlot('mid');
    } else {
      setCumulativePages(next);
    }
  }, [currentPage, cumulativePages, chapterFormat]);

  const totalPages = pages.length || chapter.pages?.length || 24;

  return {
    currentPage,
    setCurrentPage,
    cumulativePages,
    adSlot,
    setAdSlot,
    chapterFinished,
    pages,
    chapterFormat,
    proseContent,
    proseBlocks,
    earlyAccessLocked,
    chapterLikes,
    chapterLiked,
    likePending,
    likeNotice,
    supportEnabled,
    membershipPriceBrl,
    readingMode,
    changeReadingMode,
    proseSettings,
    updateProseSettings,
    firstPageRef,
    finishChapter,
    replayChapter,
    handleToggleChapterLike,
    totalPages,
  };
}

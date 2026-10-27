import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, BookOpen, Flag, ScrollText, Star } from 'lucide-react';
import { Work, Chapter } from '../types';
import { useAuth } from '../context/AuthContext';
import { useModals } from '../context/ModalContext';
import { workApi } from '../api/workApi';
import { ApiError } from '../api/client';
import { parsePagesJson } from '../utils/apiMappers';
import { Button } from '../components/ui/Button';
import { AdOverlay, AdSlot } from '../components/ads/AdOverlay';
import { WorkCommentsPanel } from '../components/comments/WorkCommentsPanel';
import { offlineStorage } from '../services/offlineStorage';
import {
  DEFAULT_PROSE_SETTINGS,
  ProseBlock,
  ProseSettings,
  ReadingMode,
} from '../components/reader/readerTypes';
import { ReaderProseSettingsBar } from '../components/reader/ReaderProseSettingsBar';
import { ProseReaderView } from '../components/reader/ProseReaderView';
import { MangaReaderView } from '../components/reader/MangaReaderView';
import { useReaderTelemetry } from '../components/reader/useReaderTelemetry';

interface ReaderPageProps {
  work: Work;
  chapter: Chapter;
  initialPage?: number;
  onBack: () => void;
  onNavigateChapter: (nextNumber: number) => void;
  onRequireAuth?: () => void;
}

const AD_SECONDS = 15;
const AD_EVERY_PAGES = 30;

export function ReaderPage({
  work,
  chapter,
  initialPage,
  onBack,
  onNavigateChapter,
  onRequireAuth,
}: ReaderPageProps) {
  const { user, toggleFavorite, isAuthenticated } = useAuth();
  const { openDonate, openReport } = useModals();

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
    setCurrentPage(1);
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

  // Retomada da página salva
  useEffect(() => {
    if (!initialPage || initialPage < 1 || chapterFormat === 'PROSE') return;
    if (initialPageAppliedRef.current === chapter.id) return;
    const limit = pages.length || chapter.pages?.length || 0;
    if (limit <= 0) return;
    setCurrentPage(Math.min(initialPage, limit));
    initialPageAppliedRef.current = chapter.id;
  }, [initialPage, pages.length, chapter.id, chapter.pages, chapterFormat]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [work.slug, chapter.number]);

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
  const isLiked = user.favorites.includes(work.id);

  // Hook isolado de telemetria e checkpoints
  useReaderTelemetry({
    workId: work.id,
    chapterId: chapter.id,
    chapterFormat,
    currentPage,
    totalPages,
    proseBlocks,
    chapterFinished,
    firstPageRef,
    onFinishChapter: finishChapter,
  });

  return (
    <div className="min-h-screen bg-[var(--mn-ink)] text-[var(--mn-paper)] flex flex-col select-none font-body">
      {/* 1. Header do Reader */}
      <header className="sticky top-0 z-40 bg-[var(--mn-ink)] border-b border-[var(--mn-line)] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-1.5 border border-[var(--mn-line)] bg-[var(--mn-ink-2)] text-[var(--mn-mute)] hover:text-[var(--mn-paper)] hover:border-[var(--mn-paper)] transition-colors"
            aria-label="Voltar para a ficha da obra"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h3 className="font-display text-base tracking-wide text-[var(--mn-paper)] uppercase leading-none truncate max-w-xs sm:max-w-md">
              {work.title}
            </h3>
            <span className="font-pixel text-[12px] text-[var(--mn-yellow)] tracking-wider block mt-0.5">
              CAP. #{chapter.number} — {chapter.title}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {chapterFormat === 'PROSE' && (
            <ReaderProseSettingsBar
              settings={proseSettings}
              onUpdate={updateProseSettings}
            />
          )}

          {chapterFormat !== 'PROSE' && (
            <div className="flex items-center border border-[var(--mn-line)]" role="group" aria-label="Modo de leitura">
              <button
                type="button"
                onClick={() => changeReadingMode('paginated')}
                aria-pressed={readingMode === 'paginated'}
                title="Leitura página a página (ideal para PC)"
                className={`flex items-center gap-1 px-2 py-1 font-pixel text-[12px] uppercase transition-colors ${
                  readingMode === 'paginated'
                    ? 'bg-[var(--mn-yellow)] text-[var(--mn-ink)]'
                    : 'bg-[var(--mn-ink-2)] text-[var(--mn-mute)] hover:text-[var(--mn-paper)]'
                }`}
              >
                <BookOpen size={13} />
                <span className="hidden md:inline">PÁGINA</span>
              </button>
              <button
                type="button"
                onClick={() => changeReadingMode('vertical')}
                aria-pressed={readingMode === 'vertical'}
                title="Rolagem contínua/webtoon (ideal para celular)"
                className={`flex items-center gap-1 px-2 py-1 font-pixel text-[12px] uppercase transition-colors border-l border-[var(--mn-line)] ${
                  readingMode === 'vertical'
                    ? 'bg-[var(--mn-yellow)] text-[var(--mn-ink)]'
                    : 'bg-[var(--mn-ink-2)] text-[var(--mn-mute)] hover:text-[var(--mn-paper)]'
                }`}
              >
                <ScrollText size={13} />
                <span className="hidden md:inline">SCROLL</span>
              </button>
            </div>
          )}

          <span className="hidden sm:inline font-pixel text-[12px] text-[var(--mn-mute)] tabular-nums">
            {chapterFormat === 'PROSE' ? 'LEITURA EM PROSA (SCROLL)' : `PÁG. ${currentPage} / ${totalPages}`}
          </span>

          {supportEnabled && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => openDonate(work.authorId, work.authorName, work.title, work.id)}
              className="!min-h-[34px] !py-1 !px-3 !text-xs"
            >
              APOIAR
            </Button>
          )}

          <button
            type="button"
            onClick={() => openReport(work.id, work.title, chapter.id)}
            className="p-1.5 border border-[var(--mn-line)] bg-[var(--mn-ink-2)] text-[var(--mn-mute)] hover:text-[var(--mn-red)] hover:border-[var(--mn-red)] transition-colors"
            title="Denunciar pirataria, pornografia ou violação"
          >
            <Flag size={14} />
          </button>
        </div>
      </header>

      {/* 2. Barra de Progresso Fina no Topo */}
      {chapterFormat === 'PROSE' ? (
        <div className="w-full h-1 bg-[var(--mn-ink-2)] sticky top-14 z-30" aria-hidden="true">
          <div
            id="prose-progress-bar-top"
            className="h-full bg-[var(--mn-yellow)] transition-all duration-200"
            style={{ width: '0%' }}
          />
        </div>
      ) : (
        <div className="w-full h-1 bg-[var(--mn-ink-2)]">
          <div
            className="h-full bg-[var(--mn-yellow)] transition-all duration-100"
            style={{ width: `${(currentPage / totalPages) * 100}%` }}
          />
        </div>
      )}

      {/* 3. Área Principal do Leitor */}
      <main className="flex-1 max-w-[800px] mx-auto w-full py-4 px-2 flex flex-col items-center">
        {earlyAccessLocked ? (
          <div className="w-full bg-[var(--mn-ink-2)] border border-[var(--mn-line)] p-10 text-center space-y-3">
            <h3 className="font-display text-2xl text-[var(--mn-yellow)] uppercase">
              ACESSO ANTECIPADO PARA MEMBROS
            </h3>
            <p className="font-body text-sm text-[var(--mn-mute)] max-w-md mx-auto">
              Este capítulo é exclusivo para membros oficiais de {work.authorName}.
              Torne-se membro na página da obra para ler agora.
            </p>
            <Button type="button" variant="primary" onClick={onBack} className="!min-h-[36px] !text-xs">
              VOLTAR À OBRA
            </Button>
          </div>
        ) : chapterFormat === 'PROSE' ? (
          <ProseReaderView
            chapterNumber={chapter.number}
            totalChapters={work.totalChapters || chapter.number}
            proseBlocks={proseBlocks}
            proseContent={proseContent}
            proseSettings={proseSettings}
            chapterFinished={chapterFinished}
            chapterLiked={chapterLiked}
            chapterLikes={chapterLikes}
            likePending={likePending}
            likeNotice={likeNotice}
            supportEnabled={supportEnabled}
            membershipPriceBrl={membershipPriceBrl}
            authorId={work.authorId}
            authorName={work.authorName}
            workId={work.id}
            workTitle={work.title}
            onNavigateChapter={onNavigateChapter}
            onBack={onBack}
            onReplay={replayChapter}
            onToggleLike={handleToggleChapterLike}
            onOpenDonate={openDonate}
          />
        ) : (
          <MangaReaderView
            readingMode={readingMode}
            pages={pages}
            currentPage={currentPage}
            totalPages={totalPages}
            chapterNumber={chapter.number}
            totalChapters={work.totalChapters || chapter.number}
            workTitle={work.title}
            chapterFinished={chapterFinished}
            chapterLiked={chapterLiked}
            chapterLikes={chapterLikes}
            likePending={likePending}
            likeNotice={likeNotice}
            supportEnabled={supportEnabled}
            membershipPriceBrl={membershipPriceBrl}
            authorId={work.authorId}
            authorName={work.authorName}
            workId={work.id}
            adOpen={adSlot !== null}
            firstPageRef={firstPageRef}
            onPageChange={setCurrentPage}
            onFinishChapter={finishChapter}
            onNavigateChapter={onNavigateChapter}
            onBack={onBack}
            onReplay={replayChapter}
            onToggleLike={handleToggleChapterLike}
            onOpenDonate={openDonate}
          />
        )}

        <div className="mt-8 w-full">
          <WorkCommentsPanel
            workId={work.id}
            chapterId={chapter.id}
            heading={`COMENTÁRIOS DO CAP. #${chapter.number}`}
            onRequireAuth={onRequireAuth}
          />
        </div>
      </main>

      {/* 4. Footer com Favoritar e Navegação */}
      <footer className="sticky bottom-0 bg-[var(--mn-ink)] border-t border-[var(--mn-line)] px-4 py-2.5 flex items-center justify-between">
        <button
          type="button"
          onClick={() => toggleFavorite(work.id)}
          className={`px-3 py-1.5 font-display text-xs uppercase flex items-center gap-1.5 border transition-all ${
            isLiked
              ? 'bg-[var(--mn-yellow)] text-[var(--mn-ink)] border-[var(--mn-ink)]'
              : 'bg-[var(--mn-ink-2)] text-[var(--mn-mute)] border-[var(--mn-line)] hover:text-[var(--mn-paper)]'
          }`}
        >
          <Star size={14} className={isLiked ? 'fill-[var(--mn-ink)]' : ''} />
          <span>{isLiked ? 'FAVORITADO' : 'FAVORITAR'}</span>
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

      {/* 5. Anúncio em Overlay */}
      <AdOverlay
        open={adSlot !== null}
        slot={adSlot ?? 'start'}
        seconds={AD_SECONDS}
        workTitle={work.title}
        creatorName={work.authorName}
        onComplete={() => setAdSlot(null)}
      />
    </div>
  );
}

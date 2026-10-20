import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, Heart, Flag, BookOpen, ScrollText } from 'lucide-react';
import { Work, Chapter } from '../types';
import { useAuth } from '../context/AuthContext';
import { useModals } from '../context/ModalContext';
import { userApi } from '../api/authApi';
import { workApi } from '../api/workApi';
import { ApiError } from '../api/client';
import { parsePagesJson } from '../utils/apiMappers';
import { Button } from '../components/ui/Button';
import { AdOverlay } from '../components/ads/AdOverlay';
import type { AdSlot } from '../components/ads/AdOverlay';
import { offlineStorage } from '../services/offlineStorage';

interface ReaderPageProps {
  work: Work;
  chapter: Chapter;
  onBack: () => void;
  onNavigateChapter: (nextNumber: number) => void;
}

// Anúncio é por CAPÍTULO, não por página: 15s ao abrir e 15s ao terminar,
// além de um intervalo a cada 30 páginas lidas.
const AD_SECONDS = 15;
const AD_EVERY_PAGES = 30;

export function ReaderPage({ work, chapter, onBack, onNavigateChapter }: ReaderPageProps) {
  const { user, toggleFavorite } = useAuth();
  const { openDonate, openReport } = useModals();

  const [currentPage, setCurrentPage] = useState(1);
  const [cumulativePages, setCumulativePages] = useState(0);
  const [adSlot, setAdSlot] = useState<AdSlot | null>(null);
  const [chapterFinished, setChapterFinished] = useState(false);
  // Páginas reais do capítulo (API ou cache offline PWA) com fallback para as páginas do mock.
  const [pages, setPages] = useState<string[]>(chapter.pages ?? []);
  const [chapterFormat, setChapterFormat] = useState<'IMAGE_PAGES' | 'PROSE'>(chapter.format ?? 'IMAGE_PAGES');
  const [proseContent, setProseContent] = useState<string | null>(chapter.format === 'PROSE' ? chapter.content ?? null : null);
  const [earlyAccessLocked, setEarlyAccessLocked] = useState(false);

  // Modo de leitura: paginado (PC, página a página) ou vertical (webtoon, rolagem livre/celular).
  // A preferência fica gravada no navegador.
  const [readingMode, setReadingMode] = useState<'paginated' | 'vertical'>(() => {
    try {
      return window.localStorage.getItem('mn-reader-mode') === 'vertical' ? 'vertical' : 'paginated';
    } catch {
      return 'paginated';
    }
  });
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const lastCountedPageRef = useRef(1);
  const endTriggeredRef = useRef(false);

  const changeReadingMode = (mode: 'paginated' | 'vertical') => {
    setReadingMode(mode);
    try {
      window.localStorage.setItem('mn-reader-mode', mode);
    } catch {
      // localStorage indisponível (modo privado): segue só na sessão atual.
    }
    // Volta ao topo para não "cair no meio" ao trocar de modo.
    window.scrollTo({ top: 0 });
  };

  const isLiked = user.favorites.includes(work.id);
  const totalPages = pages.length || chapter.pages?.length || 24;

  const finishChapter = () => {
    if (endTriggeredRef.current) {
      return;
    }
    endTriggeredRef.current = true;
    setChapterFinished(true);
    // Anúncio de fim de capítulo (15s). Nota: hoje aparece para todos; o gate por
    // plano (VIP/membros) e o crédito real da receita entram server-side com o provedor.
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

  // Carrega as páginas reais do capítulo (online ou offline PWA)
  useEffect(() => {
    let active = true;
    setEarlyAccessLocked(false);
    setChapterFormat(chapter.format ?? 'IMAGE_PAGES');
    setProseContent(chapter.format === 'PROSE' ? chapter.content ?? null : null);
    setCurrentPage(1);
    setChapterFinished(false);
    setCumulativePages(0);
    lastCountedPageRef.current = 1;
    endTriggeredRef.current = false;
    // Anúncio de abertura do capítulo (15s).
    setAdSlot('start');

    // 1. Verifica se o capítulo já está baixado no storage offline
    const offlineMeta = offlineStorage.getOfflineChapters().find((c) => c.chapterId === chapter.id);
    if (offlineMeta && offlineMeta.pages.length > 0) {
      setPages(offlineMeta.pages);
    } else {
      setPages(chapter.pages ?? []);
    }

    // 2. Se online, tenta sincronizar a versão mais recente da API
    workApi
      .readChapter(work.slug, chapter.number)
      .then((resp) => {
        if (!active) return;
        if (resp.format === 'PROSE') {
          setChapterFormat('PROSE');
          setProseContent(resp.content ?? '');
          setPages([]);
          return;
        }
        setChapterFormat('IMAGE_PAGES');
        setProseContent(null);
        const realPages = parsePagesJson(resp.pagesJson);
        if (realPages.length > 0) {
          setPages(realPages);
        }
      })
      .catch((err) => {
        if (!active) return;
        // 403 = capítulo em acesso antecipado sem assinatura (bloqueio autoritativo do servidor).
        if (err instanceof ApiError && err.status === 403) {
          setEarlyAccessLocked(true);
        } else if (offlineMeta && offlineMeta.pages.length > 0) {
          // Sem conexão: garante leitura offline perfeita a partir do cache local
          setPages(offlineMeta.pages);
        }
      });

    return () => {
      active = false;
    };
  }, [work.slug, chapter.number, chapter.pages, chapter.format, chapter.content]);

  // Ao trocar de capítulo, volta ao topo — essencial no modo de rolagem contínua.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [work.slug, chapter.number]);

  // Rastreio de leitura contínua no MongoDB
  useEffect(() => {
    userApi.trackReadingProgress({
      workId: work.id,
      chapterId: chapter.id,
      page: currentPage,
      totalPages,
    }).catch(() => {});
  }, [work.id, chapter.id, currentPage, totalPages]);

  // Anúncio de intervalo: a cada 30 páginas lidas, nos dois modos de leitura.
  useEffect(() => {
    if (currentPage <= lastCountedPageRef.current) {
      return;
    }
    const advanced = currentPage - lastCountedPageRef.current;
    lastCountedPageRef.current = currentPage;
    const next = cumulativePages + advanced;
    if (next >= AD_EVERY_PAGES) {
      setCumulativePages(0);
      setAdSlot('mid');
    } else {
      setCumulativePages(next);
    }
  }, [currentPage, cumulativePages]);

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    } else {
      finishChapter();
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  // Navegação por teclado acessível (somente no modo paginado; no vertical a rolagem é livre)
  useEffect(() => {
    if (readingMode !== 'paginated' || adSlot) {
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
  }, [readingMode, adSlot, currentPage, totalPages, chapterFinished]);

  // No modo vertical, a "página atual" é a mais visível na tela — mantém progresso e analytics corretos.
  useEffect(() => {
    if (readingMode !== 'vertical') {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting);
        if (visible.length === 0) {
          return;
        }
        const mostVisible = visible.reduce((best, entry) =>
          entry.intersectionRatio > best.intersectionRatio ? entry : best
        );
        const page = Number((mostVisible.target as HTMLElement).dataset.page);
        if (page > 0) {
          setCurrentPage(page);
        }
      },
      // Faixa fina perto do topo: funciona mesmo com páginas bem altas (mangá),
      // que nunca atingiriam thresholds percentuais grandes.
      { threshold: 0, rootMargin: '-12% 0px -82% 0px' }
    );
    pageRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [readingMode, pages]);

  // No modo vertical, o fim do capítulo é detectado quando o sentinela entra na tela.
  useEffect(() => {
    if (readingMode !== 'vertical' || chapterFinished) {
      return;
    }
    const el = sentinelRef.current;
    if (!el) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          finishChapter();
        }
      },
      { threshold: 0.25 }
    );
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readingMode, chapterFinished, pages, work.slug, chapter.number]);

  const chapterEndPanel = (
    <div className="w-full bg-[#151517] border-2 border-[#FFD400] p-8 text-center space-y-4 mt-4">
      <span className="font-pixel text-[12px] text-[#FFD400] uppercase tracking-widest block">
        FIM DO CAPÍTULO
      </span>
      <h3 className="font-display text-2xl text-[#F4EFE3] uppercase">
        CAP. #{chapter.number} CONCLUÍDO
      </h3>
      <p className="font-body text-sm text-[#A9A59A]">
        Valeu por ler até o fim. O próximo capítulo te espera.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {chapter.number < (work.totalChapters || chapter.number) ? (
          <Button
            type="button"
            variant="primary"
            onClick={() => onNavigateChapter(chapter.number + 1)}
            className="!min-h-[40px] !text-sm"
          >
            PRÓXIMO CAPÍTULO <ChevronRight size={14} className="ml-1" />
          </Button>
        ) : (
          <Button
            type="button"
            variant="primary"
            onClick={onBack}
            className="!min-h-[40px] !text-sm"
          >
            VOLTAR À OBRA
          </Button>
        )}
        <Button
          type="button"
          variant="secondary"
          onClick={replayChapter}
          className="!min-h-[40px] !text-sm"
        >
          RELER CAPÍTULO
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0B0B0C] text-[#F4EFE3] flex flex-col select-none font-body">

      {/* 1. Barra Superior Mínima e Sem Decoração Excessiva */}
      <header className="sticky top-0 z-40 bg-[#0B0B0C] border-b border-[#34343A] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-1.5 border border-[#34343A] bg-[#151517] text-[#A9A59A] hover:text-[#F4EFE3] hover:border-[#F4EFE3] transition-colors"
            aria-label="Voltar para a ficha da obra"
          >
            <ArrowLeft size={16} />
          </button>

          <div>
            <h3 className="font-display text-base tracking-wide text-[#F4EFE3] uppercase leading-none truncate max-w-xs sm:max-w-md">
              {work.title}
            </h3>
            <span className="font-pixel text-[12px] text-[#FFD400] tracking-wider block mt-0.5">
              CAP. #{chapter.number} — {chapter.title}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Seletor de modo de leitura: paginado (PC) x rolagem contínua (celular) */}
          <div className="flex items-center border border-[#34343A]" role="group" aria-label="Modo de leitura">
            <button
              type="button"
              onClick={() => changeReadingMode('paginated')}
              aria-pressed={readingMode === 'paginated'}
              title="Leitura página a página (ideal para PC)"
              className={`flex items-center gap-1 px-2 py-1 font-pixel text-[12px] uppercase transition-colors ${
                readingMode === 'paginated'
                  ? 'bg-[#FFD400] text-[#0B0B0C]'
                  : 'bg-[#151517] text-[#A9A59A] hover:text-[#F4EFE3]'
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
              className={`flex items-center gap-1 px-2 py-1 font-pixel text-[12px] uppercase transition-colors border-l border-[#34343A] ${
                readingMode === 'vertical'
                  ? 'bg-[#FFD400] text-[#0B0B0C]'
                  : 'bg-[#151517] text-[#A9A59A] hover:text-[#F4EFE3]'
              }`}
            >
              <ScrollText size={13} />
              <span className="hidden md:inline">SCROLL</span>
            </button>
          </div>

          <span className="hidden sm:inline font-pixel text-[12px] text-[#A9A59A] tabular-nums">
            {chapterFormat === 'PROSE' ? 'LEITURA EM PROSA' : `PÁG. ${currentPage} / ${totalPages}`}
          </span>

          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              openDonate(work.authorId, work.authorName, work.title, work.id);
            }}
            className="!min-h-[34px] !py-1 !px-3 !text-xs"
          >
            APOIAR
          </Button>

          <button
            type="button"
            onClick={() => openReport(work.id, work.title, chapter.id)}
            className="p-1.5 border border-[#34343A] bg-[#151517] text-[#A9A59A] hover:text-[#E8402F] hover:border-[#E8402F] transition-colors"
            title="Denunciar pirataria, pornografia ou violação"
          >
            <Flag size={14} />
          </button>
        </div>
      </header>

      {/* 2. Barra de Progresso Fina no Topo */}
      <div className="w-full h-1 bg-[#151517]">
        <div
          className="h-full bg-[#FFD400] transition-all duration-100"
          style={{ width: `${(currentPage / totalPages) * 100}%` }}
        />
      </div>

      {/* 3. Visualizador: paginado (PC) ou rolagem contínua/webtoon (celular) */}
      <main className="flex-1 max-w-[800px] mx-auto w-full py-4 px-2 flex flex-col items-center">
        {earlyAccessLocked ? (
          <div className="w-full bg-[#151517] border border-[#34343A] p-10 text-center space-y-3">
            <h3 className="font-display text-2xl text-[#FFD400] uppercase">
              ACESSO ANTECIPADO PARA MEMBROS
            </h3>
            <p className="font-body text-sm text-[#A9A59A] max-w-md mx-auto">
              Este capítulo é exclusivo para membros oficiais de {work.authorName}.
              Torne-se membro na página da obra para ler agora.
            </p>
            <Button type="button" variant="primary" onClick={onBack} className="!min-h-[36px] !text-xs">
              VOLTAR À OBRA
            </Button>
          </div>
        ) : chapterFormat === 'PROSE' ? (
          <article lang="pt-BR" aria-label={`Texto do capítulo ${chapter.number}`} className="w-full max-w-[720px] px-5 py-8 sm:px-10 sm:py-12 text-left font-body text-lg leading-[1.9] text-[var(--mn-paper)] whitespace-pre-wrap select-text">
            {proseContent ?? 'Carregando capítulo…'}
          </article>
        ) : readingMode === 'vertical' ? (
          /* Rolagem contínua: todas as páginas empilhadas, sem cliques */
          <>
            <div className="w-full space-y-1">
              {pages.map((pageUrl, idx) => (
                <div
                  key={idx}
                  data-page={idx + 1}
                  ref={(el) => {
                    pageRefs.current[idx] = el;
                  }}
                  className="relative w-full bg-[#000000]"
                >
                  <img
                    src={pageUrl}
                    alt={`Página ${idx + 1} de ${work.title}`}
                    className="w-full h-auto object-contain select-none"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
            {pages.length === 0 && <p role="status" className="p-8 text-[var(--mn-mute)]">Este capítulo ainda não tem páginas disponíveis.</p>}

            {/* Sentinela de fim: dispara o anúncio de encerramento ao entrar na tela */}
            <div ref={sentinelRef} aria-hidden="true" className="w-full h-12" />

            {chapterFinished && chapterEndPanel}

            <div className="pt-4 pb-2 text-center">
              <Button
                type="button"
                variant="secondary"
                onClick={() => changeReadingMode('paginated')}
                className="!min-h-[34px] !text-xs"
              >
                VOLTAR À LEITURA PÁGINA A PÁGINA
              </Button>
            </div>
          </>
        ) : chapterFinished ? (
          chapterEndPanel
        ) : (
          <>
            <div className="relative w-full overflow-hidden bg-[#000000] flex justify-center">
              <img
                src={pages[currentPage - 1] || pages[0] || ''}
                alt={`Página ${currentPage} de ${work.title}`}
                className="w-full h-auto object-contain select-none max-h-[85vh]"
              />
            </div>

            {/* Navegação Entre Páginas */}
            <div className="flex items-center justify-between w-full mt-4 bg-[#151517] border border-[#34343A] p-3">
              <Button
                type="button"
                variant="secondary"
                onClick={handlePrevPage}
                disabled={currentPage === 1}
                className="!min-h-[36px] !text-xs !px-3"
              >
                <ChevronLeft size={14} className="mr-1" /> ANTERIOR
              </Button>

              <span className="font-pixel text-[12px] text-[#A9A59A] tabular-nums">
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
        )}
      </main>

      {/* 4. Barra Inferior Mínima */}
      <footer className="sticky bottom-0 bg-[#0B0B0C] border-t border-[#34343A] px-4 py-2.5 flex items-center justify-between">
        <button
          type="button"
          onClick={() => toggleFavorite(work.id)}
          className={`px-3 py-1.5 font-display text-xs uppercase flex items-center gap-1.5 border transition-all ${
            isLiked
              ? 'bg-[#FFD400] text-[#0B0B0C] border-[#0B0B0C]'
              : 'bg-[#151517] text-[#A9A59A] border-[#34343A] hover:text-[#F4EFE3]'
          }`}
        >
          <Heart size={14} className={isLiked ? 'fill-[#0B0B0C]' : ''} />
          <span>{isLiked ? 'FAVORITADO' : 'FAVORITAR'}</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigateChapter(chapter.number - 1)}
            disabled={chapter.number <= 1}
            className="px-3 py-1 font-pixel text-[12px] uppercase border border-[#34343A] bg-[#151517] text-[#A9A59A] hover:text-[#F4EFE3] disabled:opacity-30 disabled:cursor-not-allowed"
          >
            CAP. ANTERIOR
          </button>

          <button
            type="button"
            onClick={() => onNavigateChapter(chapter.number + 1)}
            disabled={chapter.number >= (work.totalChapters || 10)}
            className="px-3 py-1 font-pixel text-[12px] uppercase border-2 border-[#0B0B0C] bg-[#FFD400] text-[#0B0B0C] font-bold hover:bg-[#E0B800] disabled:opacity-30 disabled:cursor-not-allowed"
          >
            PRÓXIMO CAP.
          </button>
        </div>
      </footer>

      {/* 5. Anúncio em overlay (abertura / intervalo / fim do capítulo) */}
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

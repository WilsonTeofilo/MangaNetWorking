import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, Heart, Star, Flag, BookOpen, ScrollText, Settings2, Minus, Plus, X } from 'lucide-react';
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
import { WorkCommentsPanel } from '../components/comments/WorkCommentsPanel';
import { offlineStorage } from '../services/offlineStorage';

interface ProseBlock {
  type: 'text' | 'illustration' | 'separator';
  content: {
    text?: string;
    fileId?: string;
    altText?: string;
    width?: number;
    height?: number;
    style?: string;
  };
}

interface ReaderPageProps {
  work: Work;
  chapter: Chapter;
  /** Página inicial (retomar a leitura). Ausente = começa na primeira. */
  initialPage?: number;
  onBack: () => void;
  onNavigateChapter: (nextNumber: number) => void;
  /** Visitante: leva para login/cadastro e volta para os comentários do capítulo. */
  onRequireAuth?: () => void;
}

// Anúncio é por CAPÍTULO, não por página: 15s ao abrir e 15s ao terminar,
// além de um intervalo a cada 30 páginas lidas.
const AD_SECONDS = 15;
const AD_EVERY_PAGES = 30;

// Checkpoints de retenção para prosa: 10%, 20%, ..., 100%
const PROSE_CHECKPOINTS = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

export function ReaderPage({ work, chapter, initialPage, onBack, onNavigateChapter, onRequireAuth }: ReaderPageProps) {
  const { user, toggleFavorite, isAuthenticated } = useAuth();
  const { openDonate, openReport } = useModals();

  const [currentPage, setCurrentPage] = useState(1);
  const [cumulativePages, setCumulativePages] = useState(0);
  const [adSlot, setAdSlot] = useState<AdSlot | null>(null);
  const [chapterFinished, setChapterFinished] = useState(false);
  // Páginas reais do capítulo (API ou cache offline PWA) com fallback para as páginas do mock.
  const [pages, setPages] = useState<string[]>(chapter.pages ?? []);
  const [chapterFormat, setChapterFormat] = useState<'IMAGE_PAGES' | 'PROSE'>(chapter.format ?? 'IMAGE_PAGES');
  const [proseContent, setProseContent] = useState<string | null>(chapter.format === 'PROSE' ? chapter.content ?? null : null);
  const [proseBlocks, setProseBlocks] = useState<ProseBlock[]>([]);
  const [earlyAccessLocked, setEarlyAccessLocked] = useState(false);
  // Curtida do capítulo: fonte da verdade é o servidor; o estado local é otimista.
  const [chapterLikes, setChapterLikes] = useState(Number(chapter.likes ?? 0));
  const [chapterLiked, setChapterLiked] = useState(Boolean(chapter.likedByMe));
  const [likePending, setLikePending] = useState(false);
  const [likeNotice, setLikeNotice] = useState<string | null>(null);
  // Apoio só é oferecido quando o servidor confirma autor monetizado + checkout configurado.
  const [supportEnabled, setSupportEnabled] = useState(false);
  const [membershipPriceBrl, setMembershipPriceBrl] = useState<number | null>(null);
  // Visualização válida: primeira página ao menos 50% visível por ~1s (ou navegação).
  const [viewQualified, setViewQualified] = useState(false);

  // Modo de leitura: paginado (PC, página a página) ou vertical (webtoon, rolagem livre/celular).
  // A preferência fica gravada no navegador.
  const [readingMode, setReadingMode] = useState<'paginated' | 'vertical'>(() => {
    try {
      return window.localStorage.getItem('mn-reader-mode') === 'vertical' ? 'vertical' : 'paginated';
    } catch {
      return 'paginated';
    }
  });
  // Configuração de leitura da prosa (light novel): fonte, tamanho, entrelinha e largura.
  // Fica no botão de configuração do header e é persistida no navegador.
  const [proseSettings, setProseSettings] = useState(() => {
    try {
      const raw = window.localStorage.getItem('mn-prose-settings');
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<{
          fontSize: number;
          lineHeight: number;
          maxWidth: number;
          serif: boolean;
        }>;
        return {
          fontSize: Number(parsed.fontSize) || 18,
          lineHeight: Number(parsed.lineHeight) || 1.9,
          maxWidth: Number(parsed.maxWidth) || 720,
          serif: parsed.serif !== false,
        };
      }
    } catch {
      // preferência inválida: usa o padrão
    }
    return { fontSize: 18, lineHeight: 1.9, maxWidth: 720, serif: true };
  });
  const [settingsOpen, setSettingsOpen] = useState(false);

  const updateProseSettings = (patch: Partial<typeof proseSettings>) => {
    setProseSettings((current) => {
      const next = { ...current, ...patch };
      try {
        window.localStorage.setItem('mn-prose-settings', JSON.stringify(next));
      } catch {
        // sem storage: vale só nesta sessão
      }
      return next;
    });
  };

  // Volta do login/cadastro direto para a conversa deste capítulo.
  useEffect(() => {
    if (window.sessionStorage.getItem('mn:scroll-comments') !== '1') {
      return;
    }
    let attempts = 0;
    const timer = window.setInterval(() => {
      const comments = document.getElementById('chapter-comments');
      if (comments) {
        comments.scrollIntoView({ behavior: 'smooth', block: 'start' });
        window.sessionStorage.removeItem('mn:scroll-comments');
        window.clearInterval(timer);
      } else if (++attempts >= 12) {
        window.clearInterval(timer);
      }
    }, 250);
    return () => window.clearInterval(timer);
  }, [chapter.id]);

  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const firstPageRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const lastCountedPageRef = useRef(1);
  const endTriggeredRef = useRef(false);
  const initialPageAppliedRef = useRef<string | null>(null);
  // Checkpoints de prosa já enviados
  const checkpointsSentRef = useRef<Set<number>>(new Set());

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

  const handleToggleChapterLike = async () => {
    if (!isAuthenticated) {
      if (onRequireAuth) {
        onRequireAuth();
        return;
      }
      setLikeNotice('Entre na sua conta para curtir este capítulo.');
      return;
    }
    if (likePending) {
      return;
    }
    const previousLiked = chapterLiked;
    const previousCount = chapterLikes;
    setChapterLiked(!previousLiked);
    setChapterLikes(Math.max(0, previousCount + (previousLiked ? -1 : 1)));
    setLikePending(true);
    try {
      const result = await workApi.toggleChapterLike(work.id, chapter.number);
      setChapterLiked(result.liked);
      setChapterLikes(result.totalLikes);
      setLikeNotice(null);
    } catch {
      setChapterLiked(previousLiked);
      setChapterLikes(previousCount);
      setLikeNotice('Não foi possível registrar a curtida. Tente novamente.');
    } finally {
      setLikePending(false);
    }
  };

  // Carrega as páginas reais do capítulo (online ou offline PWA)
  useEffect(() => {
    let active = true;
    setEarlyAccessLocked(false);
    setChapterFormat(chapter.format ?? 'IMAGE_PAGES');
    setProseContent(chapter.format === 'PROSE' ? chapter.content ?? null : null);
    setProseBlocks([]);
    checkpointsSentRef.current.clear();
    setCurrentPage(1);
    setChapterFinished(false);
    setCumulativePages(0);
    setChapterLikes(Number(chapter.likes ?? 0));
    setChapterLiked(Boolean(chapter.likedByMe));
    setLikeNotice(null);
    setSupportEnabled(false);
    setMembershipPriceBrl(null);
    setViewQualified(false);
    lastCountedPageRef.current = 1;
    endTriggeredRef.current = false;
    initialPageAppliedRef.current = null;
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
        setChapterLikes(Number(resp.likes ?? 0));
        setChapterLiked(Boolean(resp.likedByMe));
        setSupportEnabled(Boolean(resp.supportEnabled));
        setMembershipPriceBrl(resp.membershipPriceBrl ?? null);
        if (resp.format === 'PROSE') {
          setChapterFormat('PROSE');
          setProseContent(resp.content ?? '');
          // Parse blocksJson se disponível
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
  }, [work.slug, chapter.number, chapter.pages, chapter.format, chapter.content, chapter.blocksJson]);

  // Retoma a leitura na página salva (biblioteca / ficha da obra), depois que as
  // páginas reais chegam da API. Aplica uma vez por capítulo para não "puxar" o
  // leitor de volta toda vez que ele avança.
  useEffect(() => {
    if (!initialPage || initialPage < 1 || chapterFormat === 'PROSE') {
      return;
    }
    if (initialPageAppliedRef.current === chapter.id) {
      return;
    }
    const limit = pages.length || chapter.pages?.length || 0;
    if (limit <= 0) {
      return;
    }
    setCurrentPage(Math.min(initialPage, limit));
    initialPageAppliedRef.current = chapter.id;
  }, [initialPage, pages.length, chapter.id, chapter.pages, chapterFormat]);

  // Ao trocar de capítulo, volta ao topo — essencial no modo de rolagem contínua.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [work.slug, chapter.number]);

  // Qualificação da visualização: abrir e sair não conta. A primeira página
  // precisa estar ao menos 50% visível por ~1s. No modo prosa, o texto conta
  // após 1s de permanência. Navegar para outra página também qualifica.
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
          (entry) => entry.isIntersecting && entry.intersectionRatio >= 0.5,
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
      { threshold: [0, 0.5, 1] },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      if (timer !== undefined) {
        window.clearTimeout(timer);
      }
    };
  }, [chapter.id, chapterFormat, currentPage, pages.length, readingMode, viewQualified]);

  // Rastreio de leitura contínua no MongoDB. A view só é enviada depois da
  // qualificação acima; o backend deduplica por leitor/capítulo/dia.
  useEffect(() => {
    if (!viewQualified) {
      return;
    }
    const isProse = chapterFormat === 'PROSE';
    userApi.trackReadingProgress({
      workId: work.id,
      chapterId: chapter.id,
      page: isProse ? 1 : currentPage,
      totalPages: isProse ? 1 : totalPages,
    }).catch(() => {});
  }, [work.id, chapter.id, currentPage, totalPages, chapterFormat, viewQualified]);

  // Checkpoints de retenção para prosa (10%, 20%, ..., 100%)
  // Dispara eventos de leitura no backend para analytics de retenção
  useEffect(() => {
    if (chapterFormat !== 'PROSE' || proseBlocks.length === 0) {
      return;
    }
    // Calcula progresso baseado na posição de scroll dos blocos de texto
    const handleScroll = () => {
      if (chapterFinished) return;
      
      // Encontra o bloco de texto mais visível na tela
      const textBlocks = proseBlocks.filter(b => b.type === 'text');
      if (textBlocks.length === 0) return;
      
      let totalChars = 0;
      
      // Calcula total de caracteres
      for (const block of textBlocks) {
        const text = block.content.text || '';
        totalChars += text.length;
      }
      
      // Estima progresso baseado na posição do scroll
      // Usa o primeiro e último elemento de bloco de texto visíveis
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
        // Progresso aproximado: posição do primeiro bloco visível / total de blocos
        const progress = Math.round((firstVisibleIndex / Math.max(1, blockElements.length - 1)) * 100);
        
        // Atualiza barras de progresso da prosa
        const topBar = document.getElementById('prose-progress-bar-top');
        const bottomBar = document.getElementById('prose-progress-bar');
        if (topBar) topBar.style.width = `${progress}%`;
        if (bottomBar) bottomBar.style.width = `${progress}%`;
        
        // Dispara checkpoints que ainda não foram enviados
        for (const checkpoint of PROSE_CHECKPOINTS) {
          if (progress >= checkpoint && !checkpointsSentRef.current.has(checkpoint)) {
            checkpointsSentRef.current.add(checkpoint);
            userApi.trackReadingProgress({
              workId: work.id,
              chapterId: chapter.id,
              page: 1,
              totalPages: 1,
            }).catch(() => {});
          }
        }
        
        // 100% = fim do capítulo
        if (progress >= 100 && !checkpointsSentRef.current.has(100)) {
          checkpointsSentRef.current.add(100);
          finishChapter();
        }
      }
    };
    
    // Throttle scroll
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
  }, [chapterFormat, proseBlocks, chapterFinished, work.id, chapter.id]);

  // Anúncio de intervalo: a cada 30 páginas lidas (apenas para mangá/IMAGE_PAGES).
  // Para prosa, os checkpoints de 10% substituem esta lógica.
  useEffect(() => {
    if (chapterFormat === 'PROSE') return;
    if (currentPage <= lastCountedPageRef.current) return;
    const advanced = currentPage - lastCountedPageRef.current;
    lastCountedPageRef.current = currentPage;
    const next = cumulativePages + advanced;
    if (next >= AD_EVERY_PAGES) {
      setCumulativePages(0);
      setAdSlot('mid');
    } else {
      setCumulativePages(next);
    }
  }, [currentPage, cumulativePages, chapterFormat]);

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

      <div className="flex flex-wrap items-center justify-center gap-3 border-t border-[#34343A] pt-4">
        <button
          type="button"
          onClick={handleToggleChapterLike}
          disabled={likePending}
          aria-pressed={chapterLiked}
          className={`inline-flex items-center gap-2 px-4 py-2 font-display text-sm uppercase border-2 transition-all disabled:opacity-60 ${
            chapterLiked
              ? 'bg-[#FF4D6D] text-[#F4EFE3] border-[#0B0B0C]'
              : 'bg-[#0B0B0C] text-[#F4EFE3] border-[#34343A] hover:border-[#FF4D6D]'
          }`}
        >
          <Heart size={15} className={chapterLiked ? 'fill-[#F4EFE3]' : ''} />
          <span>{chapterLiked ? 'CAPÍTULO CURTIDO' : 'CURTIR CAPÍTULO'}</span>
          <span className="tabular-nums opacity-80">{Number(chapterLikes).toLocaleString('pt-BR')}</span>
        </button>
      </div>

      {likeNotice && (
        <p role="status" className="font-body text-xs text-[#FFD400]">
          {likeNotice}
        </p>
      )}

      {supportEnabled && (
        <div className="w-full border-2 border-[#34343A] bg-[#101114] p-5 text-center space-y-3">
          <p className="font-display text-lg text-[#F4EFE3] uppercase">
            GOSTOU DESTE CAPÍTULO? APOIE O AUTOR.
          </p>
          <p className="font-body text-sm text-[#A9A59A]">
            {membershipPriceBrl
              ? `Doação direta ou clube de membros a partir de ${membershipPriceBrl.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} por mês.`
              : 'Apoio direto ao autor desta obra.'}{' '}
            O próximo capítulo continua disponível.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => openDonate(work.authorId, work.authorName, work.title, work.id)}
              className="!min-h-[38px] !text-xs"
            >
              APOIAR COM DOAÇÃO
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={onBack}
              className="!min-h-[38px] !text-xs"
            >
              VER OPÇÕES NA OBRA
            </Button>
          </div>
        </div>
      )}
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
          {/* Configuração de leitura da prosa: fonte, tamanho, entrelinha e largura */}
          {chapterFormat === 'PROSE' && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setSettingsOpen((open) => !open)}
                aria-expanded={settingsOpen}
                aria-controls="prose-reading-settings"
                aria-label="Configuração de leitura"
                title="Configuração de leitura"
                className={`p-1.5 border transition-colors ${
                  settingsOpen
                    ? 'border-[#FFD400] text-[#FFD400] bg-[#151517]'
                    : 'border-[#34343A] bg-[#151517] text-[#A9A59A] hover:text-[#F4EFE3] hover:border-[#F4EFE3]'
                }`}
              >
                <Settings2 size={16} />
              </button>

              {settingsOpen && (
                <div
                  id="prose-reading-settings"
                  role="dialog"
                  aria-label="Configuração de leitura"
                  className="absolute right-0 top-full mt-2 w-64 border border-[#34343A] bg-[#151517] p-3 space-y-3 z-50 shadow-[4px_4px_0_rgba(0,0,0,0.4)]"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-pixel text-[11px] uppercase text-[#FFD400]">Leitura</p>
                    <button
                      type="button"
                      onClick={() => setSettingsOpen(false)}
                      aria-label="Fechar configuração de leitura"
                      className="text-[#A9A59A] hover:text-[#F4EFE3]"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  <div className="space-y-1">
                    <p className="font-body text-[11px] text-[#A9A59A]">Fonte</p>
                    <div className="flex border border-[#34343A]">
                      <button
                        type="button"
                        aria-pressed={proseSettings.serif}
                        onClick={() => updateProseSettings({ serif: true })}
                        className={`flex-1 px-2 py-1 font-body text-xs ${
                          proseSettings.serif ? 'bg-[#FFD400] text-[#0B0B0C]' : 'text-[#F4EFE3]'
                        }`}
                        style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                      >
                        Serifa
                      </button>
                      <button
                        type="button"
                        aria-pressed={!proseSettings.serif}
                        onClick={() => updateProseSettings({ serif: false })}
                        className={`flex-1 px-2 py-1 font-body text-xs border-l border-[#34343A] ${
                          !proseSettings.serif ? 'bg-[#FFD400] text-[#0B0B0C]' : 'text-[#F4EFE3]'
                        }`}
                      >
                        Sem serifa
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="font-body text-[11px] text-[#A9A59A]">
                      Tamanho do texto · <span className="tabular-nums">{proseSettings.fontSize}px</span>
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          updateProseSettings({ fontSize: Math.max(15, proseSettings.fontSize - 1) })
                        }
                        disabled={proseSettings.fontSize <= 15}
                        aria-label="Diminuir tamanho do texto"
                        className="p-1.5 border border-[#34343A] text-[#F4EFE3] disabled:opacity-40"
                      >
                        <Minus size={13} />
                      </button>
                      <span className="flex-1 text-center font-body text-sm text-[#F4EFE3] tabular-nums">
                        {proseSettings.fontSize}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          updateProseSettings({ fontSize: Math.min(26, proseSettings.fontSize + 1) })
                        }
                        disabled={proseSettings.fontSize >= 26}
                        aria-label="Aumentar tamanho do texto"
                        className="p-1.5 border border-[#34343A] text-[#F4EFE3] disabled:opacity-40"
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="font-body text-[11px] text-[#A9A59A]">Entrelinha</p>
                    <div className="flex border border-[#34343A]">
                      {[1.6, 1.9, 2.2].map((value) => (
                        <button
                          key={value}
                          type="button"
                          aria-pressed={proseSettings.lineHeight === value}
                          onClick={() => updateProseSettings({ lineHeight: value })}
                          className={`flex-1 px-2 py-1 font-body text-xs tabular-nums ${
                            proseSettings.lineHeight === value
                              ? 'bg-[#FFD400] text-[#0B0B0C]'
                              : 'text-[#F4EFE3]'
                          }`}
                        >
                          {value}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="font-body text-[11px] text-[#A9A59A]">Largura da coluna</p>
                    <div className="flex border border-[#34343A]">
                      {[620, 720, 820].map((value) => (
                        <button
                          key={value}
                          type="button"
                          aria-pressed={proseSettings.maxWidth === value}
                          onClick={() => updateProseSettings({ maxWidth: value })}
                          className={`flex-1 px-2 py-1 font-body text-xs tabular-nums ${
                            proseSettings.maxWidth === value
                              ? 'bg-[#FFD400] text-[#0B0B0C]'
                              : 'text-[#F4EFE3]'
                          }`}
                        >
                          {value}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Seletor de modo de leitura: paginado (PC) x rolagem contínua (celular) */}
          {chapterFormat !== 'PROSE' && (
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
          )}

          <span className="hidden sm:inline font-pixel text-[12px] text-[#A9A59A] tabular-nums">
            {chapterFormat === 'PROSE' ? 'LEITURA EM PROSA (SCROLL)' : `PÁG. ${currentPage} / ${totalPages}`}
          </span>

          {supportEnabled && (
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
          )}

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
      {chapterFormat === 'PROSE' ? (
        <div className="w-full h-1 bg-[#151517] sticky top-14 z-30" aria-hidden="true">
          <div
            id="prose-progress-bar-top"
            className="h-full bg-[#FFD400] transition-all duration-200"
            style={{ width: '0%' }}
          />
        </div>
      ) : (
        <div className="w-full h-1 bg-[#151517]">
          <div
            className="h-full bg-[#FFD400] transition-all duration-100"
            style={{ width: `${(currentPage / totalPages) * 100}%` }}
          />
        </div>
      )}

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
          <>
            {/* Barra de progresso específica para prosa (substitui a fina do topo) */}
            <div className="w-full h-1 bg-[#151517] sticky top-14 z-30" aria-hidden="true">
              <div
                className="h-full bg-[#FFD400] transition-all duration-200"
                id="prose-progress-bar"
                style={{ width: '0%' }}
              />
            </div>
            
            <article 
              lang="pt-BR" 
              aria-label={`Texto do capítulo ${chapter.number}`} 
              style={{
                fontSize: `${proseSettings.fontSize}px`,
                lineHeight: proseSettings.lineHeight,
                maxWidth: `${proseSettings.maxWidth}px`,
                fontFamily: proseSettings.serif ? 'Georgia, "Times New Roman", serif' : undefined,
              }}
              className="w-full px-5 py-8 sm:px-10 sm:py-12 text-left font-body text-[var(--mn-paper)] whitespace-pre-wrap select-text"
            >
              {proseBlocks.length > 0 ? (
                proseBlocks.map((block, idx) => (
                  <div 
                    key={idx} 
                    data-prose-block={block.type === 'text' ? 'true' : 'false'}
                    className="mb-8"
                  >
                    {block.type === 'text' && block.content.text && (
                      <div className="prose-block-text" dangerouslySetInnerHTML={{ 
                        __html: block.content.text
                          .replace(/&/g, '&')
                          .replace(/</g, '<')
                          .replace(/>/g, '>')
                          .replace(/\n/g, '<br/>')
                      }} />
                    )}
                    {block.type === 'illustration' && block.content.fileId && (
                      <div className="my-6 text-center">
                        <img
                          src={
                            block.content.fileId.startsWith('http') || block.content.fileId.startsWith('/')
                              ? block.content.fileId
                              : `/api/storage/${block.content.fileId}`
                          }
                          alt={block.content.altText || `Ilustração do capítulo ${chapter.number}`}
                          style={{ 
                            maxWidth: `${block.content.width || 50}%`, 
                            height: 'auto',
                            maxHeight: '50vh'
                          }}
                          className="mx-auto rounded border border-[#34343A]"
                          loading="lazy"
                        />
                        {block.content.altText && (
                          <p className="font-body text-xs text-[var(--mn-mute)] mt-1 text-center">{block.content.altText}</p>
                        )}
                      </div>
                    )}
                    {block.type === 'separator' && (
                      <div className="my-8 text-center">
                        {block.content?.style === 'scene' && <span className="font-display text-[var(--mn-mute)]">— — —</span>}
                        {block.content?.style === 'time' && <span className="font-display text-[var(--mn-mute)]">~ ~ ~</span>}
                        {block.content?.style === 'pov' && <span className="font-display text-[var(--mn-mute)]">• • •</span>}
                        {block.content?.style === 'line' && <span className="font-display text-[var(--mn-mute)]">—</span>}
                        {!block.content?.style && <span className="font-display text-[var(--mn-mute)]">— — —</span>}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                proseContent ?? 'Carregando capítulo…'
              )}
            </article>
          </>
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
                    if (idx === 0) {
                      firstPageRef.current = el;
                    }
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
          </>
        ) : chapterFinished ? (
          chapterEndPanel
        ) : (
          <>
            <div ref={firstPageRef} className="relative w-full overflow-hidden bg-[#000000] flex justify-center">
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

        <div className="mt-8">
          <WorkCommentsPanel
            workId={work.id}
            chapterId={chapter.id}
            heading={`COMENTÁRIOS DO CAP. #${chapter.number}`}
            onRequireAuth={onRequireAuth}
          />
        </div>
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
          <Star size={14} className={isLiked ? 'fill-[#0B0B0C]' : ''} />
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

import { useEffect, useMemo, useState } from 'react';
import { Heart, Trash2, BookOpen } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { LibraryWorkDto, ReadingProgressDto, userApi } from '../api/authApi';
import { Work, Chapter } from '../types';
import { Cover } from '../components/ui/Cover';
import { Button } from '../components/ui/Button';
import { FormatSwitcher } from '../components/ui/FormatSwitcher';
import { FormatBadge } from '../components/ui/FormatBadge';
import { FormatFilter, isLightNovel } from '../utils/formatMeta';
import mascotSvg from '../assets/brand/mascot-placeholder.svg';

interface BibliotecaPageProps {
  onSelectWork: (work: Work) => void;
  onOpenChapter: (work: Work, chapter: Chapter, page?: number) => void;
  onNavigateToCatalog: () => void;
}

type LibraryCard = {
  work: Work;
  entry: LibraryWorkDto;
  progress: ReadingProgressDto | null;
  finished: boolean;
  page: number;
  totalPages: number;
};

/** Constrói o `Work` de exibição a partir do resumo autoritativo do servidor. */
function toWork(entry: LibraryWorkDto): Work {
  return {
    id: entry.id,
    slug: entry.slug,
    title: entry.title,
    authorId: '',
    authorName: entry.authorName || (entry.authorHandle ? `@${entry.authorHandle}` : ''),
    coverUrl: entry.coverUrl ?? '',
    bannerUrl: entry.coverUrl ?? '',
    synopsis: '',
    genres: [],
    status: entry.status === 'completed' ? 'completed' : entry.status === 'hiatus' ? 'hiatus' : 'ongoing',
    format: isLightNovel(entry.format) ? 'LIGHT_NOVEL' : 'MANGA',
    totalChapters: entry.totalChapters ?? 0,
    totalViews: 0,
    totalLikes: 0,
    totalFavorites: 0,
    totalComments: 0,
    rating: 0,
    updatedAt: '',
  };
}

/** Reconstrói o capítulo a partir do progresso salvo (id e número já conhecidos). */
function toChapter(workId: string, progress: ReadingProgressDto, format?: Work['format']): Chapter | null {
  if (!progress.chapterId) return null;
  return {
    id: progress.chapterId,
    workId,
    number: progress.chapterNumber ?? 1,
    title: progress.chapterTitle ?? '',
    pages: [],
    createdAt: progress.updatedAt ?? '',
    publicReleaseAt: '',
    views: 0,
    likes: 0,
    commentsCount: 0,
    format: isLightNovel(format) ? 'PROSE' : 'IMAGE_PAGES',
  };
}

/**
 * Biblioteca do leitor.
 *
 * <p>Os favoritos vêm do PostgreSQL (`/users/me/library`) e o progresso do MongoDB
 * (`/users/reading-progress`). Nada é inventado no cliente: o botão do card muda entre
 * "continuar de onde parou" (capítulo/página salvos) e "ler novamente" (capítulo concluído).</p>
 */
export function BibliotecaPage({
  onSelectWork,
  onOpenChapter,
  onNavigateToCatalog,
}: BibliotecaPageProps) {
  const { user, isAuthenticated, toggleFavorite, libraryVersion } = useAuth();
  const [entries, setEntries] = useState<LibraryWorkDto[]>([]);
  const [progress, setProgress] = useState<ReadingProgressDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [formato, setFormato] = useState<FormatFilter>('all');

  useEffect(() => {
    if (!isAuthenticated) {
      setEntries([]);
      setProgress([]);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    Promise.all([userApi.getLibrary(), userApi.getReadingProgress()])
      .then(([library, history]) => {
        if (!active) return;
        setEntries(library);
        setProgress(history);
      })
      .catch(() => {
        if (active) {
          setEntries([]);
          setProgress([]);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isAuthenticated, user.uid, libraryVersion]);

  const allCards = useMemo<LibraryCard[]>(() => {
    const byWork = new Map(progress.map((item) => [item.workId, item]));
    return entries.map((entry) => {
      const item = byWork.get(entry.id) ?? null;
      const page = Math.max(1, item?.page ?? 1);
      const totalPages = Math.max(0, item?.totalPages ?? 0);
      return {
        work: toWork(entry),
        entry,
        progress: item,
        finished: !isLightNovel(entry.format) && Boolean(totalPages > 0 && page >= totalPages),
        page,
        totalPages,
      };
    });
  }, [entries, progress]);

  const counts = useMemo(
    () => ({
      all: allCards.length,
      manga: allCards.filter((card) => !isLightNovel(card.work.format)).length,
      lightNovel: allCards.filter((card) => isLightNovel(card.work.format)).length,
    }),
    [allCards]
  );

  const cards = useMemo(
    () =>
      formato === 'all'
        ? allCards
        : allCards.filter((card) => card.work.format === formato),
    [allCards, formato]
  );

  const openResume = (card: LibraryCard, page: number) => {
    if (!card.progress) {
      onSelectWork(card.work);
      return;
    }
    const chapter = toChapter(card.work.id, card.progress, card.work.format);
    if (!chapter) {
      onSelectWork(card.work);
      return;
    }
    onOpenChapter(card.work, chapter, page);
  };

  return (
    <div className="mn-container py-8 space-y-8 select-none">
      <header className="border-b-2 border-[#34343A] pb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="font-pixel text-[12px] text-[#FFD400] tracking-widest block uppercase font-bold">
            COLEÇÃO DO LEITOR
          </span>
          <h1 className="font-display text-4xl sm:text-5xl text-[#F4EFE3] uppercase">
            MINHA BIBLIOTECA
          </h1>
          <p className="font-body text-xs sm:text-sm text-[#A9A59A] mt-1">
            Suas obras salvas — com o capítulo e a página exatos de onde você parou.
          </p>
        </div>

        <div className="flex items-center gap-2 border-2 border-[#34343A] px-3 py-1.5 bg-[#151517]">
          <Heart size={16} className="fill-[#FFD400] text-[#FFD400]" />
          <span className="font-display text-lg text-[#F4EFE3] tabular-nums">{cards.length}</span>
          <span className="font-pixel text-[12px] text-[#A9A59A]">TÍTULOS</span>
        </div>
      </header>

      {allCards.length > 0 && (
        <section className="flex flex-col sm:flex-row sm:items-center gap-3 border-b-2 border-[#34343A] pb-4">
          <span className="font-pixel text-[12px] uppercase tracking-wider text-[#A9A59A]">
            Ver por formato
          </span>
          <FormatSwitcher value={formato} onChange={setFormato} counts={counts} />
        </section>
      )}

      {loading ? (
        <p className="font-pixel text-xs text-[#A9A59A] uppercase">Carregando sua biblioteca...</p>
      ) : allCards.length === 0 ? (
        <section className="p-12 text-center border-2 border-dashed border-[#34343A] bg-[#151517] space-y-4 max-w-lg mx-auto">
          <img src={mascotSvg} alt="Mascote Nanquim" className="w-20 h-24 mx-auto opacity-80" />
          <h2 className="font-display text-2xl text-[#FFD400] uppercase">NADA POR AQUI AINDA</h2>
          <p className="font-body text-xs text-[#A9A59A]">
            {isAuthenticated
              ? 'Favorita uma obra no catálogo (coração na capa) e ela cai direto aqui na sua banca pessoal.'
              : 'Entre na sua conta para guardar obras e continuar a leitura de onde parou.'}
          </p>
          <div className="pt-2">
            <Button variant="primary" onClick={onNavigateToCatalog}>
              EXPLORAR CATÁLOGO
            </Button>
          </div>
        </section>
      ) : cards.length === 0 ? (
        <section className="p-10 text-center border-2 border-dashed border-[#34343A] bg-[#151517] space-y-3 max-w-lg mx-auto">
          <h2 className="font-display text-2xl text-[#FFD400] uppercase">
            {formato === 'LIGHT_NOVEL' ? 'NENHUMA LIGHT NOVEL SALVA' : 'NENHUM MANGÁ SALVO'}
          </h2>
          <p className="font-body text-xs text-[#A9A59A]">
            Você tem {allCards.length} {allCards.length === 1 ? 'obra' : 'obras'} na biblioteca, mas nenhuma neste formato.
          </p>
          <Button variant="primary" onClick={() => setFormato('all')}>
            VER TODAS
          </Button>
        </section>
      ) : (
        <section className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {cards.map((card) => {
            const percent = card.totalPages > 0 ? Math.round((card.page / card.totalPages) * 100) : 0;
            return (
              <article
                key={card.work.id}
                className="group flex flex-col border-2 border-[#34343A] bg-[#151517] shadow-[4px_4px_0_#F4EFE3] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_#FFD400] transition-all"
              >
                <div
                  className="relative cursor-pointer overflow-hidden aspect-[2/3]"
                  onClick={() => onSelectWork(card.work)}
                >
                  <Cover src={card.work.coverUrl} title={card.work.title} aspectRatio="2/3" dropShadow={false} />
                  <div className="absolute bottom-2 left-2">
                    <FormatBadge format={card.work.format} />
                  </div>
                  <span className="absolute top-2 right-2 bg-[#0B0B0C] border border-[#FFD400] text-[#FFD400] px-1.5 py-0.5 font-pixel text-[12px] tabular-nums">
                    {card.entry.totalChapters} CAPS
                  </span>
                </div>

                <div className="p-3 flex flex-col flex-1 justify-between gap-3">
                  <div>
                    <h3
                      onClick={() => onSelectWork(card.work)}
                      className="font-display text-base leading-tight uppercase line-clamp-2 text-[#F4EFE3] group-hover:text-[#FFD400] cursor-pointer transition-colors"
                      title={card.work.title}
                    >
                      {card.work.title}
                    </h3>
                    <p className="font-body text-[12px] text-[#A9A59A] truncate mt-0.5">
                      por {card.work.authorName || 'autor independente'}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-[#34343A] flex flex-col gap-2">
                    {card.progress ? (
                      isLightNovel(card.work.format) ? (
                        <div className="flex items-center justify-between font-pixel text-[11px] text-[#A9A59A] uppercase">
                          <span>CAP. {card.progress.chapterNumber ?? 1}</span>
                          <span className="text-[#FFD400]">EM ANDAMENTO</span>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center justify-between font-pixel text-[11px] text-[#A9A59A] uppercase">
                            <span>
                              {card.finished ? 'CAPÍTULO CONCLUÍDO' : `PÁG. ${card.page}/${card.totalPages || '?'}`}
                            </span>
                            <span className="tabular-nums">{card.finished ? '100%' : `${percent}%`}</span>
                          </div>
                          <div className="h-1.5 w-full bg-[#34343A]" aria-hidden="true">
                            <div
                              className="h-full bg-[#FFD400]"
                              style={{ width: `${card.finished ? 100 : percent}%` }}
                            />
                          </div>
                        </>
                      )
                    ) : (
                      <p className="font-pixel text-[11px] text-[#A9A59A] uppercase">AINDA NÃO ABERTA</p>
                    )}

                    {card.finished ? (
                      <button
                        type="button"
                        onClick={() => openResume(card, 1)}
                        className="w-full py-1.5 px-2 bg-[#FFD400] text-[#0B0B0C] border border-[#0B0B0C] font-display text-xs tracking-wider uppercase hover:bg-[#E0B800] transition-colors inline-flex items-center justify-center gap-1.5"
                      >
                        <BookOpen size={13} /> LER NOVAMENTE
                      </button>
                    ) : card.progress ? (
                      <button
                        type="button"
                        onClick={() => openResume(card, card.page)}
                        className="w-full py-1.5 px-2 bg-[#FFD400] text-[#0B0B0C] border border-[#0B0B0C] font-display text-xs tracking-wider uppercase hover:bg-[#E0B800] transition-colors"
                      >
                        CONTINUAR DE ONDE PAROU
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onSelectWork(card.work)}
                        className="w-full py-1.5 px-2 bg-[#FFD400] text-[#0B0B0C] border border-[#0B0B0C] font-display text-xs tracking-wider uppercase hover:bg-[#E0B800] transition-colors"
                      >
                        ESCOLHER CAPÍTULO
                      </button>
                    )}

                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        onClick={() => onSelectWork(card.work)}
                        className="font-pixel text-[12px] text-[#A9A59A] hover:text-[#FFD400]"
                      >
                        DETALHES →
                      </button>

                      <button
                        type="button"
                        onClick={() => void toggleFavorite(card.work.id)}
                        className="text-[#A9A59A] hover:text-[#E8402F] p-1"
                        title="Remover da biblioteca"
                        aria-label="Remover da biblioteca"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}

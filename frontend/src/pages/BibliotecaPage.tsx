import { useEffect, useMemo, useState } from 'react';
import { Heart } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { LibraryWorkDto, ReadingProgressDto, userApi } from '../api/authApi';
import { Work, Chapter } from '../types';
import { Button } from '../components/ui/Button';
import { FormatSwitcher } from '../components/ui/FormatSwitcher';
import { FormatFilter, isLightNovel } from '../utils/formatMeta';
import { LibraryWorkCard, LibraryCardData } from '../components/library/LibraryWorkCard';
import mascotSvg from '../assets/brand/mascot-placeholder.svg';

interface BibliotecaPageProps {
  onSelectWork: (work: Work) => void;
  onOpenChapter: (work: Work, chapter: Chapter, page?: number) => void;
  onNavigateToCatalog: () => void;
}

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

/**
 * Biblioteca do leitor.
 *
 * <p>Os favoritos vêm do PostgreSQL (`/users/me/library`) e o progresso do MongoDB
 * (`/users/reading-progress`). Nada é inventado no cliente: a capa retoma o capítulo/página
 * salvos de forma limpa e despoluída.</p>
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

  const allCards = useMemo<LibraryCardData[]>(() => {
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

  return (
    <div className="mn-container py-8 space-y-8 select-none">
      <header className="border-b-2 border-[var(--mn-line)] pb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="font-pixel text-[12px] text-[var(--mn-yellow)] tracking-widest block uppercase font-bold">
            COLEÇÃO DO LEITOR
          </span>
          <h1 className="font-display text-4xl sm:text-5xl text-[var(--mn-paper)] uppercase">
            MINHA BIBLIOTECA
          </h1>
          <p className="font-body text-xs sm:text-sm text-[var(--mn-mute)] mt-1">
            Suas obras salvas — com o capítulo e a página exatos de onde você parou.
          </p>
        </div>

        <div className="flex items-center gap-2 border-2 border-[var(--mn-line)] px-3 py-1.5 bg-[var(--mn-ink-2)]">
          <Heart size={16} className="fill-[var(--mn-yellow)] text-[var(--mn-yellow)]" />
          <span className="font-display text-lg text-[var(--mn-paper)] tabular-nums">{cards.length}</span>
          <span className="font-pixel text-[12px] text-[var(--mn-mute)]">TÍTULOS</span>
        </div>
      </header>

      {allCards.length > 0 && (
        <section className="flex flex-col sm:flex-row sm:items-center gap-3 border-b-2 border-[var(--mn-line)] pb-4">
          <span className="font-pixel text-[12px] uppercase tracking-wider text-[var(--mn-mute)]">
            Ver por formato
          </span>
          <FormatSwitcher value={formato} onChange={setFormato} counts={counts} />
        </section>
      )}

      {loading ? (
        <p className="font-pixel text-xs text-[var(--mn-mute)] uppercase">Carregando sua biblioteca...</p>
      ) : allCards.length === 0 ? (
        <section className="p-12 text-center border-2 border-dashed border-[var(--mn-line)] bg-[var(--mn-ink-2)] space-y-4 max-w-lg mx-auto">
          <img src={mascotSvg} alt="Mascote Nanquim" className="w-20 h-24 mx-auto opacity-80" />
          <h2 className="font-display text-2xl text-[var(--mn-yellow)] uppercase">NADA POR AQUI AINDA</h2>
          <p className="font-body text-xs text-[var(--mn-mute)]">
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
        <section className="p-10 text-center border-2 border-dashed border-[var(--mn-line)] bg-[var(--mn-ink-2)] space-y-3 max-w-lg mx-auto">
          <h2 className="font-display text-2xl text-[var(--mn-yellow)] uppercase">
            {formato === 'LIGHT_NOVEL' ? 'NENHUMA LIGHT NOVEL SALVA' : 'NENHUM MANGÁ SALVO'}
          </h2>
          <p className="font-body text-xs text-[var(--mn-mute)]">
            Você tem {allCards.length} {allCards.length === 1 ? 'obra' : 'obras'} na biblioteca, mas nenhuma neste formato.
          </p>
          <Button variant="primary" onClick={() => setFormato('all')}>
            VER TODAS
          </Button>
        </section>
      ) : (
        <section className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {cards.map((card) => (
            <LibraryWorkCard
              key={card.work.id}
              card={card}
              onSelectWork={onSelectWork}
              onOpenChapter={onOpenChapter}
              onRemoveFavorite={(workId) => void toggleFavorite(workId)}
            />
          ))}
        </section>
      )}
    </div>
  );
}

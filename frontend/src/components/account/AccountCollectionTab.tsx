import { useEffect, useState } from 'react';
import { Crown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useModals } from '../../context/ModalContext';
import { LibraryWorkDto, ReadingProgressDto, userApi } from '../../api/authApi';
import { Work, Chapter } from '../../types';
import { Button } from '../ui/Button';
import { LibraryWorkCard, LibraryCardData } from '../library/LibraryWorkCard';
import { isLightNovel } from '../../utils/formatMeta';
import mascotSvg from '../../assets/brand/mascot-placeholder.svg';

export interface AccountCollectionTabProps {
  onSelectWork?: (work: Work) => void;
  onOpenChapter?: (work: Work, chapter: Chapter, page?: number) => void;
  onExploreCatalog?: () => void;
}

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

export function AccountCollectionTab({
  onSelectWork,
  onOpenChapter,
  onExploreCatalog,
}: AccountCollectionTabProps) {
  const { user, isAuthenticated, toggleFavorite, libraryVersion } = useAuth();
  const { openVip } = useModals();
  const [entries, setEntries] = useState<LibraryWorkDto[]>([]);
  const [progress, setProgress] = useState<ReadingProgressDto[]>([]);
  const [loading, setLoading] = useState(true);

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

  const byWork = new Map(progress.map((item) => [item.workId, item]));
  const allCards: LibraryCardData[] = entries.map((entry) => {
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

  const handleRemoveFavorite = async (workId: string) => {
    await toggleFavorite(workId);
    setEntries((prev) => prev.filter((e) => e.id !== workId));
  };

  return (
    <div className="space-y-8">
      {/* Seção Compacta de Assinatura VIP */}
      {user.isVip ? (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-2 border-[var(--mn-yellow)] bg-[var(--mn-ink-2)]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[var(--mn-yellow)] text-[var(--mn-ink)] border border-[var(--mn-ink)]">
              <Crown size={20} className="fill-[var(--mn-ink)]" />
            </div>
            <div>
              <p className="font-display text-base text-[var(--mn-paper)] uppercase">ASSINATURA VIP ATIVA</p>
              <p className="font-body text-xs text-[var(--mn-mute)]">
                Você lê 100% livre de anúncios e apoia as produções nacionais.
              </p>
            </div>
          </div>
          <span className="font-pixel text-[11px] uppercase bg-[var(--mn-yellow)] text-[var(--mn-ink)] px-3 py-1 font-bold">
            ATIVO
          </span>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-2 border-[var(--mn-line)] bg-[var(--mn-ink-2)]">
          <div className="flex items-center gap-3">
            <div className="p-2 border border-[var(--mn-yellow)] text-[var(--mn-yellow)]">
              <Crown size={20} />
            </div>
            <div>
              <p className="font-display text-base text-[var(--mn-paper)] uppercase">SEJA VIP NA MANGANETWORKING</p>
              <p className="font-body text-xs text-[var(--mn-mute)]">
                Remova todos os anúncios da leitura e ganhe vantagens exclusivas.
              </p>
            </div>
          </div>
          <Button variant="primary" onClick={openVip} className="!text-xs">
            ASSINAR VIP
          </Button>
        </div>
      )}

      {/* Grid de Obras da Coleção */}
      {loading ? (
        <p className="font-pixel text-xs text-[var(--mn-mute)] uppercase">Carregando sua coleção...</p>
      ) : allCards.length === 0 ? (
        <section className="p-12 text-center border-2 border-dashed border-[var(--mn-line)] bg-[var(--mn-ink-2)] space-y-4 max-w-lg mx-auto">
          <img src={mascotSvg} alt="Mascote Nanquim" className="w-20 h-24 mx-auto opacity-80" />
          <h2 className="font-display text-2xl text-[var(--mn-yellow)] uppercase">COLEÇÃO VAZIA</h2>
          <p className="font-body text-xs text-[var(--mn-mute)]">
            Você ainda não favoritou nenhuma obra. Navegue pelo feed ou catálogo para adicionar à sua banca.
          </p>
          {onExploreCatalog && (
            <div className="pt-2">
              <Button variant="primary" onClick={onExploreCatalog}>
                EXPLORAR CATÁLOGO
              </Button>
            </div>
          )}
        </section>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {allCards.map((card) => (
            <LibraryWorkCard
              key={card.work.id}
              card={card}
              onSelectWork={onSelectWork || (() => {})}
              onOpenChapter={onOpenChapter}
              onRemoveFavorite={(workId) => void handleRemoveFavorite(workId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

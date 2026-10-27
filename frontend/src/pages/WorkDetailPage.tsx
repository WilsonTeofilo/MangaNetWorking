import { useState, useMemo, useEffect } from 'react';
import { 
  ArrowUpDown, 
  Heart, 
  Star,
  Eye,
  BookOpen,
  Flag,
  Calendar,
  Sparkles,
  Download,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { Work, Chapter, Creator } from '../types';
import { workApi, AuthorSummaryDto } from '../api/workApi';
import { userApi, ReadingProgressDto } from '../api/authApi';
import { mapChapterSummary } from '../utils/apiMappers';
import { useAuth } from '../context/AuthContext';
import { useModals } from '../context/ModalContext';
import { isChapterEarlyAccess } from '../utils/discoveryAlgorithm';
import { Cover } from '../components/ui/Cover';
import { Button } from '../components/ui/Button';
import { Sticker } from '../components/ui/Sticker';
import { FormatBadge } from '../components/ui/FormatBadge';
import { offlineStorage } from '../services/offlineStorage';

interface WorkDetailPageProps {
  work: Work;
  onBackToCatalog: () => void;
  onOpenChapter: (work: Work, chapter: Chapter, page?: number) => void;
  onRequireAuth?: () => void;
}

export function WorkDetailPage({
  work,
  onBackToCatalog,
  onOpenChapter,
  onRequireAuth,
}: WorkDetailPageProps) {
  const { user, toggleFavorite, isMemberOf, isAuthenticated } = useAuth();
  const { openEarlyAccess, openDonate, openMembership, openReport, openVip } = useModals();

  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [readingProgress, setReadingProgress] = useState<ReadingProgressDto | null>(null);
  const [workLikes, setWorkLikes] = useState(Number(work.totalLikes ?? 0));
  const [favoritesCount, setFavoritesCount] = useState(Number(work.totalFavorites ?? 0));
  const [downloadingChapterId, setDownloadingChapterId] = useState<string | null>(null);
  const [offlineChapterIds, setOfflineChapterIds] = useState<Set<string>>(() =>
    new Set(offlineStorage.getOfflineChapters().map((c) => c.chapterId))
  );

  useEffect(() => {
    const handleUpdate = () => {
      setOfflineChapterIds(new Set(offlineStorage.getOfflineChapters().map((c) => c.chapterId)));
    };
    window.addEventListener('offline-storage-updated', handleUpdate);
    return () => window.removeEventListener('offline-storage-updated', handleUpdate);
  }, []);

  const handleDownloadOffline = async (e: React.MouseEvent, chapter: Chapter) => {
    e.stopPropagation();
    if (!user?.isVip) {
      openVip();
      return;
    }
    if (offlineChapterIds.has(chapter.id)) {
      if (window.confirm(`Deseja remover o capítulo #${chapter.number} do armazenamento offline?`)) {
        await offlineStorage.removeOfflineChapter(chapter.id);
      }
      return;
    }
    try {
      setDownloadingChapterId(chapter.id);
      await offlineStorage.downloadChapterOffline(chapter.id, work.id);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Falha ao baixar capítulo para leitura offline.');
    } finally {
      setDownloadingChapterId(null);
    }
  };

  // Dados reais da obra vindos da API (fallback para mock quando indisponível).
  const [realChapters, setRealChapters] = useState<Chapter[] | null>(null);
  const [chaptersError, setChaptersError] = useState(false);
  const [apiAuthor, setApiAuthor] = useState<AuthorSummaryDto | null>(null);

  useEffect(() => {
    let active = true;
    setRealChapters(null);
    setChaptersError(false);
    setApiAuthor(null);

    workApi
      .getWorkBySlug(work.slug)
      .then((dto) => {
        if (!active) return;
        setApiAuthor(dto.author ?? null);
        setRealChapters((dto.chapters ?? []).map((c) => mapChapterSummary(c, dto.id)));
        setWorkLikes(Number(dto.totalLikes ?? 0));
        setFavoritesCount(Number(dto.totalFavorites ?? 0));
      })
      .catch(() => {
        if (!active) return;
        // Falha transitória (rede/limite): avisa em vez de fingir obra sem capítulos.
        setChaptersError(true);
        setRealChapters([]);
      });

    return () => {
      active = false;
    };
  }, [work.slug]);

  const isFavorited = user.favorites.includes(work.id);

  useEffect(() => {
    setWorkLikes(Number(work.totalLikes ?? 0));
    setFavoritesCount(Number(work.totalFavorites ?? 0));
  }, [work.id, work.totalLikes, work.totalFavorites]);

  const handleToggleFavorite = async () => {
    if (!isAuthenticated) {
      onRequireAuth?.();
      return;
    }
    const result = await toggleFavorite(work.id);
    if (result) {
      setFavoritesCount(result.totalFavorites);
    }
  };

  const creator: Creator | undefined = apiAuthor
    ? {
        id: apiAuthor.authorId,
        name: apiAuthor.authorName,
        handle: apiAuthor.authorHandle.replace(/^@/, ''),
        avatarUrl: apiAuthor.authorAvatarUrl ?? '',
        bio: '', pixKey: '', pixKeyType: 'aleatoria', documentCpf: '',
        membershipPriceBrl: Number(apiAuthor.membershipPriceBrl),
        monthlyMembersCount: 0, totalDonationsBrl: 0, walletBalanceBrl: 0,
        pendingPayoutsBrl: 0, worksCount: 0, verified: false,
        engagementBoostMul: 1, missions: [],
      }
    : undefined;

  // Capítulos desta obra: reais (API) quando houver, senão mock.
  const chapters = useMemo(() => {
    const source = realChapters !== null ? realChapters : [];
    const sorted = [...source];
    sorted.sort((a, b) => (sortOrder === 'asc' ? a.number - b.number : b.number - a.number));
    return sorted;
  }, [work.id, sortOrder, realChapters]);

  const firstChapter = chapters[0];

  // Onde o leitor parou nesta obra (MongoDB). A biblioteca e a ficha usam o mesmo dado.
  useEffect(() => {
    if (!user.uid || user.uid === 'guest') {
      setReadingProgress(null);
      return;
    }
    let active = true;
    userApi
      .getReadingProgress()
      .then((history) => {
        if (active) setReadingProgress(history.find((item) => item.workId === work.id) ?? null);
      })
      .catch(() => {
        if (active) setReadingProgress(null);
      });
    return () => {
      active = false;
    };
  }, [user.uid, work.id]);

  const resumeChapter = readingProgress?.chapterId
    ? chapters.find((chapter) => chapter.id === readingProgress.chapterId)
    : undefined;
  const resumePage = Math.max(1, readingProgress?.page ?? 1);
  const chapterFinished = Boolean(
    readingProgress?.page && readingProgress?.totalPages && readingProgress.page >= readingProgress.totalPages
  );

  const handleOpenWithProgress = (chapter: Chapter, page?: number) => {
    const isLocked = isChapterEarlyAccess(chapter) && !isMemberOf(work.authorId);
    if (isLocked) {
      if (creator) {
        openEarlyAccess(chapter, creator, work);
        return;
      }
    }
    onOpenChapter(work, chapter, page);
  };

  const handleChapterClick = (chapter: Chapter) => handleOpenWithProgress(chapter);

  return (
    <div className="mn-container py-6 space-y-8 select-none">
      
      {/* 1. Breadcrumbs Oficiais */}
      <nav className="flex items-center gap-2 font-pixel text-[12px] text-[var(--mn-mute)] uppercase tracking-wider">
        <button
          type="button"
          onClick={onBackToCatalog}
          className="hover:text-[var(--mn-yellow)] transition-colors"
        >
          INÍCIO
        </button>
        <span>&gt;</span>
        <button
          type="button"
          onClick={onBackToCatalog}
          className="hover:text-[var(--mn-yellow)] transition-colors"
        >
          CATÁLOGO
        </button>
        <span>&gt;</span>
        <span className="text-[var(--mn-paper)] font-bold truncate max-w-xs">{work.title}</span>
      </nav>

      {/* 2. Hero da Obra com Banner de Arte ao Fundo (Manga Plus / MangaTeofilo) */}
      <section className="border-2 border-[var(--mn-line)] bg-[var(--mn-ink-2)] shadow-[6px_6px_0_var(--mn-paper)] p-6 sm:p-8 relative overflow-hidden">
        {/* Banner Horizontal de Arte Ilustrada ao Fundo */}
        {work.bannerUrl && (
          <div
            className="absolute inset-0 bg-cover bg-center opacity-30 pointer-events-none filter saturate-125"
            style={{ backgroundImage: `url(${work.bannerUrl})` }}
          />
        )}
        {/* Scrim Gradiente Nanquim */}
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--mn-ink-2)] via-[var(--mn-ink-2)]/90 to-[var(--mn-ink-2)]/40 pointer-events-none" />

        <div className="flex flex-col md:flex-row gap-8 items-start relative z-10">
          
          {/* Capa Vertical 2:3 */}
          <div className="w-52 sm:w-60 shrink-0 mx-auto md:mx-0">
            <Cover
              src={work.coverUrl}
              title={work.title}
              aspectRatio="2/3"
              dropShadow={true}
              className="w-full"
            />
          </div>

          {/* Dados da Obra */}
          <div className="flex-1 space-y-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="font-pixel text-[12px] text-[var(--mn-yellow)] font-bold tracking-widest uppercase">
                  OBRA NACIONAL ORIGINAL
                </span>
                <FormatBadge format={work.format} size="md" />
                {work.status === 'completed' && <Sticker kind="complete" />}
              </div>

              <h1 className="font-display text-4xl sm:text-5xl md:text-6xl text-[var(--mn-paper)] leading-[1.08] pt-1 uppercase tracking-tight">
                {work.title}
              </h1>

              <p className="font-body text-sm text-[var(--mn-mute)] mt-1.5">
                Criado por{' '}
                <strong className="text-[var(--mn-yellow)] font-semibold">{work.authorName}</strong>
              </p>

              {/* Total da obra: soma das visualizações de todos os capítulos */}
              <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-body text-sm text-[var(--mn-mute)] tabular-nums">
                <span className="inline-flex items-center gap-1.5" title="Visualizações da obra (soma dos capítulos)">
                  <Eye size={14} aria-hidden="true" /> {Number(work.totalViews ?? 0).toLocaleString('pt-BR')}{' '}
                  {Number(work.totalViews ?? 0) === 1 ? 'visualização' : 'visualizações'}
                </span>
                <span className="inline-flex items-center gap-1.5" title="Curtidas da obra (soma das curtidas dos capítulos)">
                  <Heart size={14} aria-hidden="true" /> {Number(workLikes).toLocaleString('pt-BR')}{' '}
                  {Number(workLikes) === 1 ? 'curtida' : 'curtidas'}
                </span>
                <span className="inline-flex items-center gap-1.5" title="Leitores que favoritaram a obra">
                  <Star size={14} aria-hidden="true" className="fill-[var(--mn-yellow)] text-[var(--mn-yellow)]" />{' '}
                  {Number(favoritesCount).toLocaleString('pt-BR')}{' '}
                  {Number(favoritesCount) === 1 ? 'favorito' : 'favoritos'}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <BookOpen size={14} aria-hidden="true" /> {work.totalChapters}{' '}
                  {work.totalChapters === 1 ? 'capítulo' : 'capítulos'}
                </span>
              </p>
            </div>

            {/* Chips de Gênero */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {work.genres.map((genre) => (
                <span
                  key={genre}
                  className="px-2.5 py-0.5 bg-[var(--mn-ink)] border border-[var(--mn-line)] text-[var(--mn-paper)] font-pixel text-[12px] uppercase tracking-wider"
                >
                  {genre}
                </span>
              ))}
            </div>

            {/* Sinopse Editorial */}
            <div className="pt-2 border-t border-[var(--mn-line)]">
              <span className="font-pixel text-[12px] text-[var(--mn-mute)] tracking-wider uppercase block mb-1">
                SINOPSE
              </span>
              <p className="font-body text-sm text-[var(--mn-paper)] leading-relaxed max-w-2xl">
                {work.synopsis}
              </p>
            </div>

            {/* Botões de Ação */}
            <div className="flex flex-wrap items-center gap-3 pt-4">
              {resumeChapter ? (
                <Button
                  variant="primary"
                  onClick={() => handleOpenWithProgress(resumeChapter, chapterFinished ? 1 : resumePage)}
                  className="!text-lg !px-6"
                >
                  {chapterFinished
                    ? `LER NOVAMENTE · CAP. ${resumeChapter.number}`
                    : `CONTINUAR DE ONDE PAROU · CAP. ${resumeChapter.number} · PÁG. ${resumePage}`}
                </Button>
              ) : (
                <Button
                  variant="primary"
                  onClick={() => firstChapter && handleChapterClick(firstChapter)}
                  disabled={!firstChapter}
                  className="!text-lg !px-6"
                >
                  LER DO COMEÇO
                </Button>
              )}

              <button
                type="button"
                onClick={handleToggleFavorite}
                aria-pressed={isFavorited}
                className={`inline-flex items-center gap-2 px-4 py-2.5 font-display text-base uppercase border-2 transition-all ${
                  isFavorited
                    ? 'bg-[var(--mn-yellow)] text-[var(--mn-ink)] border-[var(--mn-ink)] shadow-[3px_3px_0_var(--mn-paper)]'
                    : 'bg-[var(--mn-ink)] text-[var(--mn-paper)] border-[var(--mn-line)] hover:border-[var(--mn-yellow)]'
                }`}
              >
                <Star size={16} className={isFavorited ? 'fill-[var(--mn-ink)]' : ''} />
                <span>{isFavorited ? 'NA BIBLIOTECA' : 'FAVORITAR'}</span>
                <span className="tabular-nums opacity-80">{Number(favoritesCount).toLocaleString('pt-BR')}</span>
              </button>

              {creator && (
                <Button
                  variant="secondary"
                  onClick={() => openDonate(creator.id, creator.name, work.title, work.id)}
                  className="!text-sm"
                >
                  APOIAR AUTOR
                </Button>
              )}

              {resumeChapter && !chapterFinished && readingProgress?.totalPages ? (
                <p className="w-full font-body text-xs text-[var(--mn-mute)]">
                  Você parou na página {resumePage} de {readingProgress.totalPages} do capítulo{' '}
                  {resumeChapter.number}.
                </p>
              ) : null}
            </div>

          </div>

        </div>
      </section>

      {/* 3. Grade de Conteúdo: Lista de Capítulos (Linhas) + Sidebar do Autor */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 items-start">
        
        {/* Coluna Principal: Capítulos */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b-2 border-[var(--mn-line)] pb-3">
            <h2 className="font-display text-2xl sm:text-3xl text-[var(--mn-paper)] uppercase tracking-wide">
              LISTA DE CAPÍTULOS
            </h2>

            <button
              type="button"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="flex items-center gap-1.5 font-pixel text-[12px] text-[var(--mn-yellow)] hover:underline"
            >
              <ArrowUpDown size={12} />
              <span>{sortOrder === 'asc' ? 'CRESCENTE' : 'DECRESCENTE'}</span>
            </button>
          </div>

          <div className="border-t-2 border-[var(--mn-line)]">
            {chaptersError && chapters.length === 0 && (
              <p className="py-6 font-body text-sm text-[var(--mn-mute)]">
                Não foi possível carregar os capítulos agora. Recarregue a página.
              </p>
            )}
            {chapters.map((chap) => {
              const isLocked = isChapterEarlyAccess(chap) && !isMemberOf(work.authorId);

              return (
                <div
                  key={chap.id}
                  onClick={() => handleChapterClick(chap)}
                  className="flex items-center justify-between p-3.5 border-b border-[var(--mn-line)] hover:bg-[var(--mn-ink-2)] cursor-pointer group transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <span className="font-display text-2xl text-[var(--mn-yellow)] tracking-tight w-12 text-center shrink-0">
                      #{chap.number < 10 ? `0${chap.number}` : chap.number}
                    </span>

                    <div>
                      <h4 className="font-display text-lg text-[var(--mn-paper)] group-hover:text-[var(--mn-yellow)] transition-colors uppercase">
                        {chap.title}
                      </h4>
                      <p className="font-body text-xs text-[var(--mn-mute)] tabular-nums flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span>{chap.format === 'PROSE' ? 'Light novel · prosa' : 'Mangá · páginas ilustradas'}</span>
                        <span className="inline-flex items-center gap-1" title="Visualizações do capítulo">
                          <Eye size={12} aria-hidden="true" />
                          {Number(chap.views ?? 0).toLocaleString('pt-BR')}
                        </span>
                        <span className="inline-flex items-center gap-1" title="Curtidas do capítulo">
                          <Heart size={12} aria-hidden="true" />
                          {Number(chap.likes ?? 0).toLocaleString('pt-BR')}
                        </span>
                      </p>
                      {chap.isEarlyAccess && (
                        <p className="font-pixel text-[10px] uppercase text-[var(--mn-teal)]">
                          {isLocked
                            ? `LANÇAMENTO EM ${new Date(chap.publicReleaseAt).toLocaleDateString('pt-BR')} · ANTECIPADO PARA MEMBROS`
                            : `LANÇAMENTO EM ${new Date(chap.publicReleaseAt).toLocaleDateString('pt-BR')}`}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Botão de Download / Indicador Offline VIP */}
                    {chap.format !== 'PROSE' && <button
                      type="button"
                      onClick={(e) => handleDownloadOffline(e, chap)}
                      title={
                        offlineChapterIds.has(chap.id)
                          ? 'Capítulo salvo para leitura offline (Clique para remover)'
                          : user?.isVip
                          ? 'Baixar capítulo para leitura offline'
                          : 'Recurso exclusivo para assinantes VIP MangaNetWorking'
                      }
                      className={`p-1.5 border transition-all flex items-center gap-1.5 text-[11px] font-pixel uppercase ${
                        offlineChapterIds.has(chap.id)
                          ? 'border-[var(--mn-ok)] bg-[var(--mn-ok)]/10 text-[var(--mn-ok)]'
                          : 'border-[var(--mn-line)] text-[var(--mn-mute)] hover:border-[var(--mn-yellow)] hover:text-[var(--mn-yellow)]'
                      }`}
                    >
                      {downloadingChapterId === chap.id ? (
                        <Loader2 size={13} className="animate-spin text-[var(--mn-yellow)]" />
                      ) : offlineChapterIds.has(chap.id) ? (
                        <>
                          <CheckCircle2 size={13} />
                          <span className="hidden sm:inline">OFFLINE</span>
                        </>
                      ) : (
                        <>
                          <Download size={13} />
                          <span className="hidden sm:inline">BAIXAR</span>
                        </>
                      )}
                    </button>}

                    {isLocked ? (
                      <Sticker kind="members" />
                    ) : (
                      <span className="font-pixel text-[12px] text-[var(--mn-mute)] group-hover:text-[var(--mn-yellow)]">
                        LER →
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Botão de Denúncia Discreto (Seção 8.11) */}
          <div className="pt-4 flex justify-end">
            <button
              type="button"
              onClick={() => openReport(work.id, work.title)}
              className="inline-flex items-center gap-1.5 font-body text-xs text-[var(--mn-mute)] hover:text-[var(--mn-red)] transition-colors"
            >
              <Flag size={13} />
              <span>DENUNCIAR ESTA OBRA</span>
            </button>
          </div>
        </section>

        {/* Sidebar: Card de Apoio ao Criador & Atualização */}
        <aside className="space-y-6">
          {creator && (
            <div className="border-2 border-[var(--mn-line)] bg-[var(--mn-ink-2)] p-5 space-y-4">
              <span className="font-pixel text-[12px] text-[var(--mn-yellow)] tracking-wider uppercase block font-bold">
                SOBRE O CRIADOR
              </span>

              <div className="flex items-center gap-3">
                <img
                  src={creator.avatarUrl}
                  alt={creator.name}
                  className="w-12 h-12 object-cover border-2 border-[var(--mn-ink)] shadow-[2px_2px_0_var(--mn-yellow)]"
                />
                <div>
                  <h4 className="font-display text-lg text-[var(--mn-paper)] uppercase">
                    {creator.name}
                  </h4>
                  <span className="font-body text-xs text-[var(--mn-mute)]">
                    @{creator.handle.replace(/^@/, '')}
                  </span>
                </div>
              </div>

              <p className="font-body text-xs text-[var(--mn-paper)] leading-relaxed">
                {creator.bio}
              </p>

              <div className="pt-2 border-t border-[var(--mn-line)] flex flex-col gap-2.5">
                {creator.membershipPriceBrl > 0 && <button
                  type="button"
                  onClick={() => openMembership(creator)}
                  className="w-full py-2.5 bg-[var(--mn-yellow)] text-[var(--mn-ink)] border-2 border-[var(--mn-ink)] font-display text-sm sm:text-base tracking-wider uppercase shadow-[3px_3px_0_var(--mn-ink)] hover:bg-[var(--mn-yellow-press)] transition-colors flex items-center justify-center gap-1.5"
                >
                  <Sparkles size={16} />
                  <span>VIRAR MEMBRO (R$ {creator.membershipPriceBrl.toFixed(2)}/mês)</span>
                </button>}

                <Button
                  variant="secondary"
                  onClick={() => openDonate(creator.id, creator.name, work.title, work.id)}
                  className="w-full !min-h-[44px] !text-sm !py-2.5 font-display tracking-wider uppercase"
                >
                  DOAR QUALQUER VALOR
                </Button>
              </div>
            </div>
          )}

          <div className="border-2 border-[var(--mn-line)] bg-[var(--mn-ink-2)] p-5 space-y-2">
            <span className="font-pixel text-[12px] text-[var(--mn-mute)] tracking-wider uppercase block">
              CRONOGRAMA EDITORIAL
            </span>
            <div className="flex items-center gap-2 text-xs font-body text-[var(--mn-paper)]">
              <Calendar size={14} className="text-[var(--mn-yellow)]" />
              <span>Capítulos novos toda sexta-feira às 18h.</span>
            </div>
          </div>
        </aside>

      </div>

    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { isChapterEarlyAccess } from '../utils/discoveryAlgorithm';
import { useAuth } from '../context/AuthContext';
import { Work, Chapter } from '../types';
import { Win } from '../components/ui/Win';
import { Sticker } from '../components/ui/Sticker';
import { Cover } from '../components/ui/Cover';
import { WorkCard } from '../components/ui/WorkCard';
import { RankRow } from '../components/ui/RankRow';
import { Marquee } from '../components/ui/Marquee';
import { FormatSwitcher } from '../components/ui/FormatSwitcher';
import { FormatBadge } from '../components/ui/FormatBadge';
import { ArrowRight, ChevronLeft, ChevronRight, PenLine } from 'lucide-react';
import { workApi } from '../api/workApi';
import { userApi, ReadingProgressDto } from '../api/authApi';
import { mapWorkDetailsToWork } from '../utils/apiMappers';
import {
  FormatFilter,
  formatFromParam,
  formatToParam,
  isLightNovel,
  chapterLabel,
  relativeTime,
  dayLabel,
} from '../utils/formatMeta';
import { MIN_RAIL_SIZE, groupReleasesByWork, useHomeDiscovery } from '../hooks/useHomeDiscovery';
import { ReleaseRow } from '../utils/apiMappers';

interface HomePageProps {
  onSelectWork: (work: Work) => void;
  onOpenChapter: (work: Work, chapter: Chapter, page?: number) => void;
  onNavigateToCatalog?: () => void;
  /** CTA de cold start (autor logado). */
  onPublishWork?: () => void;
}

const HOME_FORMAT_PARAM = 'inicio';

function readHomeFormat(search: string): FormatFilter {
  const raw = new URLSearchParams(search).get(HOME_FORMAT_PARAM);
  return formatFromParam(raw);
}

export function HomePage({
  onSelectWork,
  onOpenChapter,
  onNavigateToCatalog,
  onPublishWork,
}: HomePageProps) {
  const { user, isAuthenticated, isMemberOf } = useAuth();

  const [formato, setFormato] = useState<FormatFilter>(() => readHomeFormat(window.location.search));
  const [heroIndex, setHeroIndex] = useState(0);
  const [progress, setProgress] = useState<ReadingProgressDto | null>(null);

  const discovery = useHomeDiscovery(formato);

  // Formato na URL (`?inicio=light-novel`): link compartilhado e F5 preservam o recorte.
  useEffect(() => {
    const onPopState = () => {
      setFormato(readHomeFormat(window.location.search));
      setHeroIndex(0);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const applyFormat = (next: FormatFilter) => {
    setFormato(next);
    setHeroIndex(0);
    const url = new URL(window.location.href);
    const param = formatToParam(next);
    if (param) url.searchParams.set(HOME_FORMAT_PARAM, param);
    else url.searchParams.delete(HOME_FORMAT_PARAM);
    window.history.replaceState({ tab: 'feed' }, '', `${url.pathname}${url.search}${url.hash}`);
  };

  // "Continuar lendo": só dados reais de progresso; nada é fabricado.
  useEffect(() => {
    if (!isAuthenticated) {
      setProgress(null);
      return;
    }
    let active = true;
    userApi
      .getReadingProgress()
      .then((entries) => {
        if (!active) return;
        const latest = [...entries]
          .filter((entry) => entry.workSlug)
          .sort((a, b) => Date.parse(b.updatedAt ?? '') - Date.parse(a.updatedAt ?? ''))[0];
        setProgress(latest ?? null);
      })
      .catch(() => {
        if (active) setProgress(null);
      });
    return () => {
      active = false;
    };
  }, [isAuthenticated]);

  const heroWorks = discovery.hero;
  const currentHero = heroWorks.length > 0 ? heroWorks[heroIndex % heroWorks.length] : null;

  /** Abre o capítulo 1 real da obra (o catálogo não carrega a lista de capítulos). */
  const handleReadNow = async (work: Work) => {
    try {
      const dto = await workApi.getWorkBySlug(work.slug);
      const detailed = mapWorkDetailsToWork(dto);
      const first = detailed.chapters?.[0];
      if (!first) {
        onSelectWork(detailed);
        return;
      }
      if (isChapterEarlyAccess(first) && !isMemberOf(detailed.authorId)) {
        onSelectWork(detailed);
        return;
      }
      onOpenChapter(detailed, first);
    } catch {
      onSelectWork(work);
    }
  };

  /** Linha de lançamento → leitor do capítulo certo (páginas ou scroll). */
  const openRelease = (release: ReleaseRow) => {
    const work: Work = {
      id: release.workId,
      slug: release.workSlug,
      title: release.workTitle,
      authorId: '',
      authorName: '',
      coverUrl: release.coverUrl,
      bannerUrl: release.coverUrl,
      synopsis: '',
      genres: [],
      status: 'ongoing',
      format: release.format,
      totalChapters: release.totalChapters,
      totalViews: release.totalViews,
      totalLikes: 0,
      totalFavorites: release.totalFavorites,
      totalComments: 0,
      rating: 0,
      updatedAt: release.publishedAt,
    };
    const chapter: Chapter = {
      id: release.chapterId,
      workId: release.workId,
      number: release.chapterNumber,
      title: release.chapterTitle,
      coverUrl: release.coverUrl,
      pages: [],
      createdAt: release.publishedAt,
      publicReleaseAt: release.publishedAt,
      views: 0,
      likes: 0,
      commentsCount: 0,
      format: isLightNovel(release.format) ? 'PROSE' : 'IMAGE_PAGES',
    };
    onOpenChapter(work, chapter);
  };

  const progressWork: Work | null = progress?.workSlug
    ? {
        id: progress.workId,
        slug: progress.workSlug,
        title: progress.workTitle ?? '',
        authorId: '',
        authorName: '',
        coverUrl: progress.workCoverUrl ?? '',
        bannerUrl: progress.workCoverUrl ?? '',
        synopsis: '',
        genres: [],
        status: 'ongoing',
        format: progress.workFormat ?? 'MANGA',
        totalChapters: 0,
        totalViews: 0,
        totalLikes: 0,
        totalFavorites: 0,
        totalComments: 0,
        rating: 0,
        updatedAt: progress.updatedAt ?? '',
      }
    : null;

  const progressChapter: Chapter | null =
    progress && progressWork && progress.chapterId
      ? {
          id: progress.chapterId,
          workId: progress.workId,
          number: progress.chapterNumber ?? 1,
          title: progress.chapterTitle ?? '',
          coverUrl: progress.workCoverUrl ?? undefined,
          pages: [],
          createdAt: progress.updatedAt ?? '',
          publicReleaseAt: progress.updatedAt ?? '',
          views: 0,
          likes: 0,
          commentsCount: 0,
          format: isLightNovel(progressWork.format) ? 'PROSE' : 'IMAGE_PAGES',
        }
      : null;

  const recentGroups = useMemo(
    () => groupReleasesByWork(discovery.releases, 3).slice(0, 4),
    [discovery.releases]
  );

  const timeline = useMemo(() => {
    const visible = discovery.releases.slice(0, 20);
    const groups = new Map<string, ReleaseRow[]>();
    for (const release of visible) {
      const key = dayLabel(release.publishedAt);
      const list = groups.get(key);
      if (list) list.push(release);
      else groups.set(key, [release]);
    }
    return Array.from(groups.entries());
  }, [discovery.releases]);

  const showMangaRail = formato !== 'LIGHT_NOVEL';
  const showNovelRail = formato !== 'MANGA';

  const coldStartCta = (label: string) =>
    user?.isCreator && onPublishWork ? (
      <button
        type="button"
        onClick={onPublishWork}
        className="w-full flex items-center gap-3 border-2 border-dashed border-[var(--mn-line)] hover:border-[var(--mn-yellow)] hover:bg-[var(--mn-ink-2)] px-4 py-5 text-left transition-colors"
      >
        <PenLine size={20} className="text-[var(--mn-yellow)] shrink-0" aria-hidden="true" />
        <span>
          <span className="font-display text-lg text-[var(--mn-paper)] uppercase block leading-tight">{label}</span>
          <span className="font-body text-xs text-[var(--mn-mute)]">
            Ainda há poucas obras aqui. Publique a sua e ocupe este espaço.
          </span>
        </span>
      </button>
    ) : null;

  if (discovery.loading && discovery.hero.length === 0) {
    return (
      <div className="mn-container py-16 space-y-6" role="status" aria-label="Carregando a home">
        <div className="h-56 bg-[var(--mn-ink-2)] animate-pulse border-2 border-[var(--mn-line)]" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="aspect-[2/3] bg-[var(--mn-ink-2)] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-12 select-none pb-12">
      {/* 1. HERO */}
      {currentHero ? (
        <section className="relative w-full bg-[var(--mn-yellow)] text-[var(--mn-ink)] border-b-2 border-[var(--mn-ink)] mn-grain mn-cut pt-10 pb-16 overflow-hidden">
          <div className="absolute inset-0 mn-halftone pointer-events-none opacity-20" />
          <div className="absolute top-0 right-0 w-80 h-full mn-stripes opacity-15 pointer-events-none" />

          <div className="mn-container relative z-10 grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-8 items-center">
            <div className="space-y-4">
              <div className="flex items-center gap-3 flex-wrap">
                <Sticker kind="new" label="DESTAQUE AGORA" rotate={-2} />
                <FormatBadge format={currentHero.format} size="md" />
                <span className="font-pixel text-[12px] tracking-wider text-[var(--mn-ink)] font-bold">
                  POR {currentHero.authorName}
                </span>
              </div>

              <h1 className="font-display text-4xl sm:text-6xl md:text-7xl leading-[1.05] pt-1.5 uppercase text-[var(--mn-ink)] tracking-tight">
                {currentHero.title}
              </h1>

              <p className="font-body text-base sm:text-lg text-[var(--mn-ink)] line-clamp-3 leading-snug font-medium max-w-xl">
                {currentHero.synopsis || 'Sinopse em breve.'}
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => void handleReadNow(currentHero)}
                  className="px-6 py-3 font-display text-lg tracking-wider uppercase bg-[var(--mn-ink)] text-[var(--mn-yellow)] border-2 border-[var(--mn-ink)] shadow-[4px_4px_0_var(--mn-paper)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_var(--mn-paper)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer"
                >
                  LER AGORA
                </button>

                <button
                  type="button"
                  onClick={() => onSelectWork(currentHero)}
                  className="px-6 py-3 font-display text-lg tracking-wider uppercase bg-transparent text-[var(--mn-ink)] border-2 border-[var(--mn-ink)] shadow-[4px_4px_0_var(--mn-ink)] hover:bg-[rgba(11,11,12,0.08)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_var(--mn-ink)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer"
                >
                  VER OBRA
                </button>
              </div>

              {heroWorks.length > 1 && (
                <div className="flex items-center gap-2 pt-4">
                  {heroWorks.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setHeroIndex(idx)}
                      aria-label={`Destaque ${idx + 1}`}
                      className={`w-3.5 h-3.5 border-2 border-[var(--mn-ink)] transition-all ${
                        heroIndex === idx ? 'bg-[var(--mn-ink)]' : 'bg-transparent'
                      }`}
                    />
                  ))}
                  <div className="flex gap-1 ml-3">
                    <button
                      onClick={() => setHeroIndex((prev) => (prev - 1 + heroWorks.length) % heroWorks.length)}
                      className="w-7 h-7 border-2 border-[var(--mn-ink)] bg-[var(--mn-yellow)] flex items-center justify-center font-bold hover:bg-[var(--mn-ink)] hover:text-[var(--mn-yellow)] transition-colors"
                      aria-label="Anterior"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      onClick={() => setHeroIndex((prev) => (prev + 1) % heroWorks.length)}
                      className="w-7 h-7 border-2 border-[var(--mn-ink)] bg-[var(--mn-yellow)] flex items-center justify-center font-bold hover:bg-[var(--mn-ink)] hover:text-[var(--mn-yellow)] transition-colors"
                      aria-label="Próximo"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="relative flex justify-center lg:justify-end">
              <div className="absolute w-56 sm:w-64 aspect-[2/3] border-2 border-[var(--mn-ink)] bg-[var(--mn-paper)] -rotate-3 translate-x-4 translate-y-3 pointer-events-none opacity-80" />
              <div
                onClick={() => onSelectWork(currentHero)}
                className="relative w-56 sm:w-64 aspect-[2/3] border-2 border-[var(--mn-ink)] shadow-[8px_8px_0_var(--mn-ink)] rotate-2 hover:rotate-0 transition-transform duration-150 cursor-pointer overflow-hidden z-10"
              >
                <Cover src={currentHero.coverUrl} title={currentHero.title} aspectRatio="2/3" dropShadow={false} />
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="mn-container pt-10">
          <div className="border-2 border-dashed border-[var(--mn-line)] bg-[var(--mn-ink-2)] p-8 text-center space-y-3">
            <h1 className="font-display text-3xl text-[var(--mn-yellow)] uppercase">A banca está começando</h1>
            <p className="font-body text-sm text-[var(--mn-mute)]">
              Ainda não há obras publicadas neste formato. Enquanto isso, explore o catálogo completo.
            </p>
            {onNavigateToCatalog && (
              <button
                type="button"
                onClick={onNavigateToCatalog}
                className="px-4 py-2 bg-[var(--mn-yellow)] text-[var(--mn-ink)] font-pixel text-[12px] uppercase border-2 border-[var(--mn-ink)] shadow-[3px_3px_0_var(--mn-ink)]"
              >
                Ver catálogo
              </button>
            )}
          </div>
        </section>
      )}

      {/* 2. EIXO 1: FORMATO (sempre visível, com o mesmo componente do catálogo) */}
      <section className="border-b-2 border-[var(--mn-line)] bg-[var(--mn-ink)] py-3 sticky top-[70px] md:top-[82px] z-30">
        <div className="mn-container flex flex-col sm:flex-row sm:items-center gap-3">
          <span className="font-pixel text-[12px] tracking-wider uppercase text-[var(--mn-mute)]">
            Ver por formato
          </span>
          <FormatSwitcher value={formato} onChange={applyFormat} />
          {onNavigateToCatalog && (
            <button
              type="button"
              onClick={onNavigateToCatalog}
              className="sm:ml-auto font-pixel text-[12px] text-[var(--mn-yellow)] hover:underline inline-flex items-center gap-1"
            >
              CATÁLOGO COMPLETO <ArrowRight size={13} aria-hidden="true" />
            </button>
          )}
        </div>
      </section>

      <Marquee />

      <div className="mn-container space-y-12">
        {/* 3. CONTINUAR LENDO (dados reais de progresso) */}
        {progress && progressWork && progressChapter && (
          <section className="space-y-3 max-w-xl">
            <h2 className="font-display text-2xl text-[var(--mn-paper)] uppercase tracking-wide">CONTINUAR LENDO</h2>
            <Win title="CONTINUAR_LENDO.EXE">
              <div className="flex items-center gap-4">
                <div className="w-[68px] h-[102px] shrink-0 border border-[var(--mn-line)]">
                  <Cover src={progressWork.coverUrl} title={progressWork.title} aspectRatio="2/3" dropShadow={false} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <FormatBadge format={progressWork.format} />
                    <span className="font-pixel text-[12px] text-[var(--mn-yellow)] block uppercase tracking-wider">
                      {isLightNovel(progressWork.format)
                        ? `CAP. ${progress.chapterNumber ?? 1}`
                        : `PÁG. ${progress.page ?? 1}/${progress.totalPages ?? 1}`}
                    </span>
                  </div>
                  <h4 className="font-display text-lg text-[var(--mn-paper)] truncate uppercase mt-1">
                    {progressWork.title}
                  </h4>
                  <p className="font-body text-xs text-[var(--mn-mute)] truncate">
                    {chapterLabel(progressWork.format, progress.chapterNumber ?? 1)} — {progress.chapterTitle}
                  </p>

                  {(progress.totalPages ?? 0) > 1 && (
                    <div className="mt-2 h-1.5 w-full bg-[var(--mn-line)] border border-[var(--mn-line)]" aria-hidden="true">
                      <div
                        className="h-full bg-[var(--mn-yellow)]"
                        style={{
                          width: `${Math.min(
                            100,
                            Math.round(((progress.page ?? 1) / (progress.totalPages ?? 1)) * 100)
                          )}%`,
                        }}
                      />
                    </div>
                  )}
                </div>

                <div className="shrink-0 flex flex-col gap-1.5">
                  <button
                    type="button"
                    onClick={() => onOpenChapter(progressWork, progressChapter, progress.page ?? undefined)}
                    className="px-3.5 py-2 bg-[var(--mn-yellow)] text-[var(--mn-ink)] font-pixel text-[12px] uppercase border-2 border-[var(--mn-ink)] shadow-[3px_3px_0_var(--mn-ink)]"
                  >
                    CONTINUAR
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectWork(progressWork)}
                    className="px-3.5 py-1 font-pixel text-[12px] uppercase text-[var(--mn-mute)] hover:text-[var(--mn-yellow)]"
                  >
                    FICHA
                  </button>
                </div>
              </div>
            </Win>
          </section>
        )}

        {/* 4. NOVOS CAPÍTULOS (agrupados por obra, até 3 capítulos por obra) */}
        <section className="space-y-4">
          <div className="flex items-end justify-between border-b-2 border-[var(--mn-line)] pb-3">
            <div>
              <h2 className="font-display text-3xl sm:text-4xl text-[var(--mn-paper)] uppercase tracking-wide">
                NOVOS CAPÍTULOS
              </h2>
              <span className="font-body text-xs text-[var(--mn-mute)]">
                Lançamentos independentes publicados direto pelos criadores
              </span>
            </div>
            {onNavigateToCatalog && (
              <button
                type="button"
                onClick={onNavigateToCatalog}
                className="font-pixel text-[12px] text-[var(--mn-yellow)] hover:underline whitespace-nowrap"
              >
                CATÁLOGO COMPLETO →
              </button>
            )}
          </div>

          {recentGroups.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
              {recentGroups.map((group) => (
                <WorkCard
                  key={group.work.id}
                  work={group.work}
                  onSelect={onSelectWork}
                  isFavorite={user?.favorites?.includes(group.work.id) ?? false}
                  analyticsSurface="FEED"
                  analyticsEnabled={isAuthenticated}
                  footer={
                    <ul className="space-y-1 border-t border-[var(--mn-line)] pt-1.5">
                      {group.chapters.map((chapter) => (
                        <li key={chapter.chapterId}>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              openRelease(chapter);
                            }}
                            className="w-full flex items-center justify-between gap-2 text-left font-body text-[11px] text-[var(--mn-mute)] hover:text-[var(--mn-yellow)]"
                          >
                            <span className="truncate">
                              {chapterLabel(chapter.format, chapter.chapterNumber)} · {chapter.chapterTitle}
                            </span>
                            <span className="shrink-0 tabular-nums">{relativeTime(chapter.publishedAt)}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  }
                />
              ))}
            </div>
          ) : (
            coldStartCta('Publique o primeiro capítulo') ?? (
              <p className="font-body text-sm text-[var(--mn-mute)]">
                Nenhum capítulo publicado neste formato ainda.
              </p>
            )
          )}
        </section>

        {/* 5. EM ALTA POR FORMATO (rankings nunca misturam formatos) */}
        {showMangaRail &&
          (discovery.trendingManga.length >= MIN_RAIL_SIZE ? (
            <section className="space-y-4">
              <div className="flex items-center justify-between border-b-2 border-[var(--mn-line)] pb-3">
                <h2 className="font-display text-3xl sm:text-4xl text-[var(--mn-paper)] uppercase tracking-wide">
                  MANGÁS EM ALTA
                </h2>
                {onNavigateToCatalog && (
                  <button
                    type="button"
                    onClick={onNavigateToCatalog}
                    className="flex items-center gap-1 font-pixel text-[12px] text-[var(--mn-yellow)] hover:underline"
                  >
                    VER TODOS <ArrowRight size={13} aria-hidden="true" />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-2">
                {discovery.trendingManga.slice(0, 5).map((work, idx) => (
                  <RankRow key={work.id} rank={idx + 1} work={work} onSelect={onSelectWork} />
                ))}
              </div>
            </section>
          ) : (
            coldStartCta('Publique o primeiro mangá')
          ))}

        {showNovelRail &&
          (discovery.trendingLightNovel.length >= MIN_RAIL_SIZE ? (
            <section className="space-y-4">
              <div className="flex items-center justify-between border-b-2 border-[var(--mn-line)] pb-3">
                <h2 className="font-display text-3xl sm:text-4xl text-[var(--mn-paper)] uppercase tracking-wide">
                  LIGHT NOVELS EM ALTA
                </h2>
                {onNavigateToCatalog && (
                  <button
                    type="button"
                    onClick={onNavigateToCatalog}
                    className="flex items-center gap-1 font-pixel text-[12px] text-[var(--mn-yellow)] hover:underline"
                  >
                    VER TODAS <ArrowRight size={13} aria-hidden="true" />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-2">
                {discovery.trendingLightNovel.slice(0, 5).map((work, idx) => (
                  <RankRow key={work.id} rank={idx + 1} work={work} onSelect={onSelectWork} />
                ))}
              </div>
            </section>
          ) : (
            coldStartCta('Publique a primeira light novel')
          ))}

        {/* 6. FEED & LANÇAMENTOS (timeline por dia) */}
        {timeline.length > 0 && (
          <section className="space-y-4">
            <div className="border-b-2 border-[var(--mn-line)] pb-3">
              <h2 className="font-display text-3xl sm:text-4xl text-[var(--mn-paper)] uppercase tracking-wide">
                LANÇAMENTOS
              </h2>
              <span className="font-body text-xs text-[var(--mn-mute)]">
                Tudo o que ficou público, agrupado por dia
              </span>
            </div>

            <div className="space-y-6">
              {timeline.map(([day, releases]) => (
                <div key={day} className="space-y-2">
                  <h3 className="font-pixel text-[12px] uppercase tracking-wider text-[var(--mn-yellow)]">{day}</h3>
                  <ul className="divide-y divide-[var(--mn-line)] border-2 border-[var(--mn-line)] bg-[var(--mn-ink-2)]">
                    {releases.map((release) => (
                      <li key={release.chapterId}>
                        <button
                          type="button"
                          onClick={() => openRelease(release)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-[var(--mn-ink)] transition-colors"
                        >
                          <div className="w-9 h-[54px] shrink-0 border border-[var(--mn-line)] overflow-hidden">
                            <Cover src={release.coverUrl} title={release.workTitle} aspectRatio="2/3" dropShadow={false} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <FormatBadge format={release.format} />
                              <span className="font-display text-sm text-[var(--mn-paper)] uppercase truncate">
                                {release.workTitle}
                              </span>
                            </div>
                            <p className="font-body text-xs text-[var(--mn-mute)] truncate">
                              {chapterLabel(release.format, release.chapterNumber)} · {release.chapterTitle}
                            </p>
                          </div>
                          <span className="shrink-0 font-body text-[11px] text-[var(--mn-mute)] tabular-nums">
                            {relativeTime(release.publishedAt)}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

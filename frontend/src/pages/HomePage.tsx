import { PenLine } from 'lucide-react';
import { Work, Chapter } from '../types';
import { useAuth } from '../context/AuthContext';
import { Marquee } from '../components/ui/Marquee';
import { MIN_RAIL_SIZE } from '../hooks/useHomeDiscovery';
import { useHomeNavigation } from '../components/home/useHomeNavigation';
import { HomeHeroSection } from '../components/home/HomeHeroSection';
import { HomeFormatBar } from '../components/home/HomeFormatBar';
import { HomeContinueReading } from '../components/home/HomeContinueReading';
import { HomeRecentReleases } from '../components/home/HomeRecentReleases';
import { HomeTrendingRails } from '../components/home/HomeTrendingRails';

export interface HomePageProps {
  onSelectWork: (work: Work) => void;
  onOpenChapter: (work: Work, chapter: Chapter, page?: number) => void;
  onNavigateToCatalog?: () => void;
  /** CTA de cold start (autor logado). */
  onPublishWork?: () => void;
  onOpenPublicProfile?: (username: string) => void;
}

/**
 * Orquestrador limpo da Home / Feed Editorial.
 * Decomposto modularmente conforme TASK-107: consome useHomeNavigation e
 * orquestra Hero, Barra de Formato, Continuar Lendo, Lançamentos, Rankings e Timeline.
 */
export function HomePage({
  onSelectWork,
  onOpenChapter,
  onNavigateToCatalog,
  onPublishWork,
  onOpenPublicProfile,
}: HomePageProps) {
  const { user, isAuthenticated } = useAuth();

  const {
    formato,
    applyFormat,
    heroIndex,
    setHeroIndex,
    discovery,
    heroWorks,
    currentHero,
    progress,
    progressWork,
    progressChapter,
    recentGroups,
    handleReadNow,
    openRelease,
  } = useHomeNavigation({ onSelectWork, onOpenChapter });

  const showMangaRail = formato !== 'LIGHT_NOVEL';
  const showNovelRail = formato !== 'MANGA';

  // Notificação de cold-start unificada: 1 único bloco com lógica condicional
  const totalMangas = discovery.trendingManga.length;
  const totalNovels = discovery.trendingLightNovel.length;

  const coldStartLabel: string | null = (() => {
    if (!user?.isCreator || !onPublishWork) return null;
    if (totalMangas > 10 && totalNovels > 10) return null;
    if (totalMangas <= 10 && totalNovels <= 10)
      return 'Poucas obras ainda — publique um mangá ou light novel';
    if (totalMangas > 10 && totalNovels <= 10)
      return 'Poucas light novels — publique uma para diversificar';
    return 'Poucos mangás — publique um para crescer o catálogo';
  })();

  const coldStartCta =
    coldStartLabel && onPublishWork ? (
      <button
        type="button"
        onClick={onPublishWork}
        className="w-full flex items-center gap-3 border border-dashed border-[var(--mn-line)] hover:border-[var(--mn-yellow)] hover:bg-[var(--mn-ink-2)] px-4 py-4 text-left transition-colors"
      >
        <PenLine size={18} className="text-[var(--mn-yellow)] shrink-0" aria-hidden="true" />
        <span className="font-body text-xs text-[var(--mn-mute)] leading-snug">
          {coldStartLabel}
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
      {/* 1. HERO BANNER */}
      <HomeHeroSection
        currentHero={currentHero}
        heroWorks={heroWorks}
        heroIndex={heroIndex}
        onSetHeroIndex={setHeroIndex}
        onReadNow={handleReadNow}
        onSelectWork={onSelectWork}
        onOpenAuthorProfile={onOpenPublicProfile}
        onNavigateToCatalog={onNavigateToCatalog}
      />

      {/* 2. EIXO DE FORMATO */}
      <HomeFormatBar
        formato={formato}
        onApplyFormat={applyFormat}
        onNavigateToCatalog={onNavigateToCatalog}
      />

      <Marquee />

      <div className="mn-container space-y-12">
        {/* 3. CONTINUAR LENDO */}
        <HomeContinueReading
          progress={progress}
          progressWork={progressWork}
          progressChapter={progressChapter}
          onOpenChapter={onOpenChapter}
          onSelectWork={onSelectWork}
        />

        {/* 4. NOVOS CAPÍTULOS */}
        <HomeRecentReleases
          recentGroups={recentGroups}
          onSelectWork={onSelectWork}
          onOpenRelease={openRelease}
          favorites={user?.favorites}
          isAuthenticated={isAuthenticated}
        />

        {/* 5. AVISO COLD-START ÚNICO (UMA ÚNICA NOTIFICAÇÃO CONDICIONAL) */}
        {coldStartCta}

        {/* 6. RANKINGS EM ALTA POR FORMATO (SOMENTE SE HOUVER OBRAS SUFICIENTES) */}
        <HomeTrendingRails
          showMangaRail={showMangaRail}
          showNovelRail={showNovelRail}
          trendingManga={discovery.trendingManga}
          trendingLightNovel={discovery.trendingLightNovel}
          minRailSize={MIN_RAIL_SIZE}
          onSelectWork={onSelectWork}
          onNavigateToCatalog={onNavigateToCatalog}
        />
      </div>
    </div>
  );
}

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
import { HomeTimeline } from '../components/home/HomeTimeline';

export interface HomePageProps {
  onSelectWork: (work: Work) => void;
  onOpenChapter: (work: Work, chapter: Chapter, page?: number) => void;
  onNavigateToCatalog?: () => void;
  /** CTA de cold start (autor logado). */
  onPublishWork?: () => void;
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
    timeline,
    handleReadNow,
    openRelease,
  } = useHomeNavigation({ onSelectWork, onOpenChapter });

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
      {/* 1. HERO BANNER */}
      <HomeHeroSection
        currentHero={currentHero}
        heroWorks={heroWorks}
        heroIndex={heroIndex}
        onSetHeroIndex={setHeroIndex}
        onReadNow={handleReadNow}
        onSelectWork={onSelectWork}
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
          coldStartCta={coldStartCta('Publique o primeiro capítulo')}
          onNavigateToCatalog={onNavigateToCatalog}
        />

        {/* 5. RANKINGS EM ALTA POR FORMATO */}
        <HomeTrendingRails
          showMangaRail={showMangaRail}
          showNovelRail={showNovelRail}
          trendingManga={discovery.trendingManga}
          trendingLightNovel={discovery.trendingLightNovel}
          minRailSize={MIN_RAIL_SIZE}
          onSelectWork={onSelectWork}
          onNavigateToCatalog={onNavigateToCatalog}
          mangaColdStartCta={coldStartCta('Publique o primeiro mangá')}
          novelColdStartCta={coldStartCta('Publique a primeira light novel')}
        />

        {/* 6. TIMELINE DE LANÇAMENTOS POR DIA */}
        <HomeTimeline timeline={timeline} onOpenRelease={openRelease} />
      </div>
    </div>
  );
}

import { Suspense, lazy } from 'react';
import { AppTab } from '../layout/Header';
import { Work, Chapter } from '../../types';
import { HomePage } from '../../pages/HomePage';
import { CatalogPage } from '../../pages/CatalogPage';
import { BibliotecaPage } from '../../pages/BibliotecaPage';
import { AccountProfilePage } from '../../pages/AccountProfilePage';

// Rotas secundárias e administrativas carregadas sob demanda via Code-Splitting (React.lazy)
const SobrePage = lazy(() => import('../../pages/SobrePage').then((m) => ({ default: m.SobrePage })));
const CreatorDashboardPage = lazy(() => import('../../pages/CreatorDashboardPage').then((m) => ({ default: m.CreatorDashboardPage })));
const CreatorAnalyticsPage = lazy(() => import('../../pages/CreatorAnalyticsPage').then((m) => ({ default: m.CreatorAnalyticsPage })));
const ModerationBackofficePage = lazy(() => import('../../pages/ModerationBackofficePage').then((m) => ({ default: m.ModerationBackofficePage })));
const CreatorChaptersPage = lazy(() => import('../../pages/CreatorChaptersPage').then((m) => ({ default: m.CreatorChaptersPage })));
const CreatorWorksPage = lazy(() => import('../../pages/CreatorWorksPage').then((m) => ({ default: m.CreatorWorksPage })));
const CreatorMissionsPage = lazy(() => import('../../pages/CreatorMissionsPage').then((m) => ({ default: m.CreatorMissionsPage })));
const CreatorMonetizationPage = lazy(() => import('../../pages/CreatorMonetizationPage').then((m) => ({ default: m.CreatorMonetizationPage })));
const BecomeWriterPage = lazy(() => import('../../pages/BecomeWriterPage').then((m) => ({ default: m.BecomeWriterPage })));
const OnboardingPage = lazy(() => import('../../pages/OnboardingPage').then((m) => ({ default: m.OnboardingPage })));
const PublicProfilePage = lazy(() => import('../../pages/PublicProfilePage').then((m) => ({ default: m.PublicProfilePage })));

function RouteLoadingFallback() {
  return (
    <div className="mn-container py-24 text-center">
      <p className="font-pixel text-xs text-[var(--mn-mute)] uppercase tracking-wider animate-pulse">
        Carregando seção...
      </p>
    </div>
  );
}

interface AppTabRouterProps {
  currentTab: AppTab;
  publicProfileUsername: string;
  authUsername?: string;
  onSelectWork: (work: Work) => void;
  onOpenChapter: (work: Work, chapter: Chapter, page?: number) => void;
  onSwitchTab: (tab: AppTab) => void;
  onOpenPublicProfile: (username: string) => void;
  onProfileSaved: () => Promise<void>;
}

export function AppTabRouter({
  currentTab,
  publicProfileUsername,
  authUsername,
  onSelectWork,
  onOpenChapter,
  onSwitchTab,
  onOpenPublicProfile,
  onProfileSaved,
}: AppTabRouterProps) {
  return (
    <Suspense fallback={<RouteLoadingFallback />}>
      {(() => {
        switch (currentTab) {
          case 'feed':
            return (
              <HomePage
                onSelectWork={onSelectWork}
                onOpenChapter={onOpenChapter}
                onNavigateToCatalog={() => onSwitchTab('works')}
                onPublishWork={() => onSwitchTab('become-writer')}
                onOpenPublicProfile={onOpenPublicProfile}
              />
            );

          case 'works':
            return (
              <CatalogPage
                onSelectWork={onSelectWork}
                onPublishWork={() => onSwitchTab('become-writer')}
              />
            );

          case 'about':
            return (
              <SobrePage
                onBackToFeed={() => onSwitchTab('feed')}
                onExplore={() => onSwitchTab('works')}
              />
            );

          case 'library':
            return (
              <BibliotecaPage
                onSelectWork={onSelectWork}
                onOpenChapter={onOpenChapter}
                onNavigateToCatalog={() => onSwitchTab('works')}
              />
            );

          case 'account':
            return (
              <AccountProfilePage
                onOpenPublicProfile={onOpenPublicProfile}
                onBecomeWriter={() => onSwitchTab('become-writer')}
                onSelectWork={onSelectWork}
                onOpenChapter={onOpenChapter}
                onExploreCatalog={() => onSwitchTab('works')}
                onSaved={onProfileSaved}
              />
            );

          case 'become-writer':
            return <BecomeWriterPage onBackToAccount={() => onSwitchTab('account')} />;

          case 'onboarding':
            return (
              <OnboardingPage
                onOpenPublicProfile={onOpenPublicProfile}
                onProfileSaved={onProfileSaved}
              />
            );

          case 'public-profile':
            return (
              <PublicProfilePage
                username={publicProfileUsername || authUsername || ''}
                onSelectWork={onSelectWork}
              />
            );

          case 'creator-dashboard':
            return <CreatorDashboardPage onOpenPublicProfile={onOpenPublicProfile} />;

          case 'creator-works':
            return (
              <CreatorWorksPage
                onNavigateToChapters={(workId) => {
                  if (workId && typeof window !== 'undefined') {
                    const url = new URL(window.location.href);
                    url.searchParams.set('obra', workId);
                    window.history.replaceState(window.history.state, '', url.pathname + url.search);
                  }
                  onSwitchTab('creator-chapters');
                }}
              />
            );

          case 'creator-chapters':
            return <CreatorChaptersPage />;

          case 'creator-missions':
            return <CreatorMissionsPage />;

          case 'creator-analytics':
            return <CreatorAnalyticsPage />;

          case 'creator-monetization':
            return <CreatorMonetizationPage />;

          case 'moderation':
            return <ModerationBackofficePage onBack={() => onSwitchTab('feed')} />;

          default:
            return null;
        }
      })()}
    </Suspense>
  );
}

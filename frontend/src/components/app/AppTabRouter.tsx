import { AppTab } from '../layout/Header';
import { Work, Chapter } from '../../types';
import { HomePage } from '../../pages/HomePage';
import { CatalogPage } from '../../pages/CatalogPage';
import { SobrePage } from '../../pages/SobrePage';
import { BibliotecaPage } from '../../pages/BibliotecaPage';
import { AccountProfilePage } from '../../pages/AccountProfilePage';
import { BecomeWriterPage } from '../../pages/BecomeWriterPage';
import { OnboardingPage } from '../../pages/OnboardingPage';
import { PublicProfilePage } from '../../pages/PublicProfilePage';
import { CreatorDashboardPage } from '../../pages/CreatorDashboardPage';
import { CreatorMissionsPage } from '../../pages/CreatorMissionsPage';
import { CreatorAnalyticsPage } from '../../pages/CreatorAnalyticsPage';
import { CreatorWorksPage } from '../../pages/CreatorWorksPage';
import { CreatorChaptersPage } from '../../pages/CreatorChaptersPage';
import { CreatorMonetizationPage } from '../../pages/CreatorMonetizationPage';
import { ModerationBackofficePage } from '../../pages/ModerationBackofficePage';

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
  switch (currentTab) {
    case 'feed':
      return (
        <HomePage
          onSelectWork={onSelectWork}
          onOpenChapter={onOpenChapter}
          onNavigateToCatalog={() => onSwitchTab('works')}
          onPublishWork={() => onSwitchTab('become-writer')}
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

    case 'reader-profile':
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
      return <PublicProfilePage username={publicProfileUsername || authUsername || ''} />;

    case 'creator-dashboard':
      return <CreatorDashboardPage onOpenPublicProfile={onOpenPublicProfile} />;

    case 'creator-missions':
      return <CreatorMissionsPage />;

    case 'creator-analytics':
      return <CreatorAnalyticsPage />;

    case 'creator-works':
      return <CreatorWorksPage />;

    case 'creator-chapters':
      return <CreatorChaptersPage />;

    case 'creator-monetization':
      return <CreatorMonetizationPage />;

    case 'moderation':
      return <ModerationBackofficePage onBack={() => onSwitchTab('feed')} />;

    default:
      return null;
  }
}

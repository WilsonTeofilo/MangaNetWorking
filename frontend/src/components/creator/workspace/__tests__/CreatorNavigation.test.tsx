/**
 * TASK-116 — Testes de navegação unificada do Workspace do Autor
 *
 * Verifica:
 * 1. AppTabRouter com rotas creator-* delegam para CreatorWorkspacePage / CreatorDashboardPage
 * 2. CREATOR_MENU possui 4 itens apontando para as abas via query param ?aba=
 * 3. Botão redundante "NOVA OBRA / CAPÍTULO" removido de CreatorOverviewTab
 * 4. CreatorWorkspacePage inicializa a aba correta com base em ?aba= na URL
 * 5. Telas dedicadas (analytics, capítulos, monetização) renderizadas quando requisitadas via ?aba=
 * 6. Regressão: reader-profile faz fallthrough seguro
 */
import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import type { AppTab } from '../../../layout/Header';

// ---------------------------------------------------------------------------
// Mocks globais necessários para renderizar os componentes que consomem
// contexts de autenticação, modais e dados do workspace.
// ---------------------------------------------------------------------------

vi.mock('../../../../context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      uid: 'u1',
      name: 'Teste Criador',
      email: 'test@test.com',
      username: 'testcriador',
      avatarUrl: null,
      isCreator: true,
      isModerator: false,
      isOwner: false,
      isVip: false,
      activeMemberships: {},
      favorites: [],
    },
    isAuthenticated: true,
    isMemberOf: () => false,
    logout: async () => {},
    favoriteNotice: null,
    dismissFavoriteNotice: () => {},
    libraryVersion: 0,
    refreshSession: async () => {},
    updateAvatarUrl: () => {},
    acceptCurrentPrivacyPolicy: async () => {},
    toggleFavorite: async () => null,
    subscribeToCreator: async () => ({ checkoutUrl: '', amountBrl: 0 }),
    createVipCheckout: async () => ({ checkoutUrl: '', priceBrl: 0 }),
    becomeWriter: async () => ({ message: '', creatorId: '', creatorHandle: '' }),
    saveProfile: async () => {},
  }),
}));

vi.mock('../../../../context/ModalContext', () => ({
  useModals: () => ({ openVip: () => {} }),
}));

vi.mock('../../../../api/workApi', () => ({
  workApi: {
    listMyWorks: async () => [],
  },
  CreatorWorkSummaryDto: {},
}));

vi.mock('../../../../api/creatorApi', () => ({
  creatorApi: {
    getWorkspace: async () => null,
  },
}));

vi.mock('../useCreatorWorkspaceData', () => ({
  useCreatorWorkspaceData: () => ({
    loading: false,
    workspace: {
      handle: '@testcriador',
      monetizationLevel: 1,
      missions: [],
      engagementBoostMul: 1,
      walletBalanceBrl: '0',
      totalDonationsBrl: '0',
      monthlyMembersCount: 0,
      membershipPriceBrl: '0',
      username: 'testcriador',
    },
    error: null,
    avatarPreview: null,
    profileName: 'Teste Criador',
    bio: '',
    instagramUrl: '',
    youtubeUrl: '',
    portfolioUrl: '',
    membershipPrice: '',
    declaredOriginal: false,
    isUploadingAvatar: false,
    isSaving: false,
    saveSuccess: false,
    saveError: null,
    avatarCropSource: null,
    setProfileName: () => {},
    setBio: () => {},
    setInstagramUrl: () => {},
    setYoutubeUrl: () => {},
    setPortfolioUrl: () => {},
    setMembershipPrice: () => {},
    setDeclaredOriginal: () => {},
    handleAvatarUpload: () => {},
    setAvatarCropSource: () => {},
    saveCroppedAvatar: async () => {},
    saveProfile: async () => {},
  }),
}));

// Mock das páginas filhas para evitar cadeia de dependências profunda
vi.mock('../../../../pages/CreatorWorksPage', () => ({
  CreatorWorksPage: () => <div data-testid="creator-works-page">Works Page</div>,
}));

vi.mock('../../../../pages/CreatorChaptersPage', () => ({
  CreatorChaptersPage: () => <div data-testid="creator-chapters-page">Chapters Page</div>,
}));

vi.mock('../../../../pages/CreatorAnalyticsPage', () => ({
  CreatorAnalyticsPage: () => <div data-testid="creator-analytics-page">Analytics Page</div>,
}));

vi.mock('../../../../pages/CreatorMonetizationPage', () => ({
  CreatorMonetizationPage: () => <div data-testid="creator-monetization-page">Monetization Page</div>,
}));

vi.mock('../../../../pages/CreatorDashboardPage', () => ({
  CreatorDashboardPage: () => <div data-testid="creator-dashboard-page">Dashboard Page</div>,
}));

vi.mock('../../../../pages/HomePage', () => ({ HomePage: () => null }));
vi.mock('../../../../pages/CatalogPage', () => ({ CatalogPage: () => null }));
vi.mock('../../../../pages/SobrePage', () => ({ SobrePage: () => null }));
vi.mock('../../../../pages/BibliotecaPage', () => ({ BibliotecaPage: () => null }));
vi.mock('../../../../pages/AccountProfilePage', () => ({ AccountProfilePage: () => null }));
vi.mock('../../../../pages/BecomeWriterPage', () => ({ BecomeWriterPage: () => null }));
vi.mock('../../../../pages/OnboardingPage', () => ({ OnboardingPage: () => null }));
vi.mock('../../../../pages/PublicProfilePage', () => ({ PublicProfilePage: () => null }));
vi.mock('../../../../pages/ModerationBackofficePage', () => ({ ModerationBackofficePage: () => null }));

vi.mock('../../../common/ImageCropper', () => ({ ImageCropper: () => null }));
vi.mock('../../../creator/CreatorMissionsPanel', () => ({ CreatorMissionsPanel: () => <div data-testid="creator-missions-panel">Missions Panel</div> }));
vi.mock('../OriginalWorkDeclarationModal', () => ({ OriginalWorkDeclarationModal: () => null }));
vi.mock('../CreatorProfileSettingsTab', () => ({ CreatorProfileSettingsTab: () => <div data-testid="creator-settings-panel">Settings Panel</div> }));
vi.mock('../../../layout/NotificationBell', () => ({ NotificationBell: () => null }));

// ---------------------------------------------------------------------------
// Imports dos módulos sob teste (após os mocks)
// ---------------------------------------------------------------------------

let AppTabRouter: typeof import('../../../../components/app/AppTabRouter').AppTabRouter;
let CREATOR_MENU: typeof import('../../../layout/header/HeaderUserMenu').CREATOR_MENU;
let CreatorOverviewTab: typeof import('../CreatorOverviewTab').CreatorOverviewTab;
let CreatorWorkspacePage: typeof import('../../../../pages/CreatorWorkspacePage').CreatorWorkspacePage;

beforeAll(async () => {
  const routerMod = await import('../../../../components/app/AppTabRouter');
  AppTabRouter = routerMod.AppTabRouter;

  const headerMod = await import('../../../layout/header/HeaderUserMenu');
  CREATOR_MENU = headerMod.CREATOR_MENU;

  const overviewMod = await import('../CreatorOverviewTab');
  CreatorOverviewTab = overviewMod.CreatorOverviewTab;

  const workspaceMod = await import('../../../../pages/CreatorWorkspacePage');
  CreatorWorkspacePage = workspaceMod.CreatorWorkspacePage;
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const noop = () => {};
const asyncNoop = async () => {};

function renderRouter(currentTab: AppTab) {
  return renderToString(
    <AppTabRouter
      currentTab={currentTab}
      publicProfileUsername=""
      authUsername="testcriador"
      onSelectWork={noop}
      onOpenChapter={noop}
      onSwitchTab={noop}
      onOpenPublicProfile={noop}
      onProfileSaved={asyncNoop}
    />,
  );
}

// ---------------------------------------------------------------------------
// Testes
// ---------------------------------------------------------------------------

describe('TASK-116 — Hub Unificado do Workspace do Autor & Sincronização via URL', () => {
  describe('1. AppTabRouter — rotas creator-* delegam para CreatorWorkspacePage ou páginas filhas', () => {
    it('creator-dashboard renderiza sem exceção', () => {
      expect(() => renderRouter('creator-dashboard')).not.toThrow();
    });

    it('creator-works renderiza CreatorWorkspacePage com seção works', () => {
      expect(() => renderRouter('creator-works')).not.toThrow();
    });

    it('creator-missions renderiza CreatorWorkspacePage com seção missions', () => {
      expect(() => renderRouter('creator-missions')).not.toThrow();
    });

    it('creator-chapters renderiza CreatorWorkspacePage com seção chapters', () => {
      expect(() => renderRouter('creator-chapters')).not.toThrow();
    });

    it('creator-analytics renderiza CreatorWorkspacePage com seção analytics', () => {
      expect(() => renderRouter('creator-analytics')).not.toThrow();
    });

    it('creator-monetization renderiza CreatorWorkspacePage com seção monetization', () => {
      expect(() => renderRouter('creator-monetization')).not.toThrow();
    });
  });

  describe('2. CREATOR_MENU possui os itens essenciais do criador', () => {
    it('CREATOR_MENU.length === 6', () => {
      expect(CREATOR_MENU).toHaveLength(6);
    });

    it('contém Visão Geral apontando para creator-dashboard', () => {
      expect(CREATOR_MENU.find((i) => i.tab === 'creator-dashboard')).toMatchObject({
        label: 'Visão Geral (Workspace)',
        tab: 'creator-dashboard',
      });
    });

    it('contém Minhas Obras apontando para creator-works', () => {
      expect(CREATOR_MENU.find((i) => i.tab === 'creator-works')).toMatchObject({
        label: 'Minhas Obras',
        tab: 'creator-works',
      });
    });

    it('contém Capítulos & Lançamento apontando para creator-chapters', () => {
      expect(CREATOR_MENU.find((i) => i.tab === 'creator-chapters')).toMatchObject({
        label: 'Capítulos & Lançamento',
        tab: 'creator-chapters',
      });
    });

    it('contém Dashboard & Analytics apontando para creator-analytics', () => {
      expect(CREATOR_MENU.find((i) => i.tab === 'creator-analytics')).toMatchObject({
        label: 'Dashboard & Analytics',
        tab: 'creator-analytics',
      });
    });

    it('contém Missões & XP apontando para creator-missions', () => {
      expect(CREATOR_MENU.find((i) => i.tab === 'creator-missions')).toMatchObject({
        label: 'Missões & XP',
        tab: 'creator-missions',
      });
    });

    it('contém Monetização & Ganhos apontando para creator-monetization', () => {
      expect(CREATOR_MENU.find((i) => i.tab === 'creator-monetization')).toMatchObject({
        label: 'Monetização & Ganhos',
        tab: 'creator-monetization',
      });
    });
  });

  describe('3. CreatorOverviewTab — remoção do botão redundante NOVA OBRA / CAPÍTULO', () => {
    it('não renderiza o botão redundante NOVA OBRA / CAPÍTULO', () => {
      const html = renderToString(
        <CreatorOverviewTab
          walletBalanceBrl={0}
          totalDonationsBrl={0}
          monthlyMembersCount={0}
          onNavigateTab={noop as never}
          onOpenDeclarationModal={noop}
        />,
      );

      // Botões redundantes de atalho removidos (mantidos apenas nas abas/menu)
      expect(html).not.toContain('NOVA OBRA / CAPÍTULO');
      expect(html).not.toContain('VER MISSÕES DA SEASON');

      // Ações essenciais continuam presentes
      expect(html).toContain('TERMOS DE AUTORIA (ART. 184 CP)');
    });
  });

  describe('4. CreatorWorkspacePage — sincronização bidirecional via URL (?aba=...)', () => {
    afterEach(() => {
      window.history.replaceState({}, '', '/');
    });

    function setLocationSearch(search: string) {
      window.history.replaceState({}, '', `/${search}`);
    }

    it('?aba=obras renderiza tela com aba de obras', () => {
      setLocationSearch('?aba=obras');
      const html = renderToString(<CreatorWorkspacePage />);
      expect(html).toContain('data-testid="creator-works-page"');
    });

    it('?aba=missoes renderiza tela com aba de missões', () => {
      setLocationSearch('?aba=missoes');
      const html = renderToString(<CreatorWorkspacePage />);
      expect(html).toContain('data-testid="creator-missions-panel"');
    });

    it('?aba=configuracoes renderiza tela com aba de configurações', () => {
      setLocationSearch('?aba=configuracoes');
      const html = renderToString(<CreatorWorkspacePage />);
      expect(html).toContain('data-testid="creator-settings-panel"');
    });

    it('?aba=analytics renderiza tela dedicada CreatorAnalyticsPage', () => {
      setLocationSearch('?aba=analytics');
      const html = renderToString(<CreatorWorkspacePage />);
      expect(html).toContain('data-testid="creator-analytics-page"');
    });

    it('?aba=capitulos renderiza tela dedicada CreatorChaptersPage', () => {
      setLocationSearch('?aba=capitulos');
      const html = renderToString(<CreatorWorkspacePage />);
      expect(html).toContain('data-testid="creator-chapters-page"');
    });

    it('?aba=monetizacao renderiza tela dedicada CreatorMonetizationPage', () => {
      setLocationSearch('?aba=monetizacao');
      const html = renderToString(<CreatorWorkspacePage />);
      expect(html).toContain('data-testid="creator-monetization-page"');
    });

    it('sem parâmetro ?aba= renderiza overview por padrão', () => {
      setLocationSearch('');
      const html = renderToString(<CreatorWorkspacePage />);
      expect(html).toContain('PAINEL DO AUTOR');
      expect(html).toContain('AÇÕES RÁPIDAS DA BANCADA');
    });
  });

  describe('5. Regressão — rota inválida ou fallthrough', () => {
    it('reader-profile faz fallthrough seguro para null no AppTabRouter', () => {
      expect(() => renderRouter('reader-profile' as unknown as AppTab)).not.toThrow();
    });
  });
});

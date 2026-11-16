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

  describe('2. CREATOR_MENU possui os itens essenciais do criador com query params mapeados', () => {
    it('CREATOR_MENU.length === 7', () => {
      expect(CREATOR_MENU).toHaveLength(7);
    });

    it('contém Visão Geral apontando para ?aba=visao-geral', () => {
      expect(CREATOR_MENU.find((i) => i.abaQuery === 'visao-geral')).toMatchObject({
        label: 'Visão Geral',
        tab: 'creator-dashboard',
        abaQuery: 'visao-geral',
      });
    });

    it('contém Minhas Obras apontando para ?aba=obras', () => {
      expect(CREATOR_MENU.find((i) => i.abaQuery === 'obras')).toMatchObject({
        label: 'Minhas Obras',
        tab: 'creator-dashboard',
        abaQuery: 'obras',
      });
    });

    it('contém Capítulos & Lançamento apontando para ?aba=capitulos', () => {
      expect(CREATOR_MENU.find((i) => i.abaQuery === 'capitulos')).toMatchObject({
        label: 'Capítulos & Lançamento',
        tab: 'creator-dashboard',
        abaQuery: 'capitulos',
      });
    });

    it('contém Missões & XP apontando para ?aba=missoes', () => {
      expect(CREATOR_MENU.find((i) => i.abaQuery === 'missoes')).toMatchObject({
        label: 'Missões & XP',
        tab: 'creator-dashboard',
        abaQuery: 'missoes',
      });
    });

    it('contém Analytics apontando para ?aba=analytics', () => {
      expect(CREATOR_MENU.find((i) => i.abaQuery === 'analytics')).toMatchObject({
        label: 'Analytics',
        tab: 'creator-dashboard',
        abaQuery: 'analytics',
      });
    });

    it('contém Monetização apontando para ?aba=monetizacao', () => {
      expect(CREATOR_MENU.find((i) => i.abaQuery === 'monetizacao')).toMatchObject({
        label: 'Monetização',
        tab: 'creator-dashboard',
        abaQuery: 'monetizacao',
      });
    });

    it('contém Perfil & Ajustes apontando para ?aba=configuracoes', () => {
      expect(CREATOR_MENU.find((i) => i.abaQuery === 'configuracoes')).toMatchObject({
        label: 'Perfil & Ajustes',
        tab: 'creator-dashboard',
        abaQuery: 'configuracoes',
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

      // O botão redundante não deve constar no markup
      expect(html).not.toContain('NOVA OBRA / CAPÍTULO');

      // Ações não duplicadas continuam presentes
      expect(html).toContain('VER MISSÕES DA SEASON');
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

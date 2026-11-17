import { useEffect, useState } from 'react';
import { ImageCropper } from '../components/common/ImageCropper';
import { CreatorMissionsPanel } from '../components/creator/CreatorMissionsPanel';
import { CreatorWorksPage } from './CreatorWorksPage';
import { CreatorChaptersPage } from './CreatorChaptersPage';
import { CreatorAnalyticsPage } from './CreatorAnalyticsPage';
import { CreatorMonetizationPage } from './CreatorMonetizationPage';
import { useCreatorWorkspaceData } from '../components/creator/workspace/useCreatorWorkspaceData';
import { CreatorKpiHeader, WorkspaceTab } from '../components/creator/workspace/CreatorKpiHeader';
import { CreatorOverviewTab } from '../components/creator/workspace/CreatorOverviewTab';
import { CreatorProfileSettingsTab } from '../components/creator/workspace/CreatorProfileSettingsTab';
import { OriginalWorkDeclarationModal } from '../components/creator/workspace/OriginalWorkDeclarationModal';

export type CreatorWorkspaceSection =
  | 'dashboard'
  | 'missions'
  | 'works'
  | 'settings'
  | 'overview'
  | 'chapters'
  | 'analytics'
  | 'monetization';

export interface CreatorWorkspacePageProps {
  section?: CreatorWorkspaceSection;
  onOpenPublicProfile?: (username: string) => void;
}

const TAB_TO_QUERY: Record<WorkspaceTab, string> = {
  overview: 'visao-geral',
  works: 'obras',
  chapters: 'capitulos',
  missions: 'missoes',
  settings: 'configuracoes',
};

function getAbaParam(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const raw = params.get('aba');
  return raw ? raw.toLowerCase().trim() : null;
}

function resolveWorkspaceState(section?: CreatorWorkspaceSection): {
  dedicated: 'analytics' | 'monetization' | null;
  tab: WorkspaceTab;
} {
  const aba = getAbaParam();

  // 1. Seções analíticas/monetização dedicadas por query param ?aba= ou pela prop section
  if (aba === 'analytics' || (!aba && section === 'analytics')) {
    return { dedicated: 'analytics', tab: 'overview' };
  }
  if (aba === 'monetizacao' || aba === 'monetization' || (!aba && section === 'monetization')) {
    return { dedicated: 'monetization', tab: 'overview' };
  }

  // 2. Abas operacionais do workspace via ?aba=
  if (aba === 'capitulos' || aba === 'chapters' || (!aba && section === 'chapters')) {
    return { dedicated: null, tab: 'chapters' };
  }
  if (aba === 'obras' || aba === 'works') {
    return { dedicated: null, tab: 'works' };
  }
  if (aba === 'missoes' || aba === 'missions') {
    return { dedicated: null, tab: 'missions' };
  }
  if (aba === 'configuracoes' || aba === 'settings') {
    return { dedicated: null, tab: 'settings' };
  }
  if (aba === 'visao-geral' || aba === 'overview') {
    return { dedicated: null, tab: 'overview' };
  }

  // 3. Respeitar a prop section se não houver ?aba=
  if (section === 'works') return { dedicated: null, tab: 'works' };
  if (section === 'chapters') return { dedicated: null, tab: 'chapters' };
  if (section === 'missions') return { dedicated: null, tab: 'missions' };
  if (section === 'settings') return { dedicated: null, tab: 'settings' };

  return { dedicated: null, tab: 'overview' };
}

/**
 * Orquestrador central e limpo do Workspace do Autor.
 * Consome useCreatorWorkspaceData, sincroniza abas via URL (?aba=...) e roteia os painéis.
 */
export function CreatorWorkspacePage({
  section = 'dashboard',
  onOpenPublicProfile,
}: CreatorWorkspacePageProps = {}) {
  const initial = resolveWorkspaceState(section);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>(initial.tab);
  const [declarationModalOpen, setDeclarationModalOpen] = useState(false);

  const data = useCreatorWorkspaceData();

  // Sincroniza a aba ativa quando a navegação do histórico (popstate) ocorrer
  useEffect(() => {
    const handlePopState = () => {
      const current = resolveWorkspaceState(section);
      if (!current.dedicated) {
        setActiveTab(current.tab);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [section]);

  // Na montagem, sincroniza silenciosamente a URL com a aba inicial (sem criar
  // entrada de histórico) para que o estado inicial seja navegável via popstate.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const initial = resolveWorkspaceState(section);
    if (!initial.dedicated) {
      const querySlug = TAB_TO_QUERY[initial.tab] || 'visao-geral';
      const url = new URL(window.location.href);
      if (url.searchParams.get('aba') !== querySlug) {
        url.searchParams.set('aba', querySlug);
        window.history.replaceState({ workspaceTab: initial.tab }, '', url.pathname + url.search);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Troca de aba acionada pelo usuário (clique em aba ou atalho interno).
   * Usa pushState para registrar a transição no histórico do browser,
   * permitindo que o botão Voltar retorne à aba anterior dentro do workspace
   * em vez de saltar diretamente para o feed.
   */
  const handleTabChange = (nextTab: WorkspaceTab) => {
    setActiveTab(nextTab);
    if (typeof window !== 'undefined') {
      const querySlug = TAB_TO_QUERY[nextTab] || 'visao-geral';
      const url = new URL(window.location.href);
      url.searchParams.set('aba', querySlug);
      window.history.pushState({ workspaceTab: nextTab }, '', url.pathname + url.search);
    }
  };

  /**
   * Sincronização silenciosa da URL sem criar entrada no histórico.
   * Usado somente para parâmetros extras (ex: ?obra=) que não são tabs.
   */
  const syncUrlParam = (key: string, value: string) => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set(key, value);
      window.history.replaceState(window.history.state, '', url.pathname + url.search);
    }
  };

  if (data.loading) {
    return (
      <div role="status" className="mn-container py-16 text-center space-y-4 select-none">
        <h1 className="font-display text-2xl sm:text-3xl text-[var(--mn-paper)] uppercase">
          CARREGANDO BANCADA DO AUTOR…
        </h1>
        <p className="font-body text-xs text-[var(--mn-mute)]">Sincronizando métricas com o servidor.</p>
      </div>
    );
  }

  if (!data.workspace) {
    return (
      <div role="status" className="mn-container py-16 text-center space-y-4 select-none">
        <h1 className="font-display text-3xl text-[var(--mn-paper)] uppercase">BANCADA DO AUTOR</h1>
        <p className="font-body text-xs sm:text-sm text-[var(--mn-mute)]">
          {data.error ?? 'Entre com uma conta de autor independente para acessar esta bancada.'}
        </p>
      </div>
    );
  }

  const { workspace } = data;
  const currentResolved = resolveWorkspaceState(section);

  // Seções dedicadas sem a UI de WorkspaceTab interna
  if (currentResolved.dedicated === 'analytics') return <CreatorAnalyticsPage />;
  if (currentResolved.dedicated === 'monetization') return <CreatorMonetizationPage />;

  return (
    <div className="mn-container py-8 space-y-8 select-none pb-24">
      <CreatorKpiHeader
        avatarUrl={data.avatarPreview}
        profileName={data.profileName}
        displayHandle={workspace.handle}
        monetizationLevel={workspace.monetizationLevel}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onPrimaryCtaClick={() => handleTabChange('works')}
        onOpenPublicProfile={onOpenPublicProfile}
        isUploadingAvatar={data.isUploadingAvatar}
        onAvatarFileChange={data.handleAvatarUpload}
        onAdjustPhoto={data.avatarPreview ? () => data.setAvatarCropSource({ url: data.avatarPreview }) : undefined}
      />

      {activeTab === 'overview' && (
        <CreatorOverviewTab
          walletBalanceBrl={Number(workspace.walletBalanceBrl || 0)}
          totalDonationsBrl={Number(workspace.totalDonationsBrl || 0)}
          monthlyMembersCount={workspace.monthlyMembersCount || 0}
          onNavigateTab={handleTabChange}
          onManageWorkChapters={(workId) => {
            handleTabChange('chapters');
            if (workId) syncUrlParam('obra', workId);
          }}
          onOpenDeclarationModal={() => setDeclarationModalOpen(true)}
        />
      )}

      {activeTab === 'works' && (
        <CreatorWorksPage
          onNavigateToChapters={(workId) => {
            handleTabChange('chapters');
            if (workId) syncUrlParam('obra', workId);
          }}
        />
      )}

      {activeTab === 'chapters' && <CreatorChaptersPage />}

      {activeTab === 'missions' && (
        <CreatorMissionsPanel
          missions={workspace.missions || []}
          boostMultiplier={workspace.engagementBoostMul || 1}
          walletBalanceBrl={Number(workspace.walletBalanceBrl || 0)}
          totalDonationsBrl={Number(workspace.totalDonationsBrl || 0)}
          monthlyMembersCount={workspace.monthlyMembersCount || 0}
          membershipPriceBrl={Number(workspace.membershipPriceBrl || 0)}
        />
      )}

      {activeTab === 'settings' && (
        <CreatorProfileSettingsTab
          profileName={data.profileName}
          setProfileName={data.setProfileName}
          bio={data.bio}
          setBio={data.setBio}
          instagramUrl={data.instagramUrl}
          setInstagramUrl={data.setInstagramUrl}
          youtubeUrl={data.youtubeUrl}
          setYoutubeUrl={data.setYoutubeUrl}
          portfolioUrl={data.portfolioUrl}
          setPortfolioUrl={data.setPortfolioUrl}
          membershipPrice={data.membershipPrice}
          setMembershipPrice={data.setMembershipPrice}
          declaredOriginal={data.declaredOriginal}
          setDeclaredOriginal={data.setDeclaredOriginal}
          isSaving={data.isSaving}
          saveSuccess={data.saveSuccess}
          saveError={data.saveError}
          displayHandle={workspace.handle}
          username={workspace.username}
          onSave={data.saveProfile}
          onOpenPublicProfile={onOpenPublicProfile}
          onOpenDeclarationModal={() => setDeclarationModalOpen(true)}
        />
      )}

      {data.avatarCropSource && (
        <ImageCropper
          file={data.avatarCropSource.file ?? null}
          sourceUrl={data.avatarCropSource.url ?? null}
          outputWidth={512}
          outputHeight={512}
          busy={data.isUploadingAvatar}
          error={data.saveError}
          onCancel={() => data.setAvatarCropSource(null)}
          onConfirm={data.saveCroppedAvatar}
        />
      )}

      <OriginalWorkDeclarationModal
        isOpen={declarationModalOpen}
        onClose={() => setDeclarationModalOpen(false)}
        onAccept={() => data.setDeclaredOriginal(true)}
        accepted={data.declaredOriginal}
      />
    </div>
  );
}

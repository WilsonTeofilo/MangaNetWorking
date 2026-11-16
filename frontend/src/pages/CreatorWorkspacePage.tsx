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
  dedicated: 'chapters' | 'analytics' | 'monetization' | null;
  tab: WorkspaceTab;
} {
  const aba = getAbaParam();

  // 1. Seções dedicadas por query param ?aba= ou pela prop section
  if (aba === 'analytics' || (!aba && section === 'analytics')) {
    return { dedicated: 'analytics', tab: 'overview' };
  }
  if (aba === 'capitulos' || aba === 'chapters' || (!aba && section === 'chapters')) {
    return { dedicated: 'chapters', tab: 'works' };
  }
  if (aba === 'monetizacao' || aba === 'monetization' || (!aba && section === 'monetization')) {
    return { dedicated: 'monetization', tab: 'overview' };
  }

  // 2. Abas operacionais do workspace via ?aba=
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

  const handleTabChange = (nextTab: WorkspaceTab) => {
    setActiveTab(nextTab);
    if (typeof window !== 'undefined') {
      const querySlug = TAB_TO_QUERY[nextTab] || 'visao-geral';
      const url = new URL(window.location.href);
      url.searchParams.set('aba', querySlug);
      window.history.replaceState(window.history.state, '', url.pathname + url.search);
    }
  };

  if (data.loading) {
    return (
      <div role="status" className="mn-container py-16 text-center space-y-4 select-none">
        <h1 className="font-display text-2xl sm:text-3xl text-[var(--mn-paper)] uppercase">
          CARREGANDO PAINEL DO AUTOR…
        </h1>
        <p className="font-body text-xs text-[var(--mn-mute)]">Sincronizando métricas com o servidor.</p>
      </div>
    );
  }

  if (!data.workspace) {
    return (
      <div role="status" className="mn-container py-16 text-center space-y-4 select-none">
        <h1 className="font-display text-3xl text-[var(--mn-paper)] uppercase">PAINEL DO CRIADOR</h1>
        <p className="font-body text-xs sm:text-sm text-[var(--mn-mute)]">
          {data.error ?? 'Entre com uma conta de criador para acessar este painel.'}
        </p>
      </div>
    );
  }

  const { workspace } = data;
  const currentResolved = resolveWorkspaceState(section);

  // Seções dedicadas sem a UI de WorkspaceTab interna
  if (currentResolved.dedicated === 'chapters') return <CreatorChaptersPage />;
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
          onOpenDeclarationModal={() => setDeclarationModalOpen(true)}
        />
      )}

      {activeTab === 'works' && <CreatorWorksPage />}

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

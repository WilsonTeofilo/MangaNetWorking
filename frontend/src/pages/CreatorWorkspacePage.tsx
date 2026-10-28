import { useState } from 'react';
import { ImageCropper } from '../components/common/ImageCropper';
import { CreatorMissionsPanel } from '../components/creator/CreatorMissionsPanel';
import { CreatorWorksPage } from './CreatorWorksPage';
import { useCreatorWorkspaceData } from '../components/creator/workspace/useCreatorWorkspaceData';
import { CreatorKpiHeader, WorkspaceTab } from '../components/creator/workspace/CreatorKpiHeader';
import { CreatorOverviewTab } from '../components/creator/workspace/CreatorOverviewTab';
import { CreatorProfileSettingsTab } from '../components/creator/workspace/CreatorProfileSettingsTab';
import { OriginalWorkDeclarationModal } from '../components/creator/workspace/OriginalWorkDeclarationModal';

export type CreatorWorkspaceSection = 'dashboard' | 'missions' | 'works' | 'settings' | 'overview';

export interface CreatorWorkspacePageProps {
  section?: CreatorWorkspaceSection;
  onOpenPublicProfile?: (username: string) => void;
}

/**
 * Orquestrador central e limpo do Workspace do Autor.
 * Consome useCreatorWorkspaceData e roteia as abas operacionais do criador.
 */
export function CreatorWorkspacePage({
  section = 'dashboard',
  onOpenPublicProfile,
}: CreatorWorkspacePageProps = {}) {
  const initialTab: WorkspaceTab =
    section === 'missions' ? 'missions' : section === 'works' ? 'works' : 'overview';

  const [activeTab, setActiveTab] = useState<WorkspaceTab>(initialTab);
  const [declarationModalOpen, setDeclarationModalOpen] = useState(false);

  const data = useCreatorWorkspaceData();

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

  return (
    <div className="mn-container py-8 space-y-8 select-none pb-24">
      <CreatorKpiHeader
        avatarUrl={data.avatarPreview}
        profileName={data.profileName}
        displayHandle={workspace.handle}
        monetizationLevel={workspace.monetizationLevel}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onPrimaryCtaClick={() => setActiveTab('works')}
        isUploadingAvatar={data.isUploadingAvatar}
        onAvatarFileChange={data.handleAvatarUpload}
        onAdjustPhoto={data.avatarPreview ? () => data.setAvatarCropSource({ url: data.avatarPreview }) : undefined}
      />

      {activeTab === 'overview' && (
        <CreatorOverviewTab
          walletBalanceBrl={Number(workspace.walletBalanceBrl || 0)}
          totalDonationsBrl={Number(workspace.totalDonationsBrl || 0)}
          monthlyMembersCount={workspace.monthlyMembersCount || 0}
          onNavigateTab={setActiveTab}
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

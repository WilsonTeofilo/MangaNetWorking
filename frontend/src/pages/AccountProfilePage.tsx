import { useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { storageApi } from '../api/storageApi';
import { Work, Chapter } from '../types';
import { ImageCropper } from '../components/common/ImageCropper';
import { AccountProfileHeader, AccountTab } from '../components/account/AccountProfileHeader';
import { AccountCollectionTab } from '../components/account/AccountCollectionTab';
import { AccountSecurityTab } from '../components/account/AccountSecurityTab';

export interface AccountProfilePageProps {
  onOpenPublicProfile: (username: string) => void;
  onBecomeWriter?: () => void;
  onSaved?: () => void;
  onSelectWork?: (work: Work) => void;
  onOpenChapter?: (work: Work, chapter: Chapter, page?: number) => void;
  onExploreCatalog?: () => void;
}

/**
 * Área unificada do Leitor ("Minha Conta").
 * Orquestrador limpo decomposto em:
 * - AccountProfileHeader: identidade, avatar, tags e abas
 * - AccountCollectionTab: obras salvas, progresso e status VIP
 * - AccountSecurityTab: username, visibilidade e governança LGPD
 */
export function AccountProfilePage({
  onOpenPublicProfile,
  onBecomeWriter,
  onSaved,
  onSelectWork,
  onOpenChapter,
  onExploreCatalog,
}: AccountProfilePageProps) {
  const { user, saveProfile } = useAuth();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [activeTab, setActiveTab] = useState<AccountTab>('collection');
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl);
  const [uploading, setUploading] = useState(false);
  const [cropError, setCropError] = useState<string | null>(null);
  const [cropSource, setCropSource] = useState<{ file?: File; url?: string } | null>(null);

  /** Recebe o recorte final quadrado e grava como avatar no storage e perfil */
  const uploadCroppedAvatar = async (blob: Blob) => {
    setUploading(true);
    setCropError(null);
    try {
      const file = new File([blob], 'avatar.png', { type: 'image/png' });
      const stored = await storageApi.uploadAvatar(file);
      setAvatarUrl(stored.url);
      await saveProfile({ avatarUrl: stored.url });
      setCropSource(null);
      onSaved?.();
    } catch (err: unknown) {
      setCropError(err instanceof Error ? err.message : 'Não foi possível enviar a foto. Tente outra imagem.');
    } finally {
      setUploading(false);
    }
  };

  const handleAvatarPicked = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setCropError('Formato não suportado. Envie JPG, PNG ou WebP.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setCropError('A foto passa de 10 MB. Envie uma imagem menor.');
      return;
    }
    setCropError(null);
    setCropSource({ file });
  };

  return (
    <div className="mn-container py-8 space-y-8 select-none pb-20">
      {/* Header Unificado com Avatar e Abas */}
      <AccountProfileHeader
        user={user}
        avatarUrl={avatarUrl}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onPickAvatar={() => fileRef.current?.click()}
        onRecropAvatar={avatarUrl ? () => setCropSource({ url: avatarUrl }) : undefined}
        uploading={uploading}
      />

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleAvatarPicked}
      />

      {/* Roteamento Interno de Abas */}
      {activeTab === 'collection' ? (
        <AccountCollectionTab
          onSelectWork={onSelectWork}
          onOpenChapter={onOpenChapter}
          onExploreCatalog={onExploreCatalog}
        />
      ) : (
        <AccountSecurityTab
          onOpenPublicProfile={onOpenPublicProfile}
          onBecomeWriter={onBecomeWriter}
          onSaved={onSaved}
        />
      )}

      {/* Modal de Recorte de Avatar */}
      {cropSource && (
        <ImageCropper
          file={cropSource.file ?? null}
          sourceUrl={cropSource.url ?? null}
          outputWidth={512}
          outputHeight={512}
          busy={uploading}
          error={cropError}
          onCancel={() => setCropSource(null)}
          onConfirm={uploadCroppedAvatar}
        />
      )}
    </div>
  );
}

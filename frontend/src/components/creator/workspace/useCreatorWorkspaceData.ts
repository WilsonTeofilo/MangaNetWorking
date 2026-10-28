import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { storageApi } from '../../../api/storageApi';
import { userApi } from '../../../api/authApi';
import { creatorApi, CreatorWorkspaceDto } from '../../../api/creatorApi';

export function useCreatorWorkspaceData() {
  const { refreshSession } = useAuth();

  const [workspace, setWorkspace] = useState<CreatorWorkspaceDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [profileName, setProfileName] = useState('');
  const [bio, setBio] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [membershipPrice, setMembershipPrice] = useState<number | null>(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [declaredOriginal, setDeclaredOriginal] = useState(false);

  // Avatar crop and upload states
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarCropSource, setAvatarCropSource] = useState<{ file?: File; url?: string } | null>(null);

  // Profile save states
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const fetchWorkspace = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await creatorApi.getWorkspace();
      if (!data) return;
      setWorkspace(data);
      if (data.avatarUrl) setAvatarPreview(data.avatarUrl);
      if (data.name) setProfileName(data.name);
      if (data.membershipPriceBrl != null) setMembershipPrice(Number(data.membershipPriceBrl));
      if (data.bio != null) setBio(data.bio);
      if (data.instagramUrl) setInstagramUrl(data.instagramUrl);
      if (data.youtubeUrl) setYoutubeUrl(data.youtubeUrl);
      if (data.portfolioUrl) setPortfolioUrl(data.portfolioUrl);
    } catch {
      setError('Entre com uma conta de criador para consultar dados reais do painel.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchWorkspace();
  }, [fetchWorkspace]);

  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || isUploadingAvatar) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setSaveError('Formato não suportado. Envie JPG, PNG ou WebP.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setSaveError('A foto passa de 10 MB. Envie uma imagem menor.');
      return;
    }
    setSaveError(null);
    setAvatarCropSource({ file });
  };

  const saveCroppedAvatar = async (blob: Blob) => {
    setIsUploadingAvatar(true);
    setSaveError(null);
    try {
      const file = new File([blob], 'avatar.png', { type: 'image/png' });
      const stored = await storageApi.uploadAvatar(file);
      setAvatarPreview(stored.url);
      await creatorApi.updateProfile({ avatarUrl: stored.url });
      await userApi.updateProfile({ avatarUrl: stored.url });
      await refreshSession();
      setAvatarCropSource(null);
      setSaveError(null);
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Não foi possível salvar o avatar.');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const saveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setSaveError(null);
    try {
      await creatorApi.updateProfile({
        name: profileName,
        bio,
        instagramUrl,
        youtubeUrl,
        portfolioUrl,
      });
      if (membershipPrice != null && Number.isFinite(membershipPrice)) {
        await creatorApi.updateMembershipPrice(membershipPrice);
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err: unknown) {
      setSaveError(
        err instanceof Error
          ? err.message
          : 'Não foi possível salvar no servidor. Verifique a sessão e tente novamente.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  return {
    workspace,
    loading,
    error,
    profileName,
    setProfileName,
    bio,
    setBio,
    instagramUrl,
    setInstagramUrl,
    youtubeUrl,
    setYoutubeUrl,
    portfolioUrl,
    setPortfolioUrl,
    membershipPrice,
    setMembershipPrice,
    avatarPreview,
    declaredOriginal,
    setDeclaredOriginal,
    isUploadingAvatar,
    avatarCropSource,
    setAvatarCropSource,
    isSaving,
    saveSuccess,
    saveError,
    handleAvatarUpload,
    saveCroppedAvatar,
    saveProfile,
    reloadWorkspace: fetchWorkspace,
  };
}

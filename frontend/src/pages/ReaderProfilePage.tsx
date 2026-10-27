import { useEffect, useState } from 'react';
import { Globe, Lock, Heart, Shield, Download, Trash2, Crown, Sparkles, CheckCircle2, Upload } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useModals } from '../context/ModalContext';
import { userApi } from '../api/authApi';
import { Work } from '../types';
import { WorkCard } from '../components/ui/WorkCard';
import { Button } from '../components/ui/Button';
import { storageApi } from '../api/storageApi';

interface ReaderProfilePageProps {
  onSelectWork: (work: Work) => void;
}

export function ReaderProfilePage({ onSelectWork }: ReaderProfilePageProps) {
  const { user, isAuthenticated, updateAvatarUrl } = useAuth();
  const { openVip } = useModals();
  const [isPublic, setIsPublic] = useState<boolean | null>(null);
  const [isSavingVisibility, setIsSavingVisibility] = useState(false);
  const [visibilityError, setVisibilityError] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !isAuthenticated || isUploadingAvatar) return;
    setIsUploadingAvatar(true);
    setAvatarError(null);
    try {
      const stored = await storageApi.uploadAvatar(file);
      await userApi.updateProfile({ avatarUrl: stored.url });
      updateAvatarUrl(stored.url);
    } catch {
      setAvatarError('Não foi possível atualizar o avatar. Use JPEG ou PNG e tente novamente.');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  useEffect(() => {
    let active = true;
    if (!isAuthenticated || !user.uid) {
      setIsPublic(null);
      return () => { active = false; };
    }

    userApi.getProfile(user.uid)
      .then((profile) => {
        if (active) {
          setIsPublic(profile.isProfilePublic);
          if (profile.avatarUrl) updateAvatarUrl(profile.avatarUrl);
        }
      })
      .catch(() => {
        if (active) setVisibilityError('Não foi possível carregar a visibilidade salva do perfil.');
      });

    return () => { active = false; };
  }, [isAuthenticated, user.uid]);

  const toggleProfileVisibility = async () => {
    if (isPublic === null || isSavingVisibility) return;
    const nextValue = !isPublic;
    setIsSavingVisibility(true);
    setVisibilityError(null);
    try {
      await userApi.updateProfile({ isProfilePublic: nextValue });
      setIsPublic(nextValue);
    } catch {
      setVisibilityError('Não foi possível salvar a visibilidade. Tente novamente.');
    } finally {
      setIsSavingVisibility(false);
    }
  };

  // Obras favoritadas pelo leitor
  const [libraryWorks, setLibraryWorks] = useState<Work[]>([]);

  useEffect(() => {
    let active = true;
    userApi.getLibrary()
      .then((items) => {
        if (!active || !Array.isArray(items)) return;
        setLibraryWorks(items.map((item) => ({
          id: item.id,
          title: item.title,
          slug: item.slug,
          coverUrl: item.coverUrl ?? '',
          bannerUrl: item.coverUrl ?? '',
          synopsis: '',
          authorId: '',
          authorName: item.authorName,
          authorHandle: item.authorHandle,
          authorAvatarUrl: '',
          genres: [],
          status: (item.status as 'ongoing' | 'completed' | 'hiatus') ?? 'ongoing',
          format: (item.format as 'MANGA' | 'LIGHT_NOVEL') ?? 'MANGA',
          totalViews: 0,
          totalLikes: 0,
          totalFavorites: 0,
          totalComments: 0,
          totalChapters: item.totalChapters ?? 0,
          rating: 5,
          createdAt: '',
          updatedAt: '',
        })));
      })
      .catch(() => {
        if (active) setLibraryWorks([]);
      });
    return () => { active = false; };
  }, []);

  const likedWorks = libraryWorks;
  const handleExportData = async () => {
    try {
      const data = await userApi.exportMyData();
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `manganetworking-dados-${user.name.toLowerCase().replace(/\s+/g, '-')}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch {
      alert('Não foi possível exportar seus dados agora. Tente novamente mais tarde.');
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('ATENÇÃO (LGPD): Tem certeza que deseja solicitar a anonimização e exclusão permanente da sua conta? Esta ação é irreversível.')) {
      return;
    }
    try {
      await userApi.deleteMyAccount();
      alert('Sua conta foi excluída e anonimizada com sucesso, conforme o Art. 18 da LGPD.');
      window.location.reload();
    } catch {
      alert('Não foi possível confirmar a exclusão da conta. Nenhum dado foi removido; tente novamente ou entre em contato com o suporte.');
    }
  };

  return (
    <div className="mn-container py-8 space-y-10 select-none pb-20">
      
      {/* 1. Header do Perfil do Leitor (Novo Design System) */}
      <div className="border-2 border-[var(--mn-line)] bg-[var(--mn-ink-2)] shadow-[6px_6px_0_var(--mn-paper)] p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 border-b-2 border-[var(--mn-line)] pb-6">
          
          {/* Avatar com Borda de Adesivo Off-White Ampliada (~30px maior) */}
          <div className="flex items-center gap-6">
            <div className="relative p-1.5 bg-[var(--mn-paper)] border-[3px] border-[var(--mn-ink)] shadow-[6px_6px_0_var(--mn-yellow)] -rotate-1 shrink-0">
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="w-24 h-24 sm:w-28 sm:h-28 object-cover border-2 border-[var(--mn-ink)]"
              />
            </div>

            <div className="space-y-2">
              <label className={`inline-flex cursor-pointer items-center gap-2 border border-[var(--mn-line)] px-3 py-2 font-pixel text-[10px] text-[var(--mn-paper)] ${!isAuthenticated || isUploadingAvatar ? 'opacity-50' : ''}`}>
                <Upload size={12} />
                {isUploadingAvatar ? 'ENVIANDO…' : 'TROCAR AVATAR'}
                <input type="file" accept="image/jpeg,image/png" disabled={!isAuthenticated || isUploadingAvatar} onChange={handleAvatarUpload} className="sr-only" />
              </label>
              {avatarError && <p role="alert" className="font-body text-xs text-red-400">{avatarError}</p>}
            </div>

            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-pixel text-[12px] tracking-widest text-[var(--mn-yellow)] block uppercase font-bold">
                  LEITOR OFICIAL
                </span>
                {user.isVip && (
                  <span className="px-1.5 py-0.5 bg-[var(--mn-yellow)] text-[var(--mn-ink)] font-pixel text-[12px] uppercase font-bold flex items-center gap-1">
                    <Crown size={10} className="fill-[var(--mn-ink)]" />
                    VIP
                  </span>
                )}
              </div>
              <h1 className="font-display text-3xl sm:text-4xl text-[var(--mn-paper)] uppercase">
                {user.name}
              </h1>
            </div>
          </div>

          {/* Switch de Visibilidade Oficial (Conformidade LGPD) */}
          <div className="flex items-center gap-3 bg-[var(--mn-ink)] border-2 border-[var(--mn-line)] p-2">
            <span className="font-pixel text-[12px] text-[var(--mn-mute)] uppercase tracking-wider pl-1">
              VISIBILIDADE:
            </span>
            <button
              type="button"
              onClick={() => void toggleProfileVisibility()}
              disabled={isPublic === null || isSavingVisibility}
              aria-pressed={isPublic === true}
              aria-label={isPublic === null
                ? (visibilityError ? 'Visibilidade do perfil indisponível' : 'Carregando visibilidade do perfil')
                : `Perfil ${isPublic ? 'público' : 'privado'}`}
              className={`px-3 py-1 font-pixel text-[12px] tracking-wider uppercase border-2 transition-all flex items-center gap-1.5 ${
                isPublic === true
                  ? 'bg-[var(--mn-yellow)] text-[var(--mn-ink)] border-[var(--mn-ink)] shadow-[2px_2px_0_var(--mn-ink)]'
                  : 'bg-[var(--mn-ink-3)] text-[var(--mn-paper)] border-[var(--mn-line)]'
              }`}
            >
              {isPublic === true ? <Globe size={12} /> : <Lock size={12} />}
              <span>{isPublic === null
                ? (visibilityError ? 'INDISPONÍVEL' : 'CARREGANDO…')
                : isPublic ? 'PÚBLICO' : 'PRIVADO'}</span>
            </button>
          </div>
        </div>

        {visibilityError && <p role="alert" className="font-body text-xs text-red-400">{visibilityError}</p>}

        {/* 2. Destaque Monumental: 1 Número de Destaque Oficial */}
        <div className="flex flex-col sm:flex-row sm:items-baseline gap-4 pt-2">
          <div className="flex items-baseline gap-3">
            <span className="font-display text-6xl sm:text-7xl text-[var(--mn-yellow)] leading-none tabular-nums">
              {likedWorks.length}
            </span>
            <span className="font-display text-2xl text-[var(--mn-paper)] uppercase tracking-wider">
              OBRAS CURTIDAS
            </span>
          </div>

        </div>

        {/* Texto de Apoio de Privacidade LGPD */}
        <p className="font-body text-xs text-[var(--mn-mute)] border-t border-[var(--mn-line)] pt-4 leading-relaxed">
          Em conformidade com a LGPD, seu perfil só fica visível publicamente
          para outros leitores quando a opção "Público" estiver selecionada. Seus
          dados estão protegidos.
        </p>
      </div>

      {/* 3. Assinatura VIP MangaNetWorking */}
      <section className="border-2 border-[var(--mn-yellow)] bg-[var(--mn-ink-2)] p-6 space-y-4 shadow-[4px_4px_0_var(--mn-yellow)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--mn-line)] pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[var(--mn-yellow)] text-[var(--mn-ink)] border-2 border-[var(--mn-ink)]">
              <Crown size={22} className="fill-[var(--mn-ink)]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-2xl text-[var(--mn-paper)] uppercase">
                  ASSINATURA VIP DA PLATAFORMA
                </h3>
                {user.isVip && (
                  <span className="px-2 py-0.5 bg-[var(--mn-ok)] text-[var(--mn-ink)] font-pixel text-[12px] uppercase font-bold">
                    ATIVO
                  </span>
                )}
              </div>
              <p className="font-body text-xs text-[var(--mn-mute)]">
                {user.isVip
                  ? user.vipExpiresAt
                    ? `Válido até ${new Date(user.vipExpiresAt).toLocaleDateString('pt-BR')} · sem anúncios`
                    : 'Assinatura ativa · sem anúncios'
                  : 'Valor e condições apresentados no checkout seguro.'}
              </p>
            </div>
          </div>

          <div>
            {user.isVip ? (
              <div className="flex items-center gap-2 text-[var(--mn-ok)] font-pixel text-[12px] uppercase">
                <CheckCircle2 size={16} />
                <span>BENEFÍCIOS ATIVOS</span>
              </div>
            ) : (
              <Button
                variant="primary"
                onClick={openVip}
                className="flex items-center gap-2 !text-xs !min-h-[40px]"
              >
                <Sparkles size={14} />
                <span>ASSINAR VIP AGORA</span>
              </Button>
            )}
          </div>
        </div>

        <p className="font-body text-xs text-[var(--mn-mute)] leading-relaxed">
          O VIP MangaNetWorking remove 100% da publicidade na plataforma e habilita o download de capítulos no futuro app móvel. <strong>Importante:</strong> Esta assinatura apoia a plataforma e não substitui os Clubes de Membros individuais dos criadores, mantendo os 83% de repasse líquido para os quadrinistas independentes.
        </p>
      </section>

      {/* 4. Obras Favoritadas pelo Leitor */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b-2 border-[var(--mn-line)] pb-3">
          <h2 className="font-display text-2xl sm:text-3xl text-[var(--mn-paper)] uppercase tracking-wide flex items-center gap-2">
            <Heart size={20} className="fill-[var(--mn-yellow)] text-[var(--mn-yellow)]" />
            OBRAS NA BANCA DO LEITOR
          </h2>
          <span className="font-pixel text-[12px] text-[var(--mn-yellow)] tabular-nums">
            {likedWorks.length} TÍTULOS
          </span>
        </div>

        {likedWorks.length === 0 ? (
          <div className="p-8 text-center border-2 border-dashed border-[var(--mn-line)] bg-[var(--mn-ink-2)] space-y-2">
            <p className="font-body text-sm text-[var(--mn-mute)]">
              Você ainda não curtiu nenhum mangá. Explore o Catálogo para favoritar seus títulos favoritos.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {likedWorks.map((work) => (
              <WorkCard
                key={work.id}
                work={work}
                onSelect={onSelectWork}
                isFavorite={true}
                analyticsSurface="BIBLIOTECA"
                analyticsEnabled={isAuthenticated}
              />
            ))}
          </div>
        )}
      </section>

      {/* 5. Direitos do Titular LGPD (Ações Transparentes) */}
      <section className="border-2 border-[var(--mn-line)] bg-[var(--mn-ink-2)] p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-[var(--mn-line)] pb-3">
          <Shield size={18} className="text-[var(--mn-yellow)]" />
          <h3 className="font-display text-xl text-[var(--mn-paper)] uppercase">
            PRIVACIDADE E DADOS DO TITULAR (LGPD)
          </h3>
        </div>

        <p className="font-body text-xs text-[var(--mn-mute)] leading-relaxed">
          Nos termos da Lei Geral de Proteção de Dados (Lei nº 13.709/2018), você
          tem o direito de solicitar a exportação completa de todos os seus dados
          armazenados ou a exclusão irreversível da sua conta.
        </p>

        <div className="flex flex-wrap gap-4 pt-2">
          <Button
            variant="secondary"
            onClick={handleExportData}
            className="flex items-center gap-2 !text-xs !min-h-[40px]"
          >
            <Download size={14} />
            <span>BAIXAR MEUS DADOS (JSON)</span>
          </Button>

          <Button
            variant="danger"
            onClick={handleDeleteAccount}
            className="flex items-center gap-2 !text-xs !min-h-[40px]"
          >
            <Trash2 size={14} />
            <span>EXCLUIR CONTA</span>
          </Button>
        </div>
      </section>

    </div>
  );
}

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, Check, Upload, Crop } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Field } from '../components/ui/Field';
import { CreatorMissionsPanel } from '../components/creator/CreatorMissionsPanel';
import { ImageCropper } from '../components/common/ImageCropper';
import { LevelPatch } from '../components/ui/LevelPatch';
import { Sticker } from '../components/ui/Sticker';
import { storageApi } from '../api/storageApi';
import { userApi } from '../api/authApi';
import { creatorApi, CreatorWorkspaceDto } from '../api/creatorApi';


export type CreatorWorkspaceSection = 'dashboard' | 'missions' | 'works';
export function CreatorWorkspacePage({ section = 'dashboard', onOpenPublicProfile }: { section?: CreatorWorkspaceSection; onOpenPublicProfile?: (username: string) => void } = {}) {
  const { refreshSession } = useAuth();

  // Painel real do autor (`GET /api/creators/workspace`); cai na demo quando não há sessão de criador.
  const [workspace, setWorkspace] = useState<CreatorWorkspaceDto | null>(null);
  const [workspaceLoading, setWorkspaceLoading] = useState(true);

  const [profileName, setProfileName] = useState('');
  // Links sociais do autor: pelo menos um e obrigatorio (regra do servidor).
  const [instagramUrl, setInstagramUrl] = useState<string>('');
  const [youtubeUrl, setYoutubeUrl] = useState<string>('');
  const [portfolioUrl, setPortfolioUrl] = useState<string>('');
  const [bio, setBio] = useState('');
  const [membershipPrice, setMembershipPrice] = useState<number | null>(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  // Pre-visualizacao local: o arquivo escolhido aparece na hora (objectURL), como no
  // MangaTeofilo, e so depois troca pela URL definitiva do servidor.
  const [localAvatarPreview] = useState<string | null>(null);
  const displayedAvatar = localAvatarPreview ?? avatarPreview;
  const [declaredOriginal, setDeclaredOriginal] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Estados para Publicação Real de Nova Obra e Capítulo
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  /** Origem do recorte do avatar: arquivo novo ou a foto atual. */
  const [avatarCropSource, setAvatarCropSource] = useState<{ file?: File; url?: string } | null>(null);

  // Estado explícito quando não há sessão de criador.
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Carrega o painel real do autor e semeia os campos editáveis com os valores autoritativos do servidor.
  useEffect(() => {
    let active = true;
    creatorApi
      .getWorkspace()
      .then((data) => {
        if (!active || !data) return;
        setWorkspace(data);
        if (data.avatarUrl) setAvatarPreview(data.avatarUrl);
        if (data.name) setProfileName(data.name);
        if (data.membershipPriceBrl != null) setMembershipPrice(Number(data.membershipPriceBrl));
        if (data.bio != null) setBio(data.bio);
        if (data.instagramUrl) setInstagramUrl(data.instagramUrl);
        if (data.youtubeUrl) setYoutubeUrl(data.youtubeUrl);
        if (data.portfolioUrl) setPortfolioUrl(data.portfolioUrl);
      })
      .catch(() => {
        if (!active) return;
        setWorkspaceError('Entre com uma conta de criador para consultar dados reais do painel.');
      }).finally(() => { if (active) setWorkspaceLoading(false); });
    return () => {
      active = false;
    };
  }, []);

  // Valores exibidos: dados do servidor quando a sessão de criador existe; zero se não autenticado (anti-fake data).
  const displayHandle = workspace?.handle ?? '-';
  const monetizationLevel = workspace?.monetizationLevel ?? 0;
  const walletBalanceBrl = workspace ? Number(workspace.walletBalanceBrl) : 0;
  const totalDonationsBrl = workspace ? Number(workspace.totalDonationsBrl) : 0;
  const monthlyMembersCount = workspace?.monthlyMembersCount ?? 0;
  const activeMissions = workspace?.missions ?? [];



  // O upload do avatar passa pelo recortador: arraste e zoom (padrao MangaTeofilo).
  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
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

  /** Grava o recorte final como avatar do AUTOR e da CONTA (o header usa o da conta). */
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




  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveError(null);
    try {
      await creatorApi.updateProfile({ name: profileName, bio, instagramUrl, youtubeUrl, portfolioUrl });
      if (membershipPrice != null && Number.isFinite(membershipPrice)) {
        await creatorApi.updateMembershipPrice(membershipPrice);
      }
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2500);
      } catch (err: unknown) {
        setSaveError(err instanceof Error ? err.message : 'Não foi possível salvar no servidor. Verifique a sessão e tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!workspaceLoading && !workspace) {
    return <div role="status" className="mn-container py-16 text-center space-y-4"><h1 className="font-display text-3xl text-[var(--mn-paper)]">PAINEL DO CRIADOR</h1><p className="font-body text-[var(--mn-mute)]">{workspaceError ?? 'Entre com uma conta de criador para acessar este painel.'}</p></div>;
  }

  return (
    <div className="mn-container py-8 space-y-10 select-none pb-24">
      
        {/* Ferramentas que o leitor tem em "Minha conta" e que o escritor tambem precisa:
            ver o proprio perfil publico, exportar os dados (LGPD) e excluir a conta. */}
        <div className="border-2 border-[var(--mn-line)] bg-[var(--mn-ink-2)] p-6 sm:p-8 space-y-4">
          <h2 className="font-display text-2xl text-[var(--mn-paper)] uppercase">MEU PERFIL E MEUS DADOS</h2>
          <p className="font-body text-xs text-[var(--mn-mute)]">
            Seu perfil de escritor é <strong className="text-[var(--mn-paper)]">sempre público</strong>: é assim
            que os leitores te encontram. O identificador público é o seu username
            (@{displayHandle?.replace(/^@/, '')}).
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenPublicProfile?.(workspace?.username || displayHandle || '')}
            >
              VER MEU PERFIL PÚBLICO
            </Button>
            <Button type="button" variant="ghost" onClick={() => void userApi.exportMyData()}>
              EXPORTAR MEUS DADOS (LGPD)
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                const confirmado = window.confirm(
                  'Excluir a conta apaga permanentemente seus dados, revoga as sessões e despublica as obras (Art. 18, VI da LGPD). Continuar?'
                );
                if (confirmado) void userApi.deleteMyAccount();
              }}
            >
              EXCLUIR MINHA CONTA
            </Button>
          </div>
        </div>

        {/* Aviso Mandatório Anti-Pirataria em Caixa de Carimbo */}
      <div className="border-2 border-[var(--mn-red)] mn-red-subtle p-5 space-y-2">
        <div className="flex items-center gap-2">
          <ShieldAlert size={18} className="text-[var(--mn-red)]" />
          <h2 className="font-display text-lg text-[var(--mn-red)] uppercase tracking-wide">
            AVISO MANDATÓRIO: AUTORIA ORIGINAL E TOLERÂNCIA ZERO À PIRATARIA
          </h2>
        </div>
        <p className="font-body text-xs text-[var(--mn-paper)] leading-relaxed">
          É <strong>estritamente proibido</strong> upar obras de terceiros, scans, mangás comerciais existentes (como Bleach, Naruto, One Piece) ou traduções não autorizadas. Infratores sofrerão <strong>remoção imediata da obra e suspensão/banimento permanente da conta</strong> nos termos do Art. 184 do Código Penal. Proibido conteúdo pornográfico explícito ou hentai.
        </p>
      </div>

      {workspaceError && (
        <div className="border-2 border-[var(--mn-line)] bg-[var(--mn-ink-2)] p-3">
          <span className="font-body text-xs text-[var(--mn-mute)]">{workspaceError}</span>
        </div>
      )}

      {/* 2. Topo do Painel: Season 01, Patches e XP */}
      {section === 'dashboard' && (
      <div className="border-2 border-[var(--mn-line)] bg-[var(--mn-ink-2)] shadow-[6px_6px_0_var(--mn-paper)] p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b-2 border-[var(--mn-line)] pb-6">
          <div className="flex items-center gap-4">
            <div className="p-1 bg-[var(--mn-paper)] border-2 border-[var(--mn-ink)] shadow-[3px_3px_0_var(--mn-yellow)] rounded-full">
              <img
                src={displayedAvatar}
                alt={profileName}
                className="w-[148px] h-[148px] rounded-full object-cover border-2 border-[var(--mn-yellow)] bg-[#1F2833]"
              />
            </div>

            {workspace && (
              <div className="flex flex-wrap items-center gap-2">
                <label className={`inline-flex cursor-pointer items-center gap-2 border border-[var(--mn-line)] px-3 py-2 font-pixel text-[10px] text-[var(--mn-paper)] ${isUploadingAvatar ? 'opacity-50' : ''}`}>
                  <Upload size={12} />
                  {isUploadingAvatar ? 'ENVIANDO…' : 'TROCAR AVATAR'}
                  <input type="file" accept="image/jpeg,image/png" disabled={isUploadingAvatar} onChange={handleAvatarUpload} className="sr-only" />
                </label>
                {avatarPreview && (
                  <button
                    type="button"
                    onClick={() => setAvatarCropSource({ url: avatarPreview })}
                    disabled={isUploadingAvatar}
                    className="inline-flex items-center gap-2 border border-[var(--mn-line)] px-3 py-2 font-pixel text-[10px] text-[var(--mn-paper)] hover:border-[var(--mn-yellow)] disabled:opacity-50"
                    title="Reajusta a foto atual, sem subir um arquivo novo"
                  >
                    <Crop size={12} />
                    REAJUSTAR FOTO
                  </button>
                )}
              </div>
            )}

            <div>
              <span className="font-pixel text-[12px] text-[var(--mn-yellow)] tracking-widest block uppercase font-bold">
                PAINEL DO AUTOR
              </span>
              <h1 className="font-display text-3xl sm:text-4xl text-[var(--mn-paper)] uppercase">
                {profileName}
              </h1>
              <span className="font-body text-xs text-[var(--mn-mute)]">
                {`@${displayHandle?.replace(/^@/, '')}`} 
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Sticker kind="new" label="CRIADOR DA TEMPORADA" rotate={-2} />
          </div>
        </div>

        {/* Patches dos 4 Níveis e Barra de XP */}
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {([1, 2, 3, 4] as const).map((level) => (
                <LevelPatch key={level} level={level} isUnlocked={level <= monetizationLevel} />
              ))}
            </div></div>
        </div>
      </div>
      )}

      {/* 3. Grade com Janelas Retrô: Quests Semanais + Ganhos */}
      {section === 'missions' && (
        <CreatorMissionsPanel
          missions={activeMissions}
          boostMultiplier={workspace?.engagementBoostMul ?? 1}
          walletBalanceBrl={walletBalanceBrl ?? 0}
          totalDonationsBrl={totalDonationsBrl ?? 0}
          monthlyMembersCount={monthlyMembersCount ?? 0}
          membershipPriceBrl={membershipPrice ?? 0}
        />
      )}


      {/* Recortador de avatar: arraste + zoom antes de gravar (padrao MangaTeofilo) */}
      {avatarCropSource && (
        <ImageCropper
          file={avatarCropSource.file ?? null}
          sourceUrl={avatarCropSource.url ?? null}
          outputWidth={512}
          outputHeight={512}
          busy={isUploadingAvatar}
          error={saveError}
          onCancel={() => setAvatarCropSource(null)}
          onConfirm={saveCroppedAvatar}
        />
      )}

      {/* 5. Formulário de Perfil do Autor com Declaração de Autoria */}
      {section === 'dashboard' && (
      <form onSubmit={handleSave} className="border-2 border-[var(--mn-line)] bg-[var(--mn-ink-2)] p-6 sm:p-8 space-y-6">
        <div>
          <h2 className="font-display text-2xl text-[var(--mn-paper)] uppercase">
            CONFIGURAÇÕES DO CRIADOR
          </h2>
          <p className="font-body text-xs text-[var(--mn-mute)] mt-0.5">
            Atualize seus dados públicos e valor da assinatura de membros.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field
            label="NOME ARTÍSTICO"
            value={profileName}
            onChange={(e) => setProfileName(e.target.value)}
          />

          <Field
            label="VALOR DA MENSALIDADE DE MEMBROS (R$)"
            type="number"
            step="0.01"
            value={membershipPrice ?? ''}
            onChange={(e) => setMembershipPrice(e.target.value === '' ? null : Number(e.target.value))}
            helperText="Preço cobrado dos leitores para acesso antecipado"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="creator-bio" className="font-body text-sm font-semibold text-[var(--mn-paper)] block">
            BIOGRAFIA EDITORIAL
          </label>
          <textarea
            id="creator-bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            className="w-full p-3 bg-[var(--mn-ink-2)] text-[var(--mn-paper)] font-body text-sm border-2 border-[var(--mn-line)] focus:border-[var(--mn-paper)] focus:shadow-[3px_3px_0_var(--mn-yellow)] outline-none"
          />
        </div>

        {/* Vínculo social: os três são opcionais, mas pelo menos UM é obrigatório
            (regra do servidor). É o que dá identidade pública real ao escritor. */}
        <div className="space-y-3 border-2 border-[var(--mn-teal)] p-4">
          <div>
            <p className="font-display text-sm text-[var(--mn-paper)] uppercase">VÍNCULO SOCIAL</p>
            <p className="font-body text-xs text-[var(--mn-mute)]">
              Informe <strong>pelo menos um</strong> (Instagram, YouTube ou portfólio). É o que o leitor
              vê no seu perfil. O seu identificador público é o seu username: @{displayHandle?.replace(/^@/, '')}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field
              label="INSTAGRAM"
              value={instagramUrl}
              onChange={(e) => setInstagramUrl(e.target.value)}
              placeholder="https://instagram.com/..."
            />
            <Field
              label="YOUTUBE"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="https://youtube.com/@..."
            />
            <Field
              label="PORTFÓLIO"
              value={portfolioUrl}
              onChange={(e) => setPortfolioUrl(e.target.value)}
              placeholder="https://behance.net/..."
            />
          </div>
        </div>

        {/* Declaração de Autoria Original Obrigatória (Seção 8.9) */}
        <div className="p-4 border-2 border-[var(--mn-yellow)] bg-[var(--mn-ink)] space-y-2">
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={declaredOriginal}
              onChange={(e) => setDeclaredOriginal(e.target.checked)}
              className="mt-1 w-5 h-5 accent-[var(--mn-yellow)] cursor-pointer"
            />
            <span className="font-display text-sm text-[var(--mn-paper)] uppercase leading-snug">
              DECLARO QUE TODAS AS OBRAS E CAPÍTULOS PUBLICADOS NESTA CONTA SÃO
              DE MINHA AUTORIA ORIGINAL E NÃO VIOLAM DIREITOS DE TERCEIROS.
            </span>
          </label>
          <span className="font-body text-[12px] text-[var(--mn-mute)] block pl-8">
            Declaração com validade jurídica vinculada ao cadastro para fins do Art. 184 do CP.
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <Button
            type="submit"
            variant="primary"
            disabled={!declaredOriginal || isSaving}
            className="!px-6"
          >
            {isSaving ? 'SALVANDO...' : isSaved ? 'DADOS SALVOS COM SUCESSO!' : 'SALVAR ALTERAÇÕES'}
          </Button>

          {isSaved && (
            <div role="status" className="flex flex-wrap items-center gap-3 border-2 border-[var(--mn-ok)] bg-[var(--mn-ink-2)] px-4 py-3">
              <span className="font-pixel text-[12px] text-[var(--mn-ok)] flex items-center gap-1">
                <Check size={14} /> PERFIL ATUALIZADO NO SERVIDOR
              </span>
              <button
                type="button"
                onClick={() => onOpenPublicProfile?.(workspace?.username || '')}
                className="font-pixel text-[11px] uppercase text-[var(--mn-yellow)] hover:underline"
              >
                VER MEU PERFIL PÚBLICO
              </button>
            </div>
          )}

          {saveError && <span className="font-body text-xs text-[var(--mn-red)]">{saveError}</span>}
        </div>
      </form>
      )}

    </div>
  );
}

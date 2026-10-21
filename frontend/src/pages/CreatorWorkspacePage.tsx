import { useState, useEffect } from 'react';
import { ShieldAlert, Check, Upload, Image, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Field } from '../components/ui/Field';
import { CreatorMissionsPanel } from '../components/creator/CreatorMissionsPanel';
import { LevelPatch } from '../components/ui/LevelPatch';
import { Sticker } from '../components/ui/Sticker';
import { MOCK_CREATORS } from '../data/mockData';
import { storageApi } from '../api/storageApi';
import { workApi } from '../api/workApi';
import { creatorApi, CreatorWorkspaceDto } from '../api/creatorApi';
import { toBackendLocalDateTime } from '../utils/datetime';


export type CreatorWorkspaceSection = 'dashboard' | 'missions' | 'works';
export function CreatorWorkspacePage({ section = 'dashboard', onOpenPublicProfile }: { section?: CreatorWorkspaceSection; onOpenPublicProfile?: (username: string) => void } = {}) {
  const creator = import.meta.env.DEV ? MOCK_CREATORS['creator-teofilo'] || Object.values(MOCK_CREATORS)[0] : undefined;

  // Painel real do autor (`GET /api/creators/workspace`); cai na demo quando não há sessão de criador.
  const [workspace, setWorkspace] = useState<CreatorWorkspaceDto | null>(null);
  const [workspaceLoading, setWorkspaceLoading] = useState(true);

  const [profileName, setProfileName] = useState(creator?.name ?? '');
  // Links sociais do autor: pelo menos um e obrigatorio (regra do servidor).
  const [instagramUrl, setInstagramUrl] = useState<string>('');
  const [youtubeUrl, setYoutubeUrl] = useState<string>('');
  const [portfolioUrl, setPortfolioUrl] = useState<string>('');
  const [bio, setBio] = useState(creator?.bio ?? '');
  const [membershipPrice, setMembershipPrice] = useState<number | null>(creator?.membershipPriceBrl ?? null);
  const [avatarPreview, setAvatarPreview] = useState(creator?.avatarUrl ?? '');
  // Pre-visualizacao local: o arquivo escolhido aparece na hora (objectURL), como no
  // MangaTeofilo, e so depois troca pela URL definitiva do servidor.
  const [localAvatarPreview, setLocalAvatarPreview] = useState<string | null>(null);
  const [localCoverPreview, setLocalCoverPreview] = useState<string | null>(null);
  const [localBannerPreview, setLocalBannerPreview] = useState<string | null>(null);
  const displayedAvatar = localAvatarPreview ?? avatarPreview;
  const [declaredOriginal, setDeclaredOriginal] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Estados para Publicação Real de Nova Obra e Capítulo
  const [newWorkTitle, setNewWorkTitle] = useState('');
  const [newWorkSynopsis, setNewWorkSynopsis] = useState('');
  const [newWorkGenres, setNewWorkGenres] = useState<string[]>(['ACAO', 'SHONEN']);
  const [newWorkFormat, setNewWorkFormat] = useState<'MANGA' | 'LIGHT_NOVEL'>('MANGA');
  const [chapterText, setChapterText] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const displayedCover = localCoverPreview ?? coverUrl;
  const displayedBanner = localBannerPreview ?? bannerUrl;
  const [chapterPages, setChapterPages] = useState<string[]>([]);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [isUploadingPages, setIsUploadingPages] = useState(false);
  const [isPublishingWork, setIsPublishingWork] = useState(false);
  const [draftWorkId, setDraftWorkId] = useState<string | null>(null);
  const [publishSuccessMsg, setPublishSuccessMsg] = useState<string | null>(null);
  const [publishErrorMsg, setPublishErrorMsg] = useState<string | null>(null);

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
  const displayHandle = workspace?.handle ?? creator?.handle ?? '—';
  const monetizationLevel = workspace?.monetizationLevel ?? 0;
  const walletBalanceBrl = workspace ? Number(workspace.walletBalanceBrl) : creator?.walletBalanceBrl;
  const totalDonationsBrl = workspace ? Number(workspace.totalDonationsBrl) : creator?.totalDonationsBrl;
  const monthlyMembersCount = workspace?.monthlyMembersCount ?? creator?.monthlyMembersCount;
  const activeMissions = workspace?.missions ?? [];


  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingCover(true);
    setPublishErrorMsg(null);
    try {
      setLocalCoverPreview(URL.createObjectURL(file));
      const res = await storageApi.uploadFile(file);
      setCoverUrl(res.url);
    } catch (err: any) {
      setPublishErrorMsg(err.message || 'Erro no upload da capa.');
    } finally {
      setIsUploadingCover(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || isUploadingAvatar) return;
    setIsUploadingAvatar(true);
    setSaveError(null);
    try {
      setLocalAvatarPreview(URL.createObjectURL(file));
      const stored = await storageApi.uploadAvatar(file);
      await creatorApi.updateProfile({ avatarUrl: stored.url });
      setAvatarPreview(stored.url);
    } catch {
      setSaveError('Não foi possível salvar o avatar no servidor. Use JPEG ou PNG e tente novamente.');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingBanner(true);
    setPublishErrorMsg(null);
    try {
      setLocalBannerPreview(URL.createObjectURL(file));
      const res = await storageApi.uploadFile(file);
      setBannerUrl(res.url);
    } catch (err: any) {
      setPublishErrorMsg(err.message || 'Erro no upload do banner.');
    } finally {
      setIsUploadingBanner(false);
    }
  };

  const handlePagesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;
    setIsUploadingPages(true);
    setPublishErrorMsg(null);
    try {
      const orderedFiles = [...files].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
      );
      const results = await storageApi.uploadBatch(orderedFiles);
      setChapterPages(results.map(r => r.url));
    } catch (err: any) {
      setPublishErrorMsg(err.message || 'Erro no upload das páginas.');
    } finally {
      setIsUploadingPages(false);
    }
  };

  const handlePublishWork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkTitle.trim() || !newWorkSynopsis.trim()) {
      setPublishErrorMsg('Título e sinopse são obrigatórios.');
      return;
    }
    if (!coverUrl) {
      setPublishErrorMsg('Por favor, faça o upload da capa 2:3 da obra.');
      return;
    }
    if (!declaredOriginal) {
      setPublishErrorMsg('A declaração de autoria original é mandatória para publicação.');
      return;
    }

    setIsPublishingWork(true);
    setPublishErrorMsg(null);
    setPublishSuccessMsg(null);

    try {
      // Reaproveita a obra já criada se a publicação do capítulo anterior falhou.
      let workId = draftWorkId;
      if (!workId) {
        const workRes = await workApi.createWork({
          title: newWorkTitle.trim(),
          synopsis: newWorkSynopsis.trim(),
          coverUrl,
          bannerUrl: bannerUrl || undefined,
          genres: newWorkGenres,
          originalAuthorDeclaration: true,
          format: newWorkFormat,
        });
        workId = workRes.workId;
        if (!workId) {
          throw new Error('O servidor não retornou o identificador da obra criada.');
        }
        setDraftWorkId(workId);
      }

      // 2. Se houver páginas enviadas, publicar capítulo 1 imediatamente
      if (chapterPages.length > 0 || (newWorkFormat === 'LIGHT_NOVEL' && chapterText.trim())) {
        await workApi.createChapter(workId, {
          chapterNumber: 1,
          title: 'Capítulo 1: O Começo',
          ...(newWorkFormat === 'LIGHT_NOVEL'
            ? { format: 'PROSE' as const, content: chapterText.trim() }
            : { format: 'IMAGE_PAGES' as const, pages: chapterPages }),
          publicReleaseAt: toBackendLocalDateTime(),
        });
      }

      setPublishSuccessMsg(`Obra "${newWorkTitle}" criada com sucesso.`);
      setNewWorkTitle('');
      setNewWorkSynopsis('');
      setCoverUrl('');
      setBannerUrl('');
      setChapterPages([]);
      setChapterText('');
      setNewWorkFormat('MANGA');
      setDraftWorkId(null);
    } catch (err: any) {
      setPublishErrorMsg(err.message || 'Erro ao publicar obra no servidor.');
    } finally {
      setIsPublishingWork(false);
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
      } catch (err: any) {
        setSaveError(err?.message || 'NÃ£o foi possÃ­vel salvar no servidor. Verifique a sessÃ£o e tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!workspaceLoading && !workspace && !import.meta.env.DEV) {
    return <div role="status" className="mn-container py-16 text-center space-y-4"><h1 className="font-display text-3xl text-[var(--mn-paper)]">PAINEL DO CRIADOR</h1><p className="font-body text-[var(--mn-mute)]">{workspaceError ?? 'Entre com uma conta de criador para acessar este painel.'}</p></div>;
  }

  return (
    <div className="mn-container py-8 space-y-10 select-none pb-24">
      
      {/* 1. Aviso Mandatório Anti-Pirataria em Caixa de Carimbo */}
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
            <div className="p-1 bg-[var(--mn-paper)] border-2 border-[var(--mn-ink)] shadow-[3px_3px_0_var(--mn-yellow)]">
              <img
                src={displayedAvatar}
                alt={profileName}
                className="w-16 h-16 object-cover border border-[var(--mn-ink)]"
              />
            </div>

            {workspace && (
              <label className={`inline-flex cursor-pointer items-center gap-2 border border-[var(--mn-line)] px-3 py-2 font-pixel text-[10px] text-[var(--mn-paper)] ${isUploadingAvatar ? 'opacity-50' : ''}`}>
                <Upload size={12} />
                {isUploadingAvatar ? 'ENVIANDO…' : 'TROCAR AVATAR'}
                <input type="file" accept="image/jpeg,image/png" disabled={isUploadingAvatar} onChange={handleAvatarUpload} className="sr-only" />
              </label>
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

      {/* 4. Formulário de Publicação Real de Nova Obra e Páginas (Fase 7) */}
      {section === 'works' && (
      <section className="border-2 border-[var(--mn-yellow)] bg-[var(--mn-ink-2)] p-6 sm:p-8 space-y-6 shadow-[6px_6px_0_var(--mn-yellow)]">
        <div>
          <span className="font-pixel text-[12px] text-[var(--mn-yellow)] uppercase tracking-widest font-bold block mb-1">
            ESTÚDIO EDITORIAL DO AUTOR
          </span>
          <h2 className="font-display text-3xl text-[var(--mn-paper)] uppercase">
            PUBLICAR NOVA OBRA ORIGINAL
          </h2>
          <p className="font-body text-xs text-[var(--mn-mute)] mt-0.5">
            Cadastre seu mangá no catálogo e alimente o feed de recomendações instantaneamente.
          </p>
        </div>

        {publishSuccessMsg && (
          <div className="p-4 bg-[var(--mn-ok)] text-[var(--mn-ink)] border-2 border-[var(--mn-ink)] font-display text-sm uppercase flex items-center gap-2">
            <CheckCircle2 size={18} />
            <span>{publishSuccessMsg}</span>
          </div>
        )}

        {publishErrorMsg && (
          <div className="p-4 bg-[var(--mn-red)] text-[var(--mn-paper)] border-2 border-[var(--mn-ink)] font-body text-xs flex items-center gap-2">
            <AlertCircle size={18} />
            <span>{publishErrorMsg}</span>
          </div>
        )}

        <form onSubmit={handlePublishWork} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field
              label="TÍTULO DA OBRA"
              placeholder="Ex: Guerreiros do Sertão"
              value={newWorkTitle}
              onChange={(e) => setNewWorkTitle(e.target.value)}
            />

            <div>
              <label htmlFor="work-format" className="font-body text-sm font-semibold text-[var(--mn-paper)] block mb-1.5">FORMATO DA OBRA</label>
              <select id="work-format" value={newWorkFormat} onChange={(e) => setNewWorkFormat(e.target.value as 'MANGA' | 'LIGHT_NOVEL')} className="w-full p-2.5 bg-[var(--mn-ink)] text-[var(--mn-paper)] border-2 border-[var(--mn-line)] font-body text-xs focus:border-[var(--mn-yellow)] outline-none">
                <option value="MANGA">Mangá — páginas ilustradas</option>
                <option value="LIGHT_NOVEL">Light novel — capítulos em prosa</option>
              </select>
            </div>

            <div>
              <label htmlFor="work-genre" className="font-body text-sm font-semibold text-[var(--mn-paper)] block mb-1.5">
                GÊNERO PRINCIPAL
              </label>
              <select
                id="work-genre"
                value={newWorkGenres[0] || 'ACAO'}
                onChange={(e) => setNewWorkGenres([e.target.value])}
                className="w-full p-2.5 bg-[var(--mn-ink)] text-[var(--mn-paper)] border-2 border-[var(--mn-line)] font-body text-xs focus:border-[var(--mn-yellow)] outline-none"
              >
                <option value="ACAO">Ação (Shonen/Seinen)</option>
                <option value="AVENTURA">Aventura</option>
                <option value="FANTASIA">Fantasia Medieval / Regional</option>
                <option value="SCI_FI">Ficção Científica (Sci-Fi)</option>
                <option value="SOBRENATURAL">Sobrenatural / Horror</option>
                <option value="MISTERIO">Mistério / Investigação</option>
                <option value="DRAMA">Drama / Cotidiano</option>
                <option value="COMEDIA">Comédia</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="work-synopsis" className="font-body text-sm font-semibold text-[var(--mn-paper)] block">
              SINOPSE EDITORIAL
            </label>
            <textarea
              id="work-synopsis"
              placeholder="Descreva o enredo da sua obra para atrair novos leitores..."
              value={newWorkSynopsis}
              onChange={(e) => setNewWorkSynopsis(e.target.value)}
              rows={3}
              className="w-full p-3 bg-[var(--mn-ink)] text-[var(--mn-paper)] font-body text-sm border-2 border-[var(--mn-line)] focus:border-[var(--mn-yellow)] outline-none resize-none"
            />
          </div>

          {/* Uploads de Capa e Banner */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Capa 2:3 */}
            <div className="p-4 border-2 border-dashed border-[var(--mn-line)] bg-[var(--mn-ink)] space-y-3 text-center">
              <span className="font-pixel text-[12px] text-[var(--mn-yellow)] uppercase block">
                CAPA VERTICAL (PROPORÇÃO 2:3)
              </span>
              {coverUrl ? (
                <div className="flex flex-col items-center gap-2">
                  <img src={displayedCover} alt="Preview da Capa" className="w-24 h-36 object-cover border-2 border-[var(--mn-yellow)]" />
                  <span className="font-pixel text-[12px] text-[var(--mn-ok)]">CAPA PRONTA</span>
                </div>
              ) : (
                <div className="py-4 space-y-2">
                  <Image size={28} className="mx-auto text-[var(--mn-mute)]" />
                  <p className="font-body text-xs text-[var(--mn-mute)]">JPEG, PNG ou WebP (Máx 15MB)</p>
                </div>
              )}
              <label className="inline-block px-4 py-2 bg-[var(--mn-ink-2)] border-2 border-[var(--mn-line)] hover:border-[var(--mn-yellow)] text-[var(--mn-paper)] font-pixel text-[12px] uppercase cursor-pointer transition-colors">
                <Upload size={14} className="inline mr-1.5" />
                {isUploadingCover ? 'ENVIANDO...' : 'SELECIONAR CAPA'}
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleCoverUpload} className="hidden" />
              </label>
            </div>

            {/* Banner 16:9 */}
            <div className="p-4 border-2 border-dashed border-[var(--mn-line)] bg-[var(--mn-ink)] space-y-3 text-center">
              <span className="font-pixel text-[12px] text-[var(--mn-yellow)] uppercase block">
                BANNER ILUSTRADO (16:9 - OPCIONAL)
              </span>
              {bannerUrl ? (
                <div className="flex flex-col items-center gap-2">
                  <img src={displayedBanner} alt="Preview do Banner" className="w-48 h-24 object-cover border-2 border-[var(--mn-yellow)]" />
                  <span className="font-pixel text-[12px] text-[var(--mn-ok)]">BANNER PRONTO</span>
                </div>
              ) : (
                <div className="py-4 space-y-2">
                  <Image size={28} className="mx-auto text-[var(--mn-mute)]" />
                  <p className="font-body text-xs text-[var(--mn-mute)]">Arte horizontal para fundo da obra</p>
                </div>
              )}
              <label className="inline-block px-4 py-2 bg-[var(--mn-ink-2)] border-2 border-[var(--mn-line)] hover:border-[var(--mn-yellow)] text-[var(--mn-paper)] font-pixel text-[12px] uppercase cursor-pointer transition-colors">
                <Upload size={14} className="inline mr-1.5" />
                {isUploadingBanner ? 'ENVIANDO...' : 'SELECIONAR BANNER'}
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleBannerUpload} className="hidden" />
              </label>
            </div>
          </div>

          {newWorkFormat === 'LIGHT_NOVEL' ? (
            <div className="p-4 border-2 border-[var(--mn-line)] bg-[var(--mn-ink)] space-y-3">
              <label htmlFor="chapter-prose" className="font-pixel text-[12px] text-[var(--mn-yellow)] uppercase block">TEXTO DO CAPÍTULO 1</label>
              <textarea id="chapter-prose" value={chapterText} onChange={(event) => setChapterText(event.target.value)} maxLength={2_000_000} rows={18} className="w-full p-4 bg-[var(--mn-ink-2)] text-[var(--mn-paper)] font-body text-base leading-relaxed border-2 border-[var(--mn-line)] focus:border-[var(--mn-yellow)] outline-none" placeholder="Escreva ou cole aqui o primeiro capítulo…" />
              <p className="font-body text-xs text-[var(--mn-mute)]">Texto puro, até 2 MB. HTML é removido no servidor.</p>
            </div>
          ) : (
          /* Upload de Páginas do Capítulo 1 */
          <div className="p-4 border-2 border-[var(--mn-line)] bg-[var(--mn-ink)] space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="font-pixel text-[12px] text-[var(--mn-yellow)] uppercase block">
                  PÁGINAS DO CAPÍTULO 1 (UPLOAD EM LOTE)
                </span>
                <span className="font-body text-xs text-[var(--mn-mute)]">
                  Selecione os arquivos de imagem ordenados das páginas do mangá.
                </span>
              </div>
              <label className="px-4 py-2 bg-[var(--mn-yellow)] text-[var(--mn-ink)] border-2 border-[var(--mn-ink)] font-pixel text-[12px] uppercase cursor-pointer hover:bg-[var(--mn-yellow-press)] transition-colors shrink-0">
                <FileText size={14} className="inline mr-1.5" />
                {isUploadingPages ? 'ENVIANDO PÁGINAS...' : `UPAR PÁGINAS (${chapterPages.length})`}
                <input type="file" multiple accept="image/jpeg,image/png" onChange={handlePagesUpload} className="hidden" />
              </label>
            </div>

            {chapterPages.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2 border-t border-[var(--mn-line)]">
                {chapterPages.map((page, idx) => (
                  <div key={idx} className="relative p-1 bg-[var(--mn-ink-2)] border border-[var(--mn-line)] text-center">
                    <span className="font-pixel text-[12px] text-[var(--mn-yellow)] block mb-1">PÁG. {idx + 1}</span>
                    <img src={page} alt={`Página ${idx + 1}`} className="w-12 h-16 object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>
          )}

          {/* Botão de Publicação */}
          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              disabled={isPublishingWork || !coverUrl || !declaredOriginal}
              className="w-full !py-3 !text-base flex items-center justify-center gap-2"
            >
              <CheckCircle2 size={18} />
              <span>{isPublishingWork ? 'PUBLICANDO NO CATÁLOGO...' : 'PUBLICAR OBRA NO CATÁLOGO OFICIAL'}</span>
            </Button>
          </div>
        </form>
      </section>
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

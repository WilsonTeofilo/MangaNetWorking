import { useState, useEffect } from 'react';
import { ShieldAlert, Check, Upload, Image, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Field } from '../components/ui/Field';
import { Win } from '../components/ui/Win';
import { LevelPatch } from '../components/ui/LevelPatch';
import { XpBar } from '../components/ui/XpBar';
import { Sticker } from '../components/ui/Sticker';
import { MOCK_CREATORS } from '../data/mockData';
import { storageApi } from '../api/storageApi';
import { workApi } from '../api/workApi';
import { creatorApi, CreatorWorkspaceDto } from '../api/creatorApi';
import { toBackendLocalDateTime } from '../utils/datetime';

/** Formata valores monetários em reais (pt-BR). */
function formatBrl(value: number): string {
  if (!Number.isFinite(value)) return 'R$ —';
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function CreatorWorkspacePage() {
  const creator = MOCK_CREATORS['creator-teofilo'] || Object.values(MOCK_CREATORS)[0];

  // Painel real do autor (`GET /api/creators/workspace`); cai na demo quando não há sessão de criador.
  const [workspace, setWorkspace] = useState<CreatorWorkspaceDto | null>(null);

  const [profileName, setProfileName] = useState(creator.name);
  const [bio, setBio] = useState(creator.bio);
  const [membershipPrice, setMembershipPrice] = useState(creator.membershipPriceBrl);
  const [avatarPreview] = useState(creator.avatarUrl);
  const [declaredOriginal, setDeclaredOriginal] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Estados para Publicação Real de Nova Obra e Capítulo
  const [newWorkTitle, setNewWorkTitle] = useState('');
  const [newWorkSynopsis, setNewWorkSynopsis] = useState('');
  const [newWorkGenres, setNewWorkGenres] = useState<string[]>(['ACAO', 'SHONEN']);
  const [coverUrl, setCoverUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [chapterPages, setChapterPages] = useState<string[]>([]);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [isUploadingPages, setIsUploadingPages] = useState(false);
  const [isPublishingWork, setIsPublishingWork] = useState(false);
  const [draftWorkId, setDraftWorkId] = useState<string | null>(null);
  const [publishSuccessMsg, setPublishSuccessMsg] = useState<string | null>(null);
  const [publishErrorMsg, setPublishErrorMsg] = useState<string | null>(null);

  // Aviso de demonstração quando não há sessão de criador (backend indisponível ou papel de leitor).
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
        if (data.name) setProfileName(data.name);
        if (data.membershipPriceBrl != null) setMembershipPrice(Number(data.membershipPriceBrl));
      })
      .catch(() => {
        if (!active) return;
        setWorkspaceError(
          'Painel em modo demonstração — entre como criador para ver saldo, nível e missões reais.'
        );
      });
    return () => {
      active = false;
    };
  }, []);

  // Valores exibidos: dados do servidor quando a sessão de criador existe; demo apenas como fallback.
  const displayHandle = workspace?.handle ?? creator.handle;
  const monetizationLevel = workspace?.monetizationLevel ?? 2;
  const walletBalanceBrl = workspace ? Number(workspace.walletBalanceBrl) : 1935.4;
  const totalDonationsBrl = workspace ? Number(workspace.totalDonationsBrl) : 480;
  const monthlyMembersCount = workspace ? workspace.monthlyMembersCount : null;
  const activeMissions = workspace?.missions ?? [];

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingCover(true);
    setPublishErrorMsg(null);
    try {
      const res = await storageApi.uploadFile(file);
      setCoverUrl(res.url);
    } catch (err: any) {
      setPublishErrorMsg(err.message || 'Erro no upload da capa.');
    } finally {
      setIsUploadingCover(false);
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingBanner(true);
    setPublishErrorMsg(null);
    try {
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
        });
        workId = workRes.workId;
        if (!workId) {
          throw new Error('O servidor não retornou o identificador da obra criada.');
        }
        setDraftWorkId(workId);
      }

      // 2. Se houver páginas enviadas, publicar capítulo 1 imediatamente
      if (chapterPages.length > 0) {
        await workApi.createChapter(workId, {
          chapterNumber: 1,
          title: 'Capítulo 1: O Começo',
          pages: chapterPages,
          publicReleaseAt: toBackendLocalDateTime(),
        });
      }

      setPublishSuccessMsg(`Obra "${newWorkTitle}" criada com sucesso.`);
      setNewWorkTitle('');
      setNewWorkSynopsis('');
      setCoverUrl('');
      setBannerUrl('');
      setChapterPages([]);
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
      await creatorApi.updateProfile({ name: profileName, bio });
      if (Number.isFinite(membershipPrice)) {
        await creatorApi.updateMembershipPrice(membershipPrice);
      }
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2500);
    } catch {
      // Sem sessão de criador (demo): mantém o feedback local sem afirmar persistência no servidor.
      setSaveError('Não foi possível salvar no servidor — painel em modo demonstração.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mn-container py-8 space-y-10 select-none pb-24">
      
      {/* 1. Aviso Mandatório Anti-Pirataria em Caixa de Carimbo */}
      <div className="border-2 border-[#E8402F] bg-[#E8402F]/10 p-5 space-y-2">
        <div className="flex items-center gap-2">
          <ShieldAlert size={18} className="text-[#E8402F]" />
          <h2 className="font-display text-lg text-[#E8402F] uppercase tracking-wide">
            AVISO MANDATÓRIO: AUTORIA ORIGINAL E TOLERÂNCIA ZERO À PIRATARIA
          </h2>
        </div>
        <p className="font-body text-xs text-[#F4EFE3] leading-relaxed">
          É <strong>estritamente proibido</strong> upar obras de terceiros, scans, mangás comerciais existentes (como Bleach, Naruto, One Piece) ou traduções não autorizadas. Infratores sofrerão <strong>remoção imediata da obra e suspensão/banimento permanente da conta</strong> nos termos do Art. 184 do Código Penal. Proibido conteúdo pornográfico explícito ou hentai.
        </p>
      </div>

      {workspaceError && (
        <div className="border-2 border-[#34343A] bg-[#151517] p-3">
          <span className="font-body text-xs text-[#A9A59A]">{workspaceError}</span>
        </div>
      )}

      {/* 2. Topo do Painel: Season 01, Patches e XP */}
      <div className="border-2 border-[#34343A] bg-[#151517] shadow-[6px_6px_0_#F4EFE3] p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b-2 border-[#34343A] pb-6">
          <div className="flex items-center gap-4">
            <div className="p-1 bg-[#F4EFE3] border-2 border-[#0B0B0C] shadow-[3px_3px_0_#FFD400]">
              <img
                src={avatarPreview}
                alt={profileName}
                className="w-16 h-16 object-cover border border-[#0B0B0C]"
              />
            </div>

            <div>
              <span className="font-pixel text-[11px] text-[#FFD400] tracking-widest block uppercase font-bold">
                PAINEL DO AUTOR · SEASON 01
              </span>
              <h1 className="font-display text-3xl sm:text-4xl text-[#F4EFE3] uppercase">
                {profileName}
              </h1>
              <span className="font-body text-xs text-[#A9A59A]">
                @{displayHandle} · Faltam 23 dias para o fim da temporada
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
            </div>

            <div className="w-full md:w-80">
              <XpBar value={340} max={500} />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Grade com Janelas Retrô: Quests Semanais + Ganhos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        
        {/* Janela de Missões Semanais */}
        <Win title="QUEST_SEMANAL.EXE">
          <div className="space-y-4">
            <div className="border-b border-[#34343A] pb-2">
              <span className="font-pixel text-xs text-[#FFD400]">
                MISSÕES ATIVAS (SEMANA 03)
              </span>
            </div>

            {activeMissions.length > 0 && (
              <div className="space-y-3">
                {activeMissions.map((mission) => (
                  <div
                    key={mission.id}
                    className={`p-3 border-2 space-y-1 ${
                      mission.completed
                        ? 'border-[#0B0B0C] bg-[#0B0B0C]'
                        : 'border-[#34343A] bg-[#151517]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-display text-sm text-[#F4EFE3] uppercase">
                        {mission.title}
                      </span>
                      {mission.completed ? (
                        <Check size={16} className="text-[#FFD400]" />
                      ) : (
                        <span className="font-pixel text-[10px] text-[#A9A59A]">EM PROGRESSO</span>
                      )}
                    </div>
                    {mission.description && (
                      <p className="font-body text-xs text-[#A9A59A]">{mission.description}</p>
                    )}
                    <span className="font-pixel text-[10px] text-[#FFD400] block mt-1">
                      PROGRESSO: {mission.currentProgress}/{mission.targetGoal}
                    </span>
                    {mission.boostRewardMultiplier ? (
                      <span className="font-pixel text-[10px] text-[#FFD400] block">
                        RECOMPENSA: +{Math.round((mission.boostRewardMultiplier - 1) * 100)}% DESCOBERTA
                        NO FEED POR {mission.boostDurationHours ?? 48}H
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
            )}

            {/* Fallback de demonstração quando o servidor não devolve missões (sem sessão de criador). */}
            {activeMissions.length === 0 && (
            <div className="space-y-3">
              <div className="p-3 border-2 border-[#0B0B0C] bg-[#0B0B0C] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-display text-sm text-[#F4EFE3] uppercase">
                    1. CONSISTÊNCIA DE LANÇAMENTO
                  </span>
                  <Check size={16} className="text-[#FFD400]" />
                </div>
                <p className="font-body text-xs text-[#A9A59A]">
                  Publicar ao menos 1 capítulo novo nesta semana.
                </p>
                <span className="font-pixel text-[10px] text-[#FFD400] block mt-1">
                  RECOMPENSA: +15% DESCOBERTA NO FEED POR 48H
                </span>
              </div>

              <div className="p-3 border-2 border-[#34343A] bg-[#151517] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-display text-sm text-[#F4EFE3] uppercase">
                    2. DIÁLOGO COM A COMUNIDADE
                  </span>
                  <span className="font-pixel text-[10px] text-[#A9A59A]">EM PROGRESSO</span>
                </div>
                <p className="font-body text-xs text-[#A9A59A]">
                  Responder 5 comentários de leitores nas suas obras.
                </p>
                <span className="font-pixel text-[10px] text-[#A9A59A] block mt-1">
                  PROGRESSO: 3/5 COMENTÁRIOS
                </span>
              </div>

              <div className="p-3 border-2 border-[#34343A] bg-[#151517] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-display text-sm text-[#F4EFE3] uppercase">
                    3. RETENÇÃO DO LEITOR
                  </span>
                  <span className="font-pixel text-[10px] text-[#A9A59A]">BLOQUEADO</span>
                </div>
                <p className="font-body text-xs text-[#A9A59A]">
                  Alcançar 1.000 leituras completas em capítulos gratuitos.
                </p>
              </div>
            </div>
            )}
          </div>
        </Win>

        {/* Janela de Ganhos Financeiros Transparentes */}
        <Win title="GANHOS.EXE">
          <div className="space-y-4">
            <div className="border-b border-[#34343A] pb-2">
              <span className="font-pixel text-xs text-[#FFD400]">
                DIVISÃO FINANCEIRA REAL (SERVIDOR)
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-[#0B0B0C] border border-[#34343A]">
                <span className="font-body text-xs text-[#A9A59A]">DOAÇÕES DIRETAS PIX RECEBIDAS</span>
                <span className="font-display text-lg text-[#FFD400] tabular-nums">
                  {formatBrl(totalDonationsBrl)}
                </span>
              </div>

              <div className="flex justify-between items-center p-3 bg-[#0B0B0C] border border-[#34343A]">
                <span className="font-body text-xs text-[#A9A59A]">MEMBROS ATIVOS NO CLUBE</span>
                <span className="font-display text-lg text-[#FFD400] tabular-nums">
                  {monthlyMembersCount ?? '—'}
                </span>
              </div>

              <div className="flex justify-between items-center p-3 bg-[#0B0B0C] border border-[#34343A]">
                <span className="font-body text-xs text-[#A9A59A]">PREÇO DA ASSINATURA MENSAL</span>
                <span className="font-display text-lg text-[#FFD400] tabular-nums">
                  {formatBrl(membershipPrice)}
                </span>
              </div>

              <div className="p-3 border-2 border-[#FFD400] bg-[#FFD400] text-[#0B0B0C] flex justify-between items-center">
                <span className="font-display text-sm uppercase">SALDO DISPONÍVEL PARA SAQUE</span>
                <span className="font-display text-2xl tabular-nums">
                  {formatBrl(walletBalanceBrl)}
                </span>
              </div>
            </div>

            {workspace?.hasActiveBoost && (
              <span className="font-pixel text-[10px] text-[#3DDC84] block">
                BOOST ATIVO: {workspace.engagementBoostMul.toFixed(1)}x NO FEED DE DESCOBERTA
              </span>
            )}

            <p className="font-body text-[11px] text-[#A9A59A] leading-relaxed pt-1">
              * Taxa padrão de 17% retida para infraestrutura e servidores. Ao alcançar o Nível 4 na Season, a taxa cai para 10% por 15 dias.
            </p>
          </div>
        </Win>

      </div>

      {/* 4. Formulário de Publicação Real de Nova Obra e Páginas (Fase 7) */}
      <section className="border-2 border-[#FFD400] bg-[#151517] p-6 sm:p-8 space-y-6 shadow-[6px_6px_0_#FFD400]">
        <div>
          <span className="font-pixel text-[11px] text-[#FFD400] uppercase tracking-widest font-bold block mb-1">
            ESTÚDIO EDITORIAL DO AUTOR
          </span>
          <h2 className="font-display text-3xl text-[#F4EFE3] uppercase">
            PUBLICAR NOVA OBRA ORIGINAL
          </h2>
          <p className="font-body text-xs text-[#A9A59A] mt-0.5">
            Cadastre seu mangá no catálogo e alimente o feed de recomendações instantaneamente.
          </p>
        </div>

        {publishSuccessMsg && (
          <div className="p-4 bg-[#3DDC84] text-[#0B0B0C] border-2 border-[#0B0B0C] font-display text-sm uppercase flex items-center gap-2">
            <CheckCircle2 size={18} />
            <span>{publishSuccessMsg}</span>
          </div>
        )}

        {publishErrorMsg && (
          <div className="p-4 bg-[#E63946] text-[#FFFFFF] border-2 border-[#0B0B0C] font-body text-xs flex items-center gap-2">
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
              <label className="font-body text-sm font-semibold text-[#F4EFE3] block mb-1.5">
                GÊNERO PRINCIPAL
              </label>
              <select
                value={newWorkGenres[0] || 'ACAO'}
                onChange={(e) => setNewWorkGenres([e.target.value])}
                className="w-full p-2.5 bg-[#0B0B0C] text-[#F4EFE3] border-2 border-[#34343A] font-body text-xs focus:border-[#FFD400] outline-none"
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
            <label className="font-body text-sm font-semibold text-[#F4EFE3] block">
              SINOPSE EDITORIAL
            </label>
            <textarea
              placeholder="Descreva o enredo da sua obra para atrair novos leitores..."
              value={newWorkSynopsis}
              onChange={(e) => setNewWorkSynopsis(e.target.value)}
              rows={3}
              className="w-full p-3 bg-[#0B0B0C] text-[#F4EFE3] font-body text-sm border-2 border-[#34343A] focus:border-[#FFD400] outline-none resize-none"
            />
          </div>

          {/* Uploads de Capa e Banner */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Capa 2:3 */}
            <div className="p-4 border-2 border-dashed border-[#34343A] bg-[#0B0B0C] space-y-3 text-center">
              <span className="font-pixel text-xs text-[#FFD400] uppercase block">
                CAPA VERTICAL (PROPORÇÃO 2:3)
              </span>
              {coverUrl ? (
                <div className="flex flex-col items-center gap-2">
                  <img src={coverUrl} alt="Preview da Capa" className="w-24 h-36 object-cover border-2 border-[#FFD400]" />
                  <span className="font-pixel text-[10px] text-[#3DDC84]">CAPA PRONTA</span>
                </div>
              ) : (
                <div className="py-4 space-y-2">
                  <Image size={28} className="mx-auto text-[#A9A59A]" />
                  <p className="font-body text-xs text-[#A9A59A]">JPEG, PNG ou WebP (Máx 15MB)</p>
                </div>
              )}
              <label className="inline-block px-4 py-2 bg-[#151517] border-2 border-[#34343A] hover:border-[#FFD400] text-[#F4EFE3] font-pixel text-xs uppercase cursor-pointer transition-colors">
                <Upload size={14} className="inline mr-1.5" />
                {isUploadingCover ? 'ENVIANDO...' : 'SELECIONAR CAPA'}
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleCoverUpload} className="hidden" />
              </label>
            </div>

            {/* Banner 16:9 */}
            <div className="p-4 border-2 border-dashed border-[#34343A] bg-[#0B0B0C] space-y-3 text-center">
              <span className="font-pixel text-xs text-[#FFD400] uppercase block">
                BANNER ILUSTRADO (16:9 - OPCIONAL)
              </span>
              {bannerUrl ? (
                <div className="flex flex-col items-center gap-2">
                  <img src={bannerUrl} alt="Preview do Banner" className="w-48 h-24 object-cover border-2 border-[#FFD400]" />
                  <span className="font-pixel text-[10px] text-[#3DDC84]">BANNER PRONTO</span>
                </div>
              ) : (
                <div className="py-4 space-y-2">
                  <Image size={28} className="mx-auto text-[#A9A59A]" />
                  <p className="font-body text-xs text-[#A9A59A]">Arte horizontal para fundo da obra</p>
                </div>
              )}
              <label className="inline-block px-4 py-2 bg-[#151517] border-2 border-[#34343A] hover:border-[#FFD400] text-[#F4EFE3] font-pixel text-xs uppercase cursor-pointer transition-colors">
                <Upload size={14} className="inline mr-1.5" />
                {isUploadingBanner ? 'ENVIANDO...' : 'SELECIONAR BANNER'}
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleBannerUpload} className="hidden" />
              </label>
            </div>
          </div>

          {/* Upload de Páginas do Capítulo 1 */}
          <div className="p-4 border-2 border-[#34343A] bg-[#0B0B0C] space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="font-pixel text-xs text-[#FFD400] uppercase block">
                  PÁGINAS DO CAPÍTULO 1 (UPLOAD EM LOTE)
                </span>
                <span className="font-body text-xs text-[#A9A59A]">
                  Selecione os arquivos de imagem ordenados das páginas do mangá.
                </span>
              </div>
              <label className="px-4 py-2 bg-[#FFD400] text-[#0B0B0C] border-2 border-[#0B0B0C] font-pixel text-xs uppercase cursor-pointer hover:bg-[#E0B800] transition-colors shrink-0">
                <FileText size={14} className="inline mr-1.5" />
                {isUploadingPages ? 'ENVIANDO PÁGINAS...' : `UPAR PÁGINAS (${chapterPages.length})`}
                <input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={handlePagesUpload} className="hidden" />
              </label>
            </div>

            {chapterPages.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2 border-t border-[#34343A]">
                {chapterPages.map((page, idx) => (
                  <div key={idx} className="relative p-1 bg-[#151517] border border-[#34343A] text-center">
                    <span className="font-pixel text-[9px] text-[#FFD400] block mb-1">PÁG. {idx + 1}</span>
                    <img src={page} alt={`Página ${idx + 1}`} className="w-12 h-16 object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>

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

      {/* 5. Formulário de Perfil do Autor com Declaração de Autoria */}
      <form onSubmit={handleSave} className="border-2 border-[#34343A] bg-[#151517] p-6 sm:p-8 space-y-6">
        <div>
          <h2 className="font-display text-2xl text-[#F4EFE3] uppercase">
            CONFIGURAÇÕES DO CRIADOR
          </h2>
          <p className="font-body text-xs text-[#A9A59A] mt-0.5">
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
            value={membershipPrice}
            onChange={(e) => setMembershipPrice(Number(e.target.value))}
            helperText="Preço cobrado dos leitores para acesso antecipado"
          />
        </div>

        <div className="space-y-1.5">
          <label className="font-body text-sm font-semibold text-[#F4EFE3] block">
            BIOGRAFIA EDITORIAL
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            className="w-full p-3 bg-[#151517] text-[#F4EFE3] font-body text-sm border-2 border-[#34343A] focus:border-[#F4EFE3] focus:shadow-[3px_3px_0_#FFD400] outline-none"
          />
        </div>

        {/* Declaração de Autoria Original Obrigatória (Seção 8.9) */}
        <div className="p-4 border-2 border-[#FFD400] bg-[#0B0B0C] space-y-2">
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={declaredOriginal}
              onChange={(e) => setDeclaredOriginal(e.target.checked)}
              className="mt-1 w-5 h-5 accent-[#FFD400] cursor-pointer"
            />
            <span className="font-display text-sm text-[#F4EFE3] uppercase leading-snug">
              DECLARO QUE TODAS AS OBRAS E CAPÍTULOS PUBLICADOS NESTA CONTA SÃO
              DE MINHA AUTORIA ORIGINAL E NÃO VIOLAM DIREITOS DE TERCEIROS.
            </span>
          </label>
          <span className="font-body text-[11px] text-[#A9A59A] block pl-8">
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
            <span className="font-pixel text-xs text-[#3DDC84] flex items-center gap-1">
              <Check size={14} /> SALVO NO SERVIDOR
            </span>
          )}

          {saveError && <span className="font-body text-xs text-[#E8402F]">{saveError}</span>}
        </div>
      </form>

    </div>
  );
}

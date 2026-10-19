import { useState, useMemo, useEffect } from 'react';
import { 
  ArrowUpDown, 
  Heart, 
  Flag,
  Calendar,
  Sparkles,
  Download,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { Work, Chapter, Creator } from '../types';
import { MOCK_CHAPTERS, MOCK_CREATORS } from '../data/mockData';
import { workApi, AuthorSummaryDto } from '../api/workApi';
import { mapChapterSummary } from '../utils/apiMappers';
import { useAuth } from '../context/AuthContext';
import { useModals } from '../context/ModalContext';
import { isChapterEarlyAccess } from '../utils/discoveryAlgorithm';
import { Cover } from '../components/ui/Cover';
import { Button } from '../components/ui/Button';
import { Sticker } from '../components/ui/Sticker';
import { offlineStorage } from '../services/offlineStorage';

interface WorkDetailPageProps {
  work: Work;
  onBackToCatalog: () => void;
  onOpenChapter: (work: Work, chapter: Chapter) => void;
}

export function WorkDetailPage({
  work,
  onBackToCatalog,
  onOpenChapter,
}: WorkDetailPageProps) {
  const { user, toggleFavorite, isMemberOf } = useAuth();
  const { openEarlyAccess, openDonate, openMembership, openReport, openVip } = useModals();

  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [downloadingChapterId, setDownloadingChapterId] = useState<string | null>(null);
  const [offlineChapterIds, setOfflineChapterIds] = useState<Set<string>>(() =>
    new Set(offlineStorage.getOfflineChapters().map((c) => c.chapterId))
  );

  useEffect(() => {
    const handleUpdate = () => {
      setOfflineChapterIds(new Set(offlineStorage.getOfflineChapters().map((c) => c.chapterId)));
    };
    window.addEventListener('offline-storage-updated', handleUpdate);
    return () => window.removeEventListener('offline-storage-updated', handleUpdate);
  }, []);

  const handleDownloadOffline = async (e: React.MouseEvent, chapter: Chapter) => {
    e.stopPropagation();
    if (!user?.isVip) {
      openVip();
      return;
    }
    if (offlineChapterIds.has(chapter.id)) {
      if (window.confirm(`Deseja remover o capítulo #${chapter.number} do armazenamento offline?`)) {
        await offlineStorage.removeOfflineChapter(chapter.id);
      }
      return;
    }
    try {
      setDownloadingChapterId(chapter.id);
      await offlineStorage.downloadChapterOffline(chapter.id, work.id);
    } catch (err: any) {
      alert(err?.message || 'Falha ao baixar capítulo para leitura offline.');
    } finally {
      setDownloadingChapterId(null);
    }
  };

  // Dados reais da obra vindos da API (fallback para mock quando indisponível).
  const [realChapters, setRealChapters] = useState<Chapter[] | null>(null);
  const [apiAuthor, setApiAuthor] = useState<AuthorSummaryDto | null>(null);

  useEffect(() => {
    let active = true;
    setRealChapters(null);
    setApiAuthor(null);

    workApi
      .getWorkBySlug(work.slug)
      .then((dto) => {
        if (!active) return;
        setApiAuthor(dto.author ?? null);
        if (Array.isArray(dto.chapters) && dto.chapters.length > 0) {
          setRealChapters(dto.chapters.map((c) => mapChapterSummary(c, dto.id)));
        }
      })
      .catch(() => {
        // Mantém capítulos/autor mock se a API falhar (obra não persistida no banco).
      });

    return () => {
      active = false;
    };
  }, [work.slug]);

  const isFavorited = user.favorites.includes(work.id);
  const mockCreator = MOCK_CREATORS[work.authorId] || Object.values(MOCK_CREATORS)[0];
  // Prefere o autor real da API (evita atribuir doações a um criador mock).
  const creator: Creator = apiAuthor
    ? {
        ...mockCreator,
        id: apiAuthor.authorId,
        name: apiAuthor.authorName,
        handle: apiAuthor.authorHandle.replace(/^@/, ''),
        avatarUrl: apiAuthor.authorAvatarUrl || mockCreator.avatarUrl,
        membershipPriceBrl: apiAuthor.membershipPriceBrl ?? mockCreator.membershipPriceBrl,
      }
    : mockCreator;

  // Capítulos desta obra: reais (API) quando houver, senão mock.
  const chapters = useMemo(() => {
    const source =
      realChapters && realChapters.length > 0
        ? realChapters
        : (() => {
            const list = MOCK_CHAPTERS.filter((c) => c.workId === work.id);
            return list.length > 0 ? list : MOCK_CHAPTERS.slice(0, 3);
          })();
    const sorted = [...source];
    sorted.sort((a, b) => (sortOrder === 'asc' ? a.number - b.number : b.number - a.number));
    return sorted;
  }, [work.id, sortOrder, realChapters]);

  const firstChapter = chapters[0] || MOCK_CHAPTERS[0];

  const handleChapterClick = (chapter: Chapter) => {
    const isLocked = isChapterEarlyAccess(chapter) && !isMemberOf(work.authorId);
    if (isLocked) {
      if (creator) {
        openEarlyAccess(chapter, creator, work);
        return;
      }
    }
    onOpenChapter(work, chapter);
  };

  return (
    <div className="mn-container py-6 space-y-8 select-none">
      
      {/* 1. Breadcrumbs Oficiais */}
      <nav className="flex items-center gap-2 font-pixel text-[12px] text-[#A9A59A] uppercase tracking-wider">
        <button
          type="button"
          onClick={onBackToCatalog}
          className="hover:text-[#FFD400] transition-colors"
        >
          INÍCIO
        </button>
        <span>&gt;</span>
        <button
          type="button"
          onClick={onBackToCatalog}
          className="hover:text-[#FFD400] transition-colors"
        >
          CATÁLOGO
        </button>
        <span>&gt;</span>
        <span className="text-[#F4EFE3] font-bold truncate max-w-xs">{work.title}</span>
      </nav>

      {/* 2. Hero da Obra com Banner de Arte ao Fundo (Manga Plus / MangaTeofilo) */}
      <section className="border-2 border-[#34343A] bg-[#151517] shadow-[6px_6px_0_#F4EFE3] p-6 sm:p-8 relative overflow-hidden">
        {/* Banner Horizontal de Arte Ilustrada ao Fundo */}
        {work.bannerUrl && (
          <div
            className="absolute inset-0 bg-cover bg-center opacity-30 pointer-events-none filter saturate-125"
            style={{ backgroundImage: `url(${work.bannerUrl})` }}
          />
        )}
        {/* Scrim Gradiente Nanquim */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#151517] via-[#151517]/90 to-[#151517]/40 pointer-events-none" />

        <div className="flex flex-col md:flex-row gap-8 items-start relative z-10">
          
          {/* Capa Vertical 2:3 */}
          <div className="w-52 sm:w-60 shrink-0 mx-auto md:mx-0">
            <Cover
              src={work.coverUrl}
              title={work.title}
              aspectRatio="2/3"
              dropShadow={true}
              className="w-full"
            />
          </div>

          {/* Dados da Obra */}
          <div className="flex-1 space-y-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="font-pixel text-[12px] text-[#FFD400] font-bold tracking-widest uppercase">
                  OBRA NACIONAL ORIGINAL
                </span>
                {work.status === 'completed' && <Sticker kind="complete" />}
              </div>

              <h1 className="font-display text-4xl sm:text-5xl md:text-6xl text-[#F4EFE3] leading-[1.08] pt-1 uppercase tracking-tight">
                {work.title}
              </h1>

              <p className="font-body text-sm text-[#A9A59A] mt-1.5">
                Criado por{' '}
                <strong className="text-[#FFD400] font-semibold">{work.authorName}</strong>
              </p>
            </div>

            {/* Chips de Gênero */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {work.genres.map((genre) => (
                <span
                  key={genre}
                  className="px-2.5 py-0.5 bg-[#0B0B0C] border border-[#34343A] text-[#F4EFE3] font-pixel text-[12px] uppercase tracking-wider"
                >
                  {genre}
                </span>
              ))}
            </div>

            {/* Sinopse Editorial */}
            <div className="pt-2 border-t border-[#34343A]">
              <span className="font-pixel text-[12px] text-[#A9A59A] tracking-wider uppercase block mb-1">
                SINOPSE
              </span>
              <p className="font-body text-sm text-[#F4EFE3] leading-relaxed max-w-2xl">
                {work.synopsis}
              </p>
            </div>

            {/* Botões de Ação */}
            <div className="flex flex-wrap items-center gap-3 pt-4">
              <Button
                variant="primary"
                onClick={() => firstChapter && handleChapterClick(firstChapter)}
                className="!text-lg !px-6"
              >
                LER DO COMEÇO
              </Button>

              <button
                type="button"
                onClick={() => toggleFavorite(work.id)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 font-display text-base uppercase border-2 transition-all ${
                  isFavorited
                    ? 'bg-[#FFD400] text-[#0B0B0C] border-[#0B0B0C] shadow-[3px_3px_0_#F4EFE3]'
                    : 'bg-[#0B0B0C] text-[#F4EFE3] border-[#34343A] hover:border-[#FFD400]'
                }`}
              >
                <Heart size={16} className={isFavorited ? 'fill-[#0B0B0C]' : ''} />
                <span>{isFavorited ? 'FAVORITADO' : '+ FAVORITAR'}</span>
              </button>

              {creator && (
                <Button
                  variant="secondary"
                  onClick={() => openDonate(creator.id, creator.name, work.title, work.id)}
                  className="!text-sm"
                >
                  APOIAR AUTOR
                </Button>
              )}
            </div>

          </div>

        </div>
      </section>

      {/* 3. Grade de Conteúdo: Lista de Capítulos (Linhas) + Sidebar do Autor */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 items-start">
        
        {/* Coluna Principal: Capítulos */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b-2 border-[#34343A] pb-3">
            <h2 className="font-display text-2xl sm:text-3xl text-[#F4EFE3] uppercase tracking-wide">
              LISTA DE CAPÍTULOS
            </h2>

            <button
              type="button"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="flex items-center gap-1.5 font-pixel text-[12px] text-[#FFD400] hover:underline"
            >
              <ArrowUpDown size={12} />
              <span>{sortOrder === 'asc' ? 'CRESCENTE' : 'DECRESCENTE'}</span>
            </button>
          </div>

          <div className="border-t-2 border-[#34343A]">
            {chapters.map((chap) => {
              const isLocked = isChapterEarlyAccess(chap) && !isMemberOf(work.authorId);

              return (
                <div
                  key={chap.id}
                  onClick={() => handleChapterClick(chap)}
                  className="flex items-center justify-between p-3.5 border-b border-[#34343A] hover:bg-[#151517] cursor-pointer group transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <span className="font-display text-2xl text-[#FFD400] tracking-tight w-12 text-center shrink-0">
                      #{chap.number < 10 ? `0${chap.number}` : chap.number}
                    </span>

                    <div>
                      <h4 className="font-display text-lg text-[#F4EFE3] group-hover:text-[#FFD400] transition-colors uppercase">
                        {chap.title}
                      </h4>
                      <p className="font-body text-xs text-[#A9A59A] tabular-nums">
                        Publicado em {chap.createdAt || 'abr. 2026'} · {chap.pages?.length || 24} págs
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Botão de Download / Indicador Offline VIP */}
                    <button
                      type="button"
                      onClick={(e) => handleDownloadOffline(e, chap)}
                      title={
                        offlineChapterIds.has(chap.id)
                          ? 'Capítulo salvo para leitura offline (Clique para remover)'
                          : user?.isVip
                          ? 'Baixar capítulo para leitura offline'
                          : 'Recurso exclusivo para assinantes VIP MangaNetWorking'
                      }
                      className={`p-1.5 border transition-all flex items-center gap-1.5 text-[11px] font-pixel uppercase ${
                        offlineChapterIds.has(chap.id)
                          ? 'border-[#3DDC84] bg-[#3DDC84]/10 text-[#3DDC84]'
                          : 'border-[#34343A] text-[#A9A59A] hover:border-[#FFD400] hover:text-[#FFD400]'
                      }`}
                    >
                      {downloadingChapterId === chap.id ? (
                        <Loader2 size={13} className="animate-spin text-[#FFD400]" />
                      ) : offlineChapterIds.has(chap.id) ? (
                        <>
                          <CheckCircle2 size={13} />
                          <span className="hidden sm:inline">OFFLINE</span>
                        </>
                      ) : (
                        <>
                          <Download size={13} />
                          <span className="hidden sm:inline">BAIXAR</span>
                        </>
                      )}
                    </button>

                    {isLocked ? (
                      <Sticker kind="members" />
                    ) : (
                      <span className="font-pixel text-[12px] text-[#A9A59A] group-hover:text-[#FFD400]">
                        LER →
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Botão de Denúncia Discreto (Seção 8.11) */}
          <div className="pt-4 flex justify-end">
            <button
              type="button"
              onClick={() => openReport(work.id, work.title)}
              className="inline-flex items-center gap-1.5 font-body text-xs text-[#A9A59A] hover:text-[#E8402F] transition-colors"
            >
              <Flag size={13} />
              <span>DENUNCIAR ESTA OBRA</span>
            </button>
          </div>
        </section>

        {/* Sidebar: Card de Apoio ao Criador & Atualização */}
        <aside className="space-y-6">
          {creator && (
            <div className="border-2 border-[#34343A] bg-[#151517] p-5 space-y-4">
              <span className="font-pixel text-[12px] text-[#FFD400] tracking-wider uppercase block font-bold">
                SOBRE O CRIADOR
              </span>

              <div className="flex items-center gap-3">
                <img
                  src={creator.avatarUrl}
                  alt={creator.name}
                  className="w-12 h-12 object-cover border-2 border-[#0B0B0C] shadow-[2px_2px_0_#FFD400]"
                />
                <div>
                  <h4 className="font-display text-lg text-[#F4EFE3] uppercase">
                    {creator.name}
                  </h4>
                  <span className="font-body text-xs text-[#A9A59A]">
                    @{creator.handle.replace(/^@/, '')}
                  </span>
                </div>
              </div>

              <p className="font-body text-xs text-[#F4EFE3] leading-relaxed">
                {creator.bio}
              </p>

              <div className="pt-2 border-t border-[#34343A] flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={() => openMembership(creator)}
                  className="w-full py-2.5 bg-[#FFD400] text-[#0B0B0C] border-2 border-[#0B0B0C] font-display text-sm sm:text-base tracking-wider uppercase shadow-[3px_3px_0_#0B0B0C] hover:bg-[#E0B800] transition-colors flex items-center justify-center gap-1.5"
                >
                  <Sparkles size={16} />
                  <span>VIRAR MEMBRO (R$ {creator.membershipPriceBrl.toFixed(2)}/mês)</span>
                </button>

                <Button
                  variant="secondary"
                  onClick={() => openDonate(creator.id, creator.name, work.title, work.id)}
                  className="w-full !min-h-[44px] !text-sm !py-2.5 font-display tracking-wider uppercase"
                >
                  DOAR QUALQUER VALOR
                </Button>
              </div>
            </div>
          )}

          <div className="border-2 border-[#34343A] bg-[#151517] p-5 space-y-2">
            <span className="font-pixel text-[12px] text-[#A9A59A] tracking-wider uppercase block">
              CRONOGRAMA EDITORIAL
            </span>
            <div className="flex items-center gap-2 text-xs font-body text-[#F4EFE3]">
              <Calendar size={14} className="text-[#FFD400]" />
              <span>Capítulos novos toda sexta-feira às 18h.</span>
            </div>
          </div>
        </aside>

      </div>

    </div>
  );
}

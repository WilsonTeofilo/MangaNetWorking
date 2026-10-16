import { useState } from 'react';
import { MOCK_WORKS, MOCK_CHAPTERS, MOCK_CREATORS } from '../data/mockData';
import { isChapterEarlyAccess } from '../utils/discoveryAlgorithm';
import { useAuth } from '../context/AuthContext';
import { useModals } from '../context/ModalContext';
import { Work, Chapter } from '../types';
import { Button } from '../components/ui/Button';
import { Win } from '../components/ui/Win';
import { Sticker } from '../components/ui/Sticker';
import { Cover } from '../components/ui/Cover';
import { WorkCard } from '../components/ui/WorkCard';
import { RankRow } from '../components/ui/RankRow';
import { Marquee } from '../components/ui/Marquee';
import { LevelPatch } from '../components/ui/LevelPatch';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';

interface HomePageProps {
  onSelectWork: (work: Work) => void;
  onOpenChapter: (work: Work, chapter: Chapter) => void;
  onNavigateToCatalog?: () => void;
}

export function HomePage({
  onSelectWork,
  onOpenChapter,
  onNavigateToCatalog,
}: HomePageProps) {
  const { user, isMemberOf } = useAuth();
  const { openEarlyAccess } = useModals();

  const [heroIndex, setHeroIndex] = useState(0);

  // Obras em destaque para o Hero
  const heroWorks = MOCK_WORKS.slice(0, 4);
  const currentHero = heroWorks[heroIndex % heroWorks.length] || MOCK_WORKS[0];

  // Ranking Top 5 (Em Alta Agora)
  const trendingRanking = [...MOCK_WORKS]
    .sort((a, b) => b.totalViews + b.totalLikes * 10 - (a.totalViews + a.totalLikes * 10))
    .slice(0, 5);

  const handleReadNow = (work: Work) => {
    const chapters = work.chapters || MOCK_CHAPTERS.filter((c) => c.workId === work.id);
    const firstChapter = chapters[0] || MOCK_CHAPTERS[0];
    if (firstChapter) {
      const isLocked = isChapterEarlyAccess(firstChapter) && !isMemberOf(work.authorId);
      if (isLocked) {
        const creator = MOCK_CREATORS[work.authorId];
        if (creator) {
          openEarlyAccess(firstChapter, creator, work);
          return;
        }
      }
      onOpenChapter(work, firstChapter);
    } else {
      onSelectWork(work);
    }
  };

  // Simulação de último lido para a seção "Continuar Lendo"
  const lastReadWork = MOCK_WORKS[0];
  const lastReadChapter =
    MOCK_CHAPTERS.find((c) => c.workId === lastReadWork.id) || MOCK_CHAPTERS[0];

  return (
    <div className="w-full space-y-12 select-none pb-12">
      
      {/* 1. HERO OFICIAL (Bloco Amarelo #FFD400, .mn-cut, .mn-halftone, .mn-grain) */}
      <section className="relative w-full bg-[#FFD400] text-[#0B0B0C] border-b-2 border-[#0B0B0C] mn-grain mn-cut pt-10 pb-16 overflow-hidden">
        <div className="absolute inset-0 mn-halftone pointer-events-none opacity-20" />
        
        {/* Faixa decorativa no fundo do Hero */}
        <div className="absolute top-0 right-0 w-80 h-full mn-stripes opacity-15 pointer-events-none" />

        <div className="mn-container relative z-10 grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-8 items-center">
          
          {/* Lado Esquerdo: Selo, Título Monumental, Sinopse e Botões */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Sticker kind="new" label="DESTAQUE AGORA" rotate={-2} />
              <span className="font-pixel text-xs tracking-wider text-[#0B0B0C] font-bold">
                POR {currentHero.authorName}
              </span>
            </div>

            <h1 className="font-display text-4xl sm:text-6xl md:text-7xl leading-[1.05] pt-1.5 uppercase text-[#0B0B0C] tracking-tight">
              {currentHero.title}
            </h1>

            <p className="font-body text-base sm:text-lg text-[#0B0B0C] line-clamp-3 leading-snug font-medium max-w-xl">
              {currentHero.synopsis}
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                type="button"
                onClick={() => handleReadNow(currentHero)}
                className="px-6 py-3 font-display text-lg tracking-wider uppercase bg-[#0B0B0C] text-[#FFD400] border-2 border-[#0B0B0C] shadow-[4px_4px_0_#F4EFE3] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_#F4EFE3] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer"
              >
                LER AGORA
              </button>

              <button
                type="button"
                onClick={() => onSelectWork(currentHero)}
                className="px-6 py-3 font-display text-lg tracking-wider uppercase bg-transparent text-[#0B0B0C] border-2 border-[#0B0B0C] shadow-[4px_4px_0_#0B0B0C] hover:bg-[rgba(11,11,12,0.08)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_#0B0B0C] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer"
              >
                VER OBRA
              </button>
            </div>

            {/* Controles do Carrossel Quadrados (Acessíveis) */}
            <div className="flex items-center gap-2 pt-4">
              {heroWorks.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setHeroIndex(idx)}
                  aria-label={`Destaque ${idx + 1}`}
                  className={`w-3.5 h-3.5 border-2 border-[#0B0B0C] transition-all ${
                    heroIndex === idx ? 'bg-[#0B0B0C]' : 'bg-transparent'
                  }`}
                />
              ))}
              <div className="flex gap-1 ml-3">
                <button
                  onClick={() => setHeroIndex((prev) => (prev - 1 + heroWorks.length) % heroWorks.length)}
                  className="w-7 h-7 border-2 border-[#0B0B0C] bg-[#FFD400] flex items-center justify-center font-bold hover:bg-[#0B0B0C] hover:text-[#FFD400] transition-colors"
                  aria-label="Anterior"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => setHeroIndex((prev) => (prev + 1) % heroWorks.length)}
                  className="w-7 h-7 border-2 border-[#0B0B0C] bg-[#FFD400] flex items-center justify-center font-bold hover:bg-[#0B0B0C] hover:text-[#FFD400] transition-colors"
                  aria-label="Próximo"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Lado Direito: Capa Vertical 2:3 com Rotação 2°, Borda 2px, Drop 8px */}
          <div className="relative flex justify-center lg:justify-end">
            {/* Recorte decorativo de mangá ao fundo */}
            <div className="absolute w-56 sm:w-64 aspect-[2/3] border-2 border-[#0B0B0C] bg-[#F4EFE3] -rotate-3 translate-x-4 translate-y-3 pointer-events-none opacity-80" />
            
            <div
              onClick={() => onSelectWork(currentHero)}
              className="relative w-56 sm:w-64 aspect-[2/3] border-2 border-[#0B0B0C] shadow-[8px_8px_0_#0B0B0C] rotate-2 hover:rotate-0 transition-transform duration-150 cursor-pointer overflow-hidden z-10"
            >
              <Cover
                src={currentHero.coverUrl}
                title={currentHero.title}
                aspectRatio="2/3"
                dropShadow={false}
              />
            </div>
          </div>

        </div>
      </section>

      {/* 2. FITA / TICKER MARQUEE */}
      <Marquee />

      <div className="mn-container space-y-12">
        
        {/* 3. EM ALTA AGORA (Top 5 com Numerais Gigantes) */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b-2 border-[#34343A] pb-3">
            <h2 className="font-display text-3xl sm:text-4xl text-[#F4EFE3] uppercase tracking-wide">
              EM ALTA AGORA
            </h2>
            {onNavigateToCatalog && (
              <button
                type="button"
                onClick={onNavigateToCatalog}
                className="flex items-center gap-1 font-pixel text-xs text-[#FFD400] hover:underline"
              >
                <span>VER TODOS</span>
                <ArrowRight size={13} />
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-2">
            {trendingRanking.map((work, idx) => (
              <RankRow
                key={work.id}
                rank={idx + 1}
                work={work}
                onSelect={onSelectWork}
              />
            ))}
          </div>
        </section>

        {/* 4. CONTINUAR LENDO (Uma única Janela Retrô <Win>) */}
        <section className="space-y-4 max-w-xl">
          <Win title="CONTINUAR_LENDO.EXE">
            <div className="flex items-center gap-4">
              <div className="w-12 h-[72px] shrink-0 border border-[#34343A]">
                <Cover
                  src={lastReadWork.coverUrl}
                  title={lastReadWork.title}
                  aspectRatio="2/3"
                  dropShadow={false}
                />
              </div>

              <div className="flex-1 min-w-0">
                <span className="font-pixel text-[10px] text-[#FFD400] block uppercase tracking-wider">
                  PAROU NA PÁG. 12
                </span>
                <h4 className="font-display text-lg text-[#F4EFE3] truncate uppercase">
                  {lastReadWork.title}
                </h4>
                <p className="font-body text-xs text-[#A9A59A]">
                  Capítulo #{lastReadChapter.number} — {lastReadChapter.title}
                </p>
              </div>

              <div className="shrink-0 flex flex-col gap-1.5">
                <Button
                  variant="primary"
                  onClick={() => onOpenChapter(lastReadWork, lastReadChapter)}
                  className="!min-h-[38px] !px-3.5 !text-sm"
                >
                  CONTINUAR
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => onSelectWork(lastReadWork)}
                  className="!text-xs !py-0.5"
                >
                  FICHA
                </Button>
              </div>
            </div>
          </Win>
        </section>

        {/* 5. NOVOS CAPÍTULOS (Grade Oficial com WorkCard 2:3) */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b-2 border-[#34343A] pb-3">
            <div>
              <h2 className="font-display text-3xl sm:text-4xl text-[#F4EFE3] uppercase tracking-wide">
                NOVOS CAPÍTULOS
              </h2>
              <span className="font-body text-xs text-[#A9A59A]">
                Lançamentos independentes publicados direto pelos criadores
              </span>
            </div>
            {onNavigateToCatalog && (
              <button
                type="button"
                onClick={onNavigateToCatalog}
                className="font-pixel text-xs text-[#FFD400] hover:underline"
              >
                CATÁLOGO COMPLETO →
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {MOCK_WORKS.slice(0, 8).map((work, idx) => (
              <WorkCard
                key={work.id}
                work={work}
                onSelect={onSelectWork}
                isFavorite={user.favorites.includes(work.id)}
                badges={idx === 0 ? ['new'] : idx === 1 ? ['members'] : []}
              />
            ))}
          </div>
        </section>

        {/* 6. SEASONS (Bloco Amarelo para Criadores com os 4 Patches) */}
        <section className="relative w-full bg-[#FFD400] text-[#0B0B0C] border-2 border-[#0B0B0C] shadow-[6px_6px_0_#F4EFE3] p-6 sm:p-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-2 border-[#0B0B0C] pb-4">
            <div>
              <span className="font-pixel text-xs tracking-wider text-[#0B0B0C] font-bold block">
                GAMIFICAÇÃO EDITORIAL
              </span>
              <h3 className="font-display text-3xl sm:text-4xl text-[#0B0B0C] uppercase">
                SEASON 01 · GUILDA DOS CRIADORES
              </h3>
              <p className="font-body text-xs sm:text-sm text-[#0B0B0C] font-medium mt-1">
                Suba de nível publicando capítulos com consistência e conquiste
                visibilidade no Feed sem intermediários.
              </p>
            </div>

            <Button
              variant="primary"
              onClick={onNavigateToCatalog}
              className="!bg-[#0B0B0C] !text-[#FFD400] !border-[#0B0B0C] !shadow-[4px_4px_0_#F4EFE3] hover:!shadow-[6px_6px_0_#F4EFE3] shrink-0"
            >
              VIRAR CRIADOR
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <LevelPatch level={1} isUnlocked={true} />
            <LevelPatch level={2} isUnlocked={true} />
            <LevelPatch level={3} isUnlocked={false} />
            <LevelPatch level={4} isUnlocked={false} />
          </div>
        </section>

      </div>
    </div>
  );
}

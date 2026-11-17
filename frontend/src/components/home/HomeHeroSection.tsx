import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Work } from '../../types';
import { FormatBadge } from '../ui/FormatBadge';
import { Cover } from '../ui/Cover';
import { CartoonTitle } from '../ui/CartoonTitle';

export interface HomeHeroSectionProps {
  currentHero: Work | null;
  heroWorks: Work[];
  heroIndex: number;
  onSetHeroIndex: (index: number | ((prev: number) => number)) => void;
  onReadNow: (work: Work) => void;
  onSelectWork: (work: Work) => void;
  onOpenAuthorProfile?: (authorUsername: string) => void;
  onNavigateToCatalog?: () => void;
}

export function HomeHeroSection({
  currentHero,
  heroWorks,
  heroIndex,
  onSetHeroIndex,
  onReadNow,
  onSelectWork,
  onOpenAuthorProfile,
  onNavigateToCatalog,
}: HomeHeroSectionProps) {
  const [direction, setDirection] = useState<'right' | 'left'>('right');

  // Avança slide automaticamente ou manualmente
  const handleNextSlide = useCallback(() => {
    if (heroWorks.length <= 1) return;
    setDirection('right');
    onSetHeroIndex((prev) => (prev + 1) % heroWorks.length);
  }, [heroWorks.length, onSetHeroIndex]);

  const handlePrevSlide = useCallback(() => {
    if (heroWorks.length <= 1) return;
    setDirection('left');
    onSetHeroIndex((prev) => (prev - 1 + heroWorks.length) % heroWorks.length);
  }, [heroWorks.length, onSetHeroIndex]);

  const handleSelectIndex = useCallback(
    (idx: number) => {
      setDirection(idx >= heroIndex ? 'right' : 'left');
      onSetHeroIndex(idx);
    },
    [heroIndex, onSetHeroIndex]
  );

  // Carrossel automático fluido de 6 segundos sincronizado com o heroIndex
  useEffect(() => {
    if (heroWorks.length <= 1) return;

    const timer = setTimeout(() => {
      handleNextSlide();
    }, 6000);

    return () => clearTimeout(timer);
  }, [heroIndex, heroWorks.length, handleNextSlide]);

  if (!currentHero) {
    return (
      <section className="mn-container pt-10">
        <div className="border-2 border-dashed border-[var(--mn-line)] bg-[var(--mn-ink-2)] p-8 text-center space-y-3">
          <h1 className="font-display text-3xl text-[var(--mn-yellow)] uppercase">A banca está começando</h1>
          <p className="font-body text-sm text-[var(--mn-mute)]">
            Ainda não há obras publicadas neste formato. Enquanto isso, explore o catálogo completo.
          </p>
          {onNavigateToCatalog && (
            <button
              type="button"
              onClick={onNavigateToCatalog}
              className="px-4 py-2 bg-[var(--mn-yellow)] text-[var(--mn-ink)] font-pixel text-[12px] uppercase border-2 border-[var(--mn-ink)] shadow-[3px_3px_0_var(--mn-ink)]"
            >
              Ver catálogo
            </button>
          )}
        </div>
      </section>
    );
  }

  const slideAnimClass = direction === 'right' ? 'mn-motion-slide-right' : 'mn-motion-slide-left';

  return (
    <section className="relative w-full bg-[var(--mn-ink-2)] text-[var(--mn-paper)] border-b-2 border-[var(--mn-line)] mn-grain pt-10 pb-16 overflow-hidden">
      {/* Elementos gráficos de fundo angulares e hachura suave com amarelo da identidade visual */}
      <div className="absolute top-0 right-0 w-96 h-full bg-[var(--mn-yellow)]/5 -skew-x-12 pointer-events-none" />
      <div className="absolute inset-0 mn-halftone pointer-events-none opacity-10" />

      <div className="mn-container relative z-10 grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-8 items-center">
        {/* Bloco de conteúdo com transição horizontal de carrossel estilo MangaPlus */}
        <div key={`content-${currentHero.id}`} className={`space-y-5 ${slideAnimClass}`}>
          <div className="flex items-center gap-3 flex-wrap">
            {/* Destaque Neon com bobbing suave e respiração de brilho */}
            <div className="inline-flex items-center gap-1.5 bg-black border-2 border-[var(--mn-yellow)] px-3 py-1 shadow-[3px_3px_0_#000000] mn-motion-bob">
              <span className="font-pixel text-[12px] tracking-widest uppercase font-bold text-[var(--mn-yellow)] mn-motion-neon">
                ✦ DESTAQUE AGORA ✦
              </span>
            </div>

            <FormatBadge format={currentHero.format} size="md" />
          </div>

          {/* TÍTULO EM ESTILO COLAGEM CARTOON NETWORK */}
          <div className="pt-1">
            <CartoonTitle title={currentHero.title} />
          </div>

          {/* Nome do autor em linha própria e clicável levando ao perfil do autor */}
          <div className="flex items-center gap-2">
            <span className="font-pixel text-[11px] uppercase tracking-wider text-[var(--mn-mute)]">
              POR
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                const authorUsername = currentHero.authorName?.replace(/^@/, '') || currentHero.authorId;
                if (onOpenAuthorProfile && authorUsername) {
                  onOpenAuthorProfile(authorUsername);
                } else {
                  onSelectWork(currentHero);
                }
              }}
              className="font-pixel text-[13px] tracking-wider text-[var(--mn-yellow)] font-bold hover:underline hover:text-white transition-colors cursor-pointer"
              title={`Ver perfil do autor ${currentHero.authorName}`}
            >
              {currentHero.authorName}
            </button>
          </div>

          <p className="font-body text-sm sm:text-base md:text-lg text-[var(--mn-paper-2)] line-clamp-3 leading-relaxed max-w-xl">
            {currentHero.synopsis || 'Sinopse em breve.'}
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            {/* Botão LER AGORA — fundo branco, texto preto, borda e sombra preta sólida 3D */}
            <button
              type="button"
              onClick={() => void onReadNow(currentHero)}
              className="px-7 py-3.5 font-display text-base sm:text-lg tracking-wider uppercase bg-white text-black font-bold border-2 border-black shadow-[4px_4px_0_#000000] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_#000000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer"
            >
              LER AGORA
            </button>

            <button
              type="button"
              onClick={() => onSelectWork(currentHero)}
              className="px-7 py-3.5 font-display text-base sm:text-lg tracking-wider uppercase bg-transparent text-[var(--mn-paper)] border-2 border-[var(--mn-paper)] hover:border-[var(--mn-yellow)] hover:text-[var(--mn-yellow)] shadow-[4px_4px_0_#000000] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_#000000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer"
            >
              VER OBRA
            </button>
          </div>

          {heroWorks.length > 1 && (
            <div className="space-y-3 pt-3">
              {/* Barra de progresso contínua de 6 segundos estilo MangaPlus */}
              <div className="w-56 h-1 bg-[var(--mn-ink-3)] border border-[var(--mn-line)] overflow-hidden">
                <div
                  key={heroIndex}
                  className="h-full bg-[var(--mn-yellow)]"
                  style={{
                    animation: 'mn-progress-fill 6s linear forwards',
                  }}
                />
              </div>

              {/* Indicadores e controles de navegação */}
              <div className="flex items-center gap-2">
                {heroWorks.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectIndex(idx)}
                    aria-label={`Destaque ${idx + 1}`}
                    className={`w-3.5 h-3.5 border-2 transition-all cursor-pointer ${
                      heroIndex === idx
                        ? 'border-[var(--mn-yellow)] bg-[var(--mn-yellow)]'
                        : 'border-[var(--mn-line)] bg-transparent hover:border-[var(--mn-paper)]'
                    }`}
                  />
                ))}
                <div className="flex gap-1.5 ml-3">
                  <button
                    onClick={handlePrevSlide}
                    className="w-7 h-7 border-2 border-[var(--mn-line)] bg-[var(--mn-ink)] text-[var(--mn-paper)] flex items-center justify-center font-bold hover:border-[var(--mn-yellow)] hover:text-[var(--mn-yellow)] transition-colors cursor-pointer"
                    aria-label="Anterior"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={handleNextSlide}
                    className="w-7 h-7 border-2 border-[var(--mn-line)] bg-[var(--mn-ink)] text-[var(--mn-paper)] flex items-center justify-center font-bold hover:border-[var(--mn-yellow)] hover:text-[var(--mn-yellow)] transition-colors cursor-pointer"
                    aria-label="Próximo"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Capa com transição de carrossel sincronizada + motion de flutuação vertical */}
        <div key={`cover-${currentHero.id}`} className={`relative flex justify-center lg:justify-end ${slideAnimClass}`}>
          {/* Card inclinado de fundo sem listras — profundidade limpa */}
          <div
            className="absolute w-56 sm:w-64 aspect-[2/3] border-2 border-[var(--mn-line)] bg-[var(--mn-ink-3)] -rotate-3 translate-x-4 translate-y-3 pointer-events-none opacity-80"
          />
          <div
            onClick={() => onSelectWork(currentHero)}
            className="relative w-56 sm:w-64 aspect-[2/3] border-2 border-[var(--mn-yellow)] shadow-[8px_8px_0_var(--mn-yellow)] mn-motion-cover hover:rotate-0 transition-transform duration-150 cursor-pointer overflow-hidden z-10"
          >
            <Cover src={currentHero.coverUrl} title={currentHero.title} aspectRatio="2/3" dropShadow={false} />
          </div>
        </div>
      </div>
    </section>
  );
}

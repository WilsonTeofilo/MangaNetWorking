import { useState, useEffect, useRef, useCallback } from 'react';
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
  onNavigateToCatalog?: () => void;
}

export function HomeHeroSection({
  currentHero,
  heroWorks,
  heroIndex,
  onSetHeroIndex,
  onReadNow,
  onSelectWork,
  onNavigateToCatalog,
}: HomeHeroSectionProps) {
  const [isPaused, setIsPaused] = useState(false);
  const [progressKey, setProgressKey] = useState(0);
  const isPausedRef = useRef(false);

  // Mantém ref sincronizada para uso dentro do intervalo
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  // Avança slide e reinicia animação da barra
  const handleNextSlide = useCallback(() => {
    if (heroWorks.length <= 1) return;
    onSetHeroIndex((prev) => (prev + 1) % heroWorks.length);
    setProgressKey((k) => k + 1);
  }, [heroWorks.length, onSetHeroIndex]);

  const handlePrevSlide = useCallback(() => {
    if (heroWorks.length <= 1) return;
    onSetHeroIndex((prev) => (prev - 1 + heroWorks.length) % heroWorks.length);
    setProgressKey((k) => k + 1);
  }, [heroWorks.length, onSetHeroIndex]);

  const handleSelectIndex = useCallback(
    (idx: number) => {
      onSetHeroIndex(idx);
      setProgressKey((k) => k + 1);
    },
    [onSetHeroIndex]
  );

  // Carrossel automático de 6 segundos
  useEffect(() => {
    if (heroWorks.length <= 1) return;

    const interval = setInterval(() => {
      if (!isPausedRef.current) {
        onSetHeroIndex((prev) => (prev + 1) % heroWorks.length);
        setProgressKey((k) => k + 1);
      }
    }, 6000);

    return () => clearInterval(interval);
  }, [heroWorks.length, onSetHeroIndex, progressKey]);

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

  return (
    <section
      className="relative w-full bg-[var(--mn-ink-2)] text-[var(--mn-paper)] border-b-2 border-[var(--mn-line)] mn-grain pt-10 pb-16 overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Elementos gráficos de fundo angulares e hachura suave com amarelo da identidade visual */}
      <div className="absolute top-0 right-0 w-96 h-full bg-[var(--mn-yellow)]/5 -skew-x-12 pointer-events-none" />
      <div className="absolute inset-0 mn-halftone pointer-events-none opacity-10" />

      <div className="mn-container relative z-10 grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-8 items-center">
        {/* Bloco de conteúdo do slide re-renderizado com animação MangaPlus via key */}
        <div key={currentHero.id} className="space-y-5 mn-motion-slide">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Destaque Neon com bobbing suave e respiração de brilho */}
            <div className="inline-flex items-center gap-1.5 bg-black border-2 border-[var(--mn-yellow)] px-3 py-1 shadow-[3px_3px_0_#000000] mn-motion-bob">
              <span className="font-pixel text-[12px] tracking-widest uppercase font-bold text-[var(--mn-yellow)] mn-motion-neon">
                ✦ DESTAQUE AGORA ✦
              </span>
            </div>

            <FormatBadge format={currentHero.format} size="md" />

            <span className="font-pixel text-[12px] tracking-wider text-[var(--mn-yellow)] font-bold">
              POR {currentHero.authorName}
            </span>
          </div>

          {/* TÍTULO EM ESTILO COLAGEM CARTOON NETWORK */}
          <div className="pt-1">
            <CartoonTitle title={currentHero.title} />
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
              {/* Barra de progresso automática de 6 segundos estilo MangaPlus */}
              <div className="w-56 h-1 bg-[var(--mn-ink-3)] border border-[var(--mn-line)] overflow-hidden">
                <div
                  key={progressKey}
                  className="h-full bg-[var(--mn-yellow)]"
                  style={{
                    animation: 'mn-progress-fill 6s linear forwards',
                    animationPlayState: isPaused ? 'paused' : 'running',
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

        {/* Capa com motion vertical suave orgânico estilo Peditto storefront */}
        <div className="relative flex justify-center lg:justify-end">
          <div
            className="absolute w-56 sm:w-64 aspect-[2/3] border-2 border-[var(--mn-line)] -rotate-3 translate-x-4 translate-y-3 pointer-events-none overflow-hidden"
            style={{
              background: 'repeating-linear-gradient(-45deg, var(--mn-yellow) 0, var(--mn-yellow) 6px, var(--mn-ink-3) 6px, var(--mn-ink-3) 16px)'
            }}
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

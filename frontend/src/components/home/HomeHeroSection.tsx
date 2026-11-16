import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Work } from '../../types';
import { Sticker } from '../ui/Sticker';
import { FormatBadge } from '../ui/FormatBadge';
import { Cover } from '../ui/Cover';

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
    <section className="relative w-full bg-[var(--mn-yellow)] text-[var(--mn-ink)] border-b-2 border-[var(--mn-ink)] mn-grain mn-cut pt-10 pb-16 overflow-hidden">
      <div className="absolute inset-0 mn-halftone pointer-events-none opacity-20" />
      <div className="absolute top-0 right-0 w-80 h-full mn-stripes opacity-15 pointer-events-none" />

      <div className="mn-container relative z-10 grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-8 items-center">
        <div className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Sticker kind="new" label="DESTAQUE AGORA" rotate={-2} />
            <FormatBadge format={currentHero.format} size="md" />
            <span className="font-pixel text-[12px] tracking-wider text-[var(--mn-ink)] font-bold">
              POR {currentHero.authorName}
            </span>
          </div>

          <h1 className="font-display text-4xl sm:text-6xl md:text-7xl leading-[1.05] pt-1.5 uppercase text-[var(--mn-ink)] tracking-tight">
            {currentHero.title}
          </h1>

          <p className="font-body text-base sm:text-lg text-[var(--mn-ink)] line-clamp-3 leading-snug font-medium max-w-xl">
            {currentHero.synopsis || 'Sinopse em breve.'}
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <button
              type="button"
              onClick={() => void onReadNow(currentHero)}
              className="px-6 py-3 font-display text-lg tracking-wider uppercase bg-[var(--mn-ink)] text-[var(--mn-yellow)] border-2 border-[var(--mn-ink)] shadow-[4px_4px_0_var(--mn-paper)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_var(--mn-paper)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer"
            >
              LER AGORA
            </button>

            <button
              type="button"
              onClick={() => onSelectWork(currentHero)}
              className="px-6 py-3 font-display text-lg tracking-wider uppercase bg-transparent text-[var(--mn-ink)] border-2 border-[var(--mn-ink)] shadow-[4px_4px_0_var(--mn-ink)] hover:bg-[var(--mn-ink)]/10 hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_var(--mn-ink)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer"
            >
              VER OBRA
            </button>
          </div>

          {heroWorks.length > 1 && (
            <div className="flex items-center gap-2 pt-4">
              {heroWorks.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => onSetHeroIndex(idx)}
                  aria-label={`Destaque ${idx + 1}`}
                  className={`w-3.5 h-3.5 border-2 border-[var(--mn-ink)] transition-all ${
                    heroIndex === idx ? 'bg-[var(--mn-ink)]' : 'bg-transparent'
                  }`}
                />
              ))}
              <div className="flex gap-1 ml-3">
                <button
                  onClick={() => onSetHeroIndex((prev) => (prev - 1 + heroWorks.length) % heroWorks.length)}
                  className="w-7 h-7 border-2 border-[var(--mn-ink)] bg-[var(--mn-yellow)] flex items-center justify-center font-bold hover:bg-[var(--mn-ink)] hover:text-[var(--mn-yellow)] transition-colors"
                  aria-label="Anterior"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => onSetHeroIndex((prev) => (prev + 1) % heroWorks.length)}
                  className="w-7 h-7 border-2 border-[var(--mn-ink)] bg-[var(--mn-yellow)] flex items-center justify-center font-bold hover:bg-[var(--mn-ink)] hover:text-[var(--mn-yellow)] transition-colors"
                  aria-label="Próximo"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="relative flex justify-center lg:justify-end">
          <div className="absolute w-56 sm:w-64 aspect-[2/3] border-2 border-[var(--mn-ink)] bg-[var(--mn-paper)] -rotate-3 translate-x-4 translate-y-3 pointer-events-none opacity-80" />
          <div
            onClick={() => onSelectWork(currentHero)}
            className="relative w-56 sm:w-64 aspect-[2/3] border-2 border-[var(--mn-ink)] shadow-[8px_8px_0_var(--mn-ink)] rotate-2 hover:rotate-0 transition-transform duration-150 cursor-pointer overflow-hidden z-10"
          >
            <Cover src={currentHero.coverUrl} title={currentHero.title} aspectRatio="2/3" dropShadow={false} />
          </div>
        </div>
      </div>
    </section>
  );
}

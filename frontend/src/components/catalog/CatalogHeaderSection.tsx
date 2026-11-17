import { Search, X } from 'lucide-react';
import { FormatSwitcher } from '../ui/FormatSwitcher';
import { CatalogFilters } from '../../utils/catalogFilters';
import { CatalogPageDto } from '../../api/workApi';

interface CatalogHeaderSectionProps {
  filters: CatalogFilters;
  data: CatalogPageDto | null;
  onApply: (patch: Partial<CatalogFilters> | ((prev: CatalogFilters) => CatalogFilters), mode?: 'push' | 'replace') => void;
}

export function CatalogHeaderSection({ filters, data, onApply }: CatalogHeaderSectionProps) {
  return (
    <section className="w-full bg-[var(--mn-ink)] text-[var(--mn-paper)] border-b-2 border-[var(--mn-line)] pt-8 pb-6">
      <div className="mn-container space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-1.5">
            <span className="font-pixel text-[11px] tracking-widest text-[var(--mn-yellow)] font-bold block uppercase">
              EDITORIAL INDEPENDENTE
            </span>
            <h1 className="font-display text-3xl sm:text-5xl md:text-6xl text-[var(--mn-paper)] leading-none uppercase tracking-tight">
              CATÁLOGO DE <span className="text-[var(--mn-yellow)]">OBRAS</span>
            </h1>
            <p className="font-body text-xs sm:text-sm text-[var(--mn-mute)] mt-1 max-w-xl leading-relaxed">
              Mangás em páginas e light novels em prosa, no mesmo lugar. Escolha o formato
              para explorar o acervo independente publicado direto pelos autores.
            </p>
          </div>

          <div className="w-full md:w-96 relative">
            <div className="relative flex items-center">
              <Search className="absolute left-3.5 text-[var(--mn-yellow)]" size={17} aria-hidden="true" />
              <input
                type="search"
                value={filters.q}
                onChange={(event) => onApply({ q: event.target.value, page: 0 }, 'replace')}
                placeholder="Buscar obra, autor ou gênero..."
                aria-label="Buscar obra, autor ou gênero"
                className="w-full pl-10 pr-10 py-3 bg-[var(--mn-ink-2)] text-[var(--mn-paper)] font-body text-sm border-2 border-[var(--mn-line)] focus:border-[var(--mn-yellow)] shadow-[3px_3px_0_#000000] outline-none placeholder-[var(--mn-mute)] transition-colors"
              />
              {filters.q && (
                <button
                  type="button"
                  onClick={() => onApply({ q: '', page: 0 })}
                  className="absolute right-3.5 text-[var(--mn-mute)] hover:text-[var(--mn-paper)] cursor-pointer"
                  aria-label="Limpar busca"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Eixo 1: formato. Sempre visível, integrado e harmônico */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-1">
          <span className="font-pixel text-[11px] uppercase tracking-wider text-[var(--mn-mute)]">
            FORMATO:
          </span>
          <FormatSwitcher
            value={filters.formato}
            onChange={(formato) =>
              onApply({ formato, page: 0, ...(formato === 'MANGA' ? { ilustracoes: false } : {}) })
            }
            counts={
              data
                ? { all: data.totalAll, manga: data.totalManga, lightNovel: data.totalLightNovel }
                : null
            }
          />
        </div>
      </div>
    </section>
  );
}

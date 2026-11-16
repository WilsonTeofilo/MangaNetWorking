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
    <section className="w-full bg-[var(--mn-yellow)] text-[var(--mn-ink)] border-b-2 border-[var(--mn-ink)] pt-8 pb-6">
      <div className="mn-container space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <span className="font-pixel text-[12px] tracking-wider text-[var(--mn-ink)] font-bold block mb-2.5">
              EDITORIAL INDEPENDENTE
            </span>
            <h1 className="font-display text-4xl sm:text-6xl text-[var(--mn-ink)] leading-[1.08] pt-1 uppercase">
              CATÁLOGO DE OBRAS
            </h1>
            <p className="font-body text-xs sm:text-sm text-[var(--mn-ink)] font-medium mt-1 max-w-xl">
              Mangás em páginas e light novels em prosa, no mesmo lugar. Escolha o formato
              para ver só o que você quer ler.
            </p>
          </div>

          <div className="w-full md:w-80 relative">
            <div className="relative flex items-center">
              <Search className="absolute left-3 text-[var(--mn-ink)]" size={16} aria-hidden="true" />
              <input
                type="search"
                value={filters.q}
                onChange={(event) => onApply({ q: event.target.value, page: 0 }, 'replace')}
                placeholder="Buscar obra, autor ou gênero..."
                aria-label="Buscar obra, autor ou gênero"
                className="w-full pl-9 pr-9 py-2.5 bg-[var(--mn-paper)] text-[var(--mn-ink)] font-body text-sm border-2 border-[var(--mn-ink)] shadow-[3px_3px_0_var(--mn-ink)] focus:shadow-[5px_5px_0_var(--mn-ink)] outline-none placeholder-[var(--mn-line)]"
              />
              {filters.q && (
                <button
                  type="button"
                  onClick={() => onApply({ q: '', page: 0 })}
                  className="absolute right-3 text-[var(--mn-ink)] hover:scale-110"
                  aria-label="Limpar busca"
                >
                  <X size={15} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Eixo 1: formato. Sempre visível, nunca escondido num filtro. */}
        <div className="space-y-1.5">
          <span className="font-pixel text-[12px] uppercase tracking-wider text-[var(--mn-ink)]/80">
            Formato
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

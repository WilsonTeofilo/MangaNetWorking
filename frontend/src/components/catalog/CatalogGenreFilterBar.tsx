import { useState } from 'react';
import { Check, SlidersHorizontal } from 'lucide-react';
import { FormatSwitcher } from '../ui/FormatSwitcher';
import { CATALOG_GENRES, CatalogFilters } from '../../utils/catalogFilters';

const GENRES_VISIBLE = 6;

interface CatalogGenreFilterBarProps {
  filters: CatalogFilters;
  drawerOpen: boolean;
  advancedFilterCount: number;
  onOpenDrawer: () => void;
  onApply: (patch: Partial<CatalogFilters> | ((prev: CatalogFilters) => CatalogFilters), mode?: 'push' | 'replace') => void;
}

export function CatalogGenreFilterBar({
  filters,
  drawerOpen,
  advancedFilterCount,
  onOpenDrawer,
  onApply,
}: CatalogGenreFilterBarProps) {
  const [showAllGenres, setShowAllGenres] = useState(false);

  const visibleGenres = showAllGenres ? CATALOG_GENRES : CATALOG_GENRES.slice(0, GENRES_VISIBLE);
  const hasHiddenGenres = CATALOG_GENRES.length > GENRES_VISIBLE;

  const toggleGenre = (genre: string) => {
    onApply((previous: CatalogFilters) => ({
      ...previous,
      generos: previous.generos.includes(genre)
        ? previous.generos.filter((value: string) => value !== genre)
        : [...previous.generos, genre],
      page: 0,
    }));
  };

  return (
    <section className="w-full bg-[var(--mn-ink)] border-b-2 border-[var(--mn-line)] py-2.5 sticky top-[70px] md:top-[82px] z-30">
      <div className="mn-container space-y-2">
        {/* No mobile o formato fica fixo no topo ao rolar a lista. */}
        <div className="lg:hidden">
          <FormatSwitcher
            value={filters.formato}
            onChange={(formato) =>
              onApply({ formato, page: 0, ...(formato === 'MANGA' ? { ilustracoes: false } : {}) })
            }
            size="md"
            className="w-full"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none flex-1">
            {visibleGenres.map((genre) => {
              const selected = filters.generos.includes(genre.value);
              return (
                <button
                  key={genre.value}
                  type="button"
                  onClick={() => toggleGenre(genre.value)}
                  aria-pressed={selected}
                  className={`inline-flex items-center gap-1 px-3 py-1 font-pixel text-[12px] tracking-wider uppercase border-2 whitespace-nowrap transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mn-yellow)] ${
                    selected
                      ? 'bg-[var(--mn-yellow)] text-[var(--mn-ink)] border-[var(--mn-yellow)] shadow-[2px_2px_0_var(--mn-paper)]'
                      : 'bg-transparent text-[var(--mn-paper)] border-[var(--mn-line)] hover:border-[var(--mn-yellow)] hover:text-[var(--mn-yellow)]'
                  }`}
                >
                  {selected && <Check size={11} aria-hidden="true" />}
                  {genre.label}
                </button>
              );
            })}

            {hasHiddenGenres && (
              <button
                type="button"
                onClick={() => setShowAllGenres((value) => !value)}
                className="px-3 py-1 font-pixel text-[12px] tracking-wider uppercase border-2 border-[var(--mn-line)] text-[var(--mn-mute)] whitespace-nowrap hover:text-[var(--mn-yellow)] hover:border-[var(--mn-yellow)]"
                aria-expanded={showAllGenres}
              >
                {showAllGenres ? '– menos' : '+ mais'}
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onOpenDrawer}
            aria-expanded={drawerOpen}
            aria-controls="catalog-filter-drawer"
            className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 font-pixel text-[12px] tracking-wider uppercase border-2 transition-colors ${
              advancedFilterCount > 0 || drawerOpen
                ? 'bg-[var(--mn-yellow)] text-[var(--mn-ink)] border-[var(--mn-yellow)]'
                : 'bg-transparent text-[var(--mn-paper)] border-[var(--mn-line)] hover:border-[var(--mn-yellow)] hover:text-[var(--mn-yellow)]'
            }`}
          >
            <SlidersHorizontal size={13} aria-hidden="true" />
            <span>Filtros</span>
            {advancedFilterCount > 0 && (
              <span className="bg-[var(--mn-ink)] text-[var(--mn-yellow)] px-1 tabular-nums">
                {advancedFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </section>
  );
}

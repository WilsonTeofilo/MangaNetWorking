import { PenLine, Sparkles, X } from 'lucide-react';
import { Work } from '../../types';
import { WorkCard } from '../ui/WorkCard';
import { CatalogPageDto } from '../../api/workApi';
import { CatalogFilters, ORDER_OPTIONS, removePill } from '../../utils/catalogFilters';
import mascotSvg from '../../assets/brand/mascot-placeholder.svg';

const COLD_START_THRESHOLD = 8;

interface ActiveFilterPill {
  key: string;
  label: string;
}

interface CatalogWorksGridProps {
  works: Work[];
  data: CatalogPageDto | null;
  filters: CatalogFilters;
  loading: boolean;
  initialLoading: boolean;
  error: string | null;
  activePills: ActiveFilterPill[];
  totalLabel: string;
  favorites: string[];
  isAuthenticated: boolean;
  isCreator?: boolean;
  onSelectWork: (work: Work) => void;
  onToggleFavorite?: (workId: string) => void;
  onPublishWork?: () => void;
  onReload: () => void;
  onClearAll: () => void;
  onApply: (patch: Partial<CatalogFilters> | ((prev: CatalogFilters) => CatalogFilters), mode?: 'push' | 'replace') => void;
}

export function CatalogWorksGrid({
  works,
  data,
  filters,
  loading,
  initialLoading,
  error,
  activePills,
  totalLabel,
  favorites,
  isAuthenticated,
  isCreator,
  onSelectWork,
  onToggleFavorite,
  onPublishWork,
  onReload,
  onClearAll,
  onApply,
}: CatalogWorksGridProps) {
  const goToPage = (page: number) => {
    onApply({ page: Math.max(0, page) });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="mn-container pt-6 space-y-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b-2 border-[var(--mn-line)] pb-3">
        <span className="font-pixel text-[12px] text-[var(--mn-paper)] uppercase">
          {loading && !data ? 'Carregando…' : `Exibindo ${totalLabel}`}
        </span>

        {activePills.map((pill) => (
          <button
            key={pill.key}
            type="button"
            onClick={() => onApply(removePill(filters, pill.key))}
            className="inline-flex items-center gap-1 px-2 py-0.5 border border-[var(--mn-line)] text-[var(--mn-paper)] font-body text-[11px] hover:border-[var(--mn-red)] hover:text-[var(--mn-red)]"
            aria-label={`Remover filtro ${pill.label}`}
          >
            {pill.label}
            <X size={11} aria-hidden="true" />
          </button>
        ))}

        {activePills.length > 0 && (
          <button
            type="button"
            onClick={onClearAll}
            className="font-pixel text-[12px] uppercase text-[var(--mn-yellow)] hover:underline underline-offset-4"
          >
            Limpar tudo
          </button>
        )}

        <span className="ml-auto font-pixel text-[12px] text-[var(--mn-mute)] uppercase">
          Ordem: {ORDER_OPTIONS.find((option) => option.value === filters.ordem)?.label}
        </span>
      </div>

      {/* Estados: skeleton, erro, vazio */}
      {initialLoading ? (
        <div
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-5 gap-y-8"
          aria-hidden="true"
        >
          {Array.from({ length: 10 }).map((_, index) => (
            <div key={index} className="space-y-2.5 animate-pulse">
              <div className="aspect-[2/3] bg-[var(--mn-ink-2)] border-2 border-[var(--mn-line)]" />
              <div className="h-3.5 bg-[var(--mn-ink-2)] w-4/5" />
              <div className="h-3 bg-[var(--mn-ink-2)] w-3/5" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="p-10 text-center border-2 border-[var(--mn-red)] bg-[var(--mn-ink-2)] space-y-3 max-w-lg mx-auto">
          <h3 className="font-display text-2xl text-[var(--mn-red)] uppercase">DEU RUIM NA BANCA</h3>
          <p className="font-body text-sm text-[var(--mn-mute)]">{error}</p>
          <button
            type="button"
            onClick={onReload}
            className="px-4 py-2 bg-[var(--mn-yellow)] text-[var(--mn-ink)] font-pixel text-[12px] uppercase border-2 border-[var(--mn-ink)] shadow-[3px_3px_0_var(--mn-ink)]"
          >
            Tentar de novo
          </button>
        </div>
      ) : works.length === 0 ? (
        <div className="p-10 text-center border-2 border-dashed border-[var(--mn-line)] bg-[var(--mn-ink-2)] space-y-4 max-w-lg mx-auto">
          <img src={mascotSvg} alt="" className="w-20 h-24 mx-auto opacity-80" />
          <h3 className="font-display text-2xl text-[var(--mn-yellow)] uppercase">
            {filters.formato === 'LIGHT_NOVEL'
              ? 'NENHUMA LIGHT NOVEL COM ESSES FILTROS'
              : filters.formato === 'MANGA'
              ? 'NENHUM MANGÁ COM ESSES FILTROS'
              : 'NENHUMA OBRA COM ESSES FILTROS'}
          </h3>
          <p className="font-body text-sm text-[var(--mn-mute)]">
            Tente outro gênero ou limpe os filtros para ver tudo o que já está publicado.
          </p>
          <button
            type="button"
            onClick={onClearAll}
            className="px-4 py-2 bg-[var(--mn-yellow)] text-[var(--mn-ink)] font-pixel text-[12px] uppercase border-2 border-[var(--mn-ink)] shadow-[3px_3px_0_var(--mn-ink)]"
          >
            Limpar filtros
          </button>
        </div>
      ) : (
        <>
          <div
            className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-5 gap-y-8 transition-opacity ${
              loading ? 'opacity-60' : 'opacity-100'
            }`}
          >
            {works.map((work) => (
              <WorkCard
                key={work.id}
                work={work}
                onSelect={onSelectWork}
                isFavorite={favorites.includes(work.id)}
                onToggleFavorite={onToggleFavorite}
                analyticsSurface="CATALOGO"
                analyticsEnabled={isAuthenticated}
                showFormatBadge={filters.formato === 'all'}
              />
            ))}
          </div>

          {/* Cold start: convite a publicar quando o recorte tiver poucas obras */}
          {isAuthenticated && isCreator && (data?.total ?? 0) < COLD_START_THRESHOLD && onPublishWork && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 border border-dashed border-[var(--mn-line)] bg-[var(--mn-ink-2)] p-4 shadow-[2px_2px_0_#000000]">
              <Sparkles className="text-[var(--mn-yellow)] shrink-0" size={20} aria-hidden="true" />
              <div className="flex-1">
                <p className="font-display text-base text-[var(--mn-paper)] uppercase leading-tight">
                  A banca ainda tem poucas obras neste recorte
                </p>
                <p className="font-body text-xs text-[var(--mn-mute)] mt-0.5">
                  Publique a sua e apareça aqui para quem já está procurando o que ler.
                </p>
              </div>
              <button
                type="button"
                onClick={onPublishWork}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[var(--mn-yellow)] text-[var(--mn-ink)] font-pixel text-[11px] uppercase font-bold border-2 border-[var(--mn-ink)] shadow-[2px_2px_0_var(--mn-ink)] hover:bg-[var(--mn-yellow-press)] transition-colors cursor-pointer"
              >
                <PenLine size={13} aria-hidden="true" />
                Publicar obra
              </button>
            </div>
          )}

          {/* Paginação no servidor */}
          {(data?.totalPages ?? 0) > 1 && (
            <nav className="flex items-center justify-center gap-3 pt-2" aria-label="Paginação do catálogo">
              <button
                type="button"
                onClick={() => goToPage((data?.page ?? 0) - 1)}
                disabled={(data?.page ?? 0) <= 0 || loading}
                className="px-3 py-1.5 font-pixel text-[12px] uppercase border-2 border-[var(--mn-line)] text-[var(--mn-paper)] disabled:opacity-40 disabled:cursor-not-allowed hover:border-[var(--mn-yellow)] hover:text-[var(--mn-yellow)]"
              >
                ← Anterior
              </button>
              <span className="font-pixel text-[12px] text-[var(--mn-mute)] tabular-nums">
                Página {(data?.page ?? 0) + 1} de {data?.totalPages ?? 1}
              </span>
              <button
                type="button"
                onClick={() => goToPage((data?.page ?? 0) + 1)}
                disabled={loading || (data?.page ?? 0) + 1 >= (data?.totalPages ?? 1)}
                className="px-3 py-1.5 font-pixel text-[12px] uppercase border-2 border-[var(--mn-line)] text-[var(--mn-paper)] disabled:opacity-40 disabled:cursor-not-allowed hover:border-[var(--mn-yellow)] hover:text-[var(--mn-yellow)]"
              >
                Próxima →
              </button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}

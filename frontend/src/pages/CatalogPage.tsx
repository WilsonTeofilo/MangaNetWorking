import { useMemo, useState } from 'react';
import { Work } from '../types';
import { useAuth } from '../context/AuthContext';
import { useCatalog } from '../hooks/useCatalog';
import { useCatalogUrlState } from '../hooks/useCatalogUrlState';
import { activeFilterPills } from '../utils/catalogFilters';
import { CatalogHeaderSection } from '../components/catalog/CatalogHeaderSection';
import { CatalogGenreFilterBar } from '../components/catalog/CatalogGenreFilterBar';
import { CatalogFilterDrawer } from '../components/catalog/CatalogFilterDrawer';
import { CatalogWorksGrid } from '../components/catalog/CatalogWorksGrid';

interface CatalogPageProps {
  onSelectWork: (work: Work) => void;
  /** CTA de cold start para autores logados. */
  onPublishWork?: () => void;
}

export function CatalogPage({ onSelectWork, onPublishWork }: CatalogPageProps) {
  const { user, isAuthenticated, toggleFavorite } = useAuth();
  const { filters, apply, clearAll } = useCatalogUrlState();
  const { data, works, loading, initialLoading, error, reload } = useCatalog(filters);

  const [drawerOpen, setDrawerOpen] = useState(false);

  const activePills = useMemo(() => activeFilterPills(filters), [filters]);
  const favorites = user?.favorites ?? [];

  const advancedFilterCount =
    (filters.status !== 'all' ? 1 : 0) +
    (filters.publico !== 'all' ? 1 : 0) +
    (filters.ordem !== 'relevance' ? 1 : 0) +
    (filters.ilustracoes ? 1 : 0);

  const totalLabel = (() => {
    const total = data?.total ?? 0;
    if (filters.formato === 'MANGA') return `${total} ${total === 1 ? 'mangá' : 'mangás'}`;
    if (filters.formato === 'LIGHT_NOVEL') return `${total} ${total === 1 ? 'light novel' : 'light novels'}`;
    return `${total} ${total === 1 ? 'obra' : 'obras'}`;
  })();

  return (
    <div className="w-full select-none pb-16">
      {/* 1. Cabeçalho editorial & seletor de formato */}
      <CatalogHeaderSection filters={filters} data={data} onApply={apply} />

      {/* 2. Barra de gêneros & gatilho do drawer de filtros */}
      <CatalogGenreFilterBar
        filters={filters}
        drawerOpen={drawerOpen}
        advancedFilterCount={advancedFilterCount}
        onOpenDrawer={() => setDrawerOpen(true)}
        onApply={apply}
      />

      {/* 3. Grid de resultados, loading, erro, vazio e paginação */}
      <CatalogWorksGrid
        works={works}
        data={data}
        filters={filters}
        loading={loading}
        initialLoading={initialLoading}
        error={error}
        activePills={activePills}
        totalLabel={totalLabel}
        favorites={favorites}
        isAuthenticated={isAuthenticated}
        isCreator={user?.isCreator}
        onSelectWork={onSelectWork}
        onToggleFavorite={isAuthenticated ? (workId) => void toggleFavorite(workId) : undefined}
        onPublishWork={onPublishWork}
        onReload={reload}
        onClearAll={clearAll}
        onApply={apply}
      />

      {/* 4. Drawer de filtros avançados */}
      <CatalogFilterDrawer
        isOpen={drawerOpen}
        filters={filters}
        onClose={() => setDrawerOpen(false)}
        onApply={apply}
        onClearAll={clearAll}
      />

      {/* Resumo acessível do recorte atual */}
      <p className="sr-only" aria-live="polite">
        {`${totalLabel}. Formato: ${
          filters.formato === 'all' ? 'tudo' : filters.formato === 'MANGA' ? 'mangá' : 'light novel'
        }.`}
      </p>
    </div>
  );
}

export default CatalogPage;

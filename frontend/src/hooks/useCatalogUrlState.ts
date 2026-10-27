import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CatalogFilters,
  DEFAULT_CATALOG_FILTERS,
  readCatalogFilters,
  writeCatalogFilters,
} from '../utils/catalogFilters';

type Mode = 'push' | 'replace';

/**
 * Estado do catálogo na URL.
 *
 * <p>Formato, gêneros, status, público, ordem, busca e página vivem em `?formato=...&genero=...`.
 * Assim um link compartilhado abre a mesma visão, o F5 não perde o filtro e o botão voltar
 * percorre as escolhas. A busca textual usa `replace` para não criar uma entrada por tecla.</p>
 */
export function useCatalogUrlState() {
  const [filters, setFilters] = useState<CatalogFilters>(() =>
    typeof window === 'undefined' ? DEFAULT_CATALOG_FILTERS : readCatalogFilters(window.location.search)
  );
  const filtersRef = useRef(filters);

  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  useEffect(() => {
    const handlePopState = () => {
      const next = readCatalogFilters(window.location.search);
      filtersRef.current = next;
      setFilters(next);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const apply = useCallback(
    (patch: Partial<CatalogFilters> | ((previous: CatalogFilters) => CatalogFilters), mode: Mode = 'push') => {
      const previous = filtersRef.current;
      const next = typeof patch === 'function' ? patch(previous) : { ...previous, ...patch };
      filtersRef.current = next;
      setFilters(next);

      const queryString = writeCatalogFilters(next);
      const url = `${window.location.pathname}${queryString ? `?${queryString}` : ''}${window.location.hash}`;
      if (mode === 'replace') {
        window.history.replaceState({ tab: 'works' }, '', url);
      } else {
        window.history.pushState({ tab: 'works' }, '', url);
      }
    },
    []
  );

  const clearAll = useCallback(() => apply(DEFAULT_CATALOG_FILTERS), [apply]);

  return { filters, apply, clearAll };
}

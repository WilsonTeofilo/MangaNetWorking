import { useCallback, useEffect, useRef, useState } from 'react';
import { CatalogPageDto, workApi } from '../api/workApi';
import { mapCatalogToWork } from '../utils/apiMappers';
import { CatalogFilters } from '../utils/catalogFilters';
import { Work } from '../types';

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

export interface UseCatalogResult {
  data: CatalogPageDto | null;
  works: Work[];
  loading: boolean;
  /** Verdadeiro só na primeira carga: evita trocar o grid por skeleton a cada filtro. */
  initialLoading: boolean;
  error: string;
  reload: () => void;
}

/**
 * Catálogo com filtragem, contadores e paginação no servidor.
 *
 * <p>A busca textual tem debounce de 300 ms; trocar formato/gênero/ordem responde na hora.
 * A resposta antiga continua visível durante a nova carga (sem piscar a tela), e uma resposta
 * atrasada nunca sobrescreve a mais recente.</p>
 */
export function useCatalog(filters: CatalogFilters): UseCatalogResult {
  const [data, setData] = useState<CatalogPageDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadToken, setReloadToken] = useState(0);
  const requestId = useRef(0);

  const debouncedQuery = useDebouncedValue(filters.q.trim(), 300);
  const genreKey = filters.generos.join(',');

  useEffect(() => {
    const current = ++requestId.current;
    setLoading(true);
    setError('');

    workApi
      .getCatalog({
        formato: filters.formato === 'all' ? undefined : filters.formato === 'MANGA' ? 'manga' : 'light-novel',
        genero: filters.generos,
        status: filters.status === 'all' ? undefined : filters.status,
        publico: filters.publico === 'all' ? undefined : filters.publico,
        q: debouncedQuery || undefined,
        ordem: filters.ordem,
        ilustracoes: filters.ilustracoes,
        page: filters.page,
        size: 24,
      })
      .then((response) => {
        if (current !== requestId.current) return;
        setData(response);
      })
      .catch((err: unknown) => {
        if (current !== requestId.current) return;
        setError(err instanceof Error && err.message ? err.message : 'Não foi possível carregar o catálogo agora.');
      })
      .finally(() => {
        if (current === requestId.current) setLoading(false);
      });
  }, [
    filters.formato,
    genreKey,
    filters.status,
    filters.publico,
    filters.ordem,
    filters.ilustracoes,
    filters.page,
    debouncedQuery,
    reloadToken,
  ]);

  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  return {
    data,
    works: (data?.items ?? []).map(mapCatalogToWork),
    loading,
    initialLoading: loading && data === null,
    error,
    reload,
  };
}

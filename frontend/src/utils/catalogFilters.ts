import { FormatFilter, formatFromParam, formatToParam } from './formatMeta';

/** Gêneros de conteúdo (o público é um eixo separado: Shonen/Seinen). */
export const CATALOG_GENRES: ReadonlyArray<{ value: string; label: string }> = [
  { value: 'ACAO', label: 'Ação' },
  { value: 'AVENTURA', label: 'Aventura' },
  { value: 'FANTASIA', label: 'Fantasia' },
  { value: 'SCI_FI', label: 'Sci-Fi' },
  { value: 'SOBRENATURAL', label: 'Sobrenatural' },
  { value: 'MISTERIO', label: 'Mistério' },
  { value: 'DRAMA', label: 'Drama' },
  { value: 'COMEDIA', label: 'Comédia' },
];

export const AUDIENCE_OPTIONS: ReadonlyArray<{ value: 'shonen' | 'seinen'; label: string }> = [
  { value: 'shonen', label: 'Shonen' },
  { value: 'seinen', label: 'Seinen' },
];

export const STATUS_OPTIONS: ReadonlyArray<{ value: CatalogStatus; label: string }> = [
  { value: 'all', label: 'Todos os status' },
  { value: 'ongoing', label: 'Em andamento' },
  { value: 'completed', label: 'Completo' },
  { value: 'hiatus', label: 'Em hiato' },
];

export const ORDER_OPTIONS: ReadonlyArray<{ value: CatalogOrder; label: string }> = [
  { value: 'relevance', label: 'Relevância' },
  { value: 'recent', label: 'Mais recentes' },
  { value: 'updated', label: 'Atualizados' },
  { value: 'views', label: 'Mais lidos' },
  { value: 'title', label: 'Título (A–Z)' },
];

export type CatalogStatus = 'all' | 'ongoing' | 'completed' | 'hiatus';
export type CatalogOrder = 'relevance' | 'recent' | 'updated' | 'views' | 'title';
export type CatalogAudience = 'all' | 'shonen' | 'seinen';

export interface CatalogFilters {
  formato: FormatFilter;
  /** Nomes do enum do backend (`ACAO`, `SCI_FI`...). */
  generos: string[];
  status: CatalogStatus;
  publico: CatalogAudience;
  ordem: CatalogOrder;
  ilustracoes: boolean;
  q: string;
  page: number;
}

export const DEFAULT_CATALOG_FILTERS: CatalogFilters = {
  formato: 'all',
  generos: [],
  status: 'all',
  publico: 'all',
  ordem: 'relevance',
  ilustracoes: false,
  q: '',
  page: 0,
};

export const CATALOG_PARAM_KEYS = [
  'formato',
  'genero',
  'status',
  'publico',
  'ordem',
  'ilustracoes',
  'q',
  'pagina',
] as const;

/** `true` quando a URL atual carrega estado de catálogo (link compartilhado/F5). */
export function hasCatalogParams(search: string): boolean {
  const params = new URLSearchParams(search);
  return CATALOG_PARAM_KEYS.some((key) => params.has(key));
}

/** Lê o estado do catálogo da URL, descartando valores fora da allow-list. */
export function readCatalogFilters(search: string): CatalogFilters {
  const params = new URLSearchParams(search);

  const generos = params
    .getAll('genero')
    .flatMap((value) => value.split(','))
    .map((value) => value.trim().toUpperCase())
    .filter((value) => CATALOG_GENRES.some((genre) => genre.value === value));

  const status = params.get('status');
  const publico = params.get('publico');
  const ordem = params.get('ordem');
  const page = Number(params.get('pagina') ?? '0');

  return {
    formato: formatFromParam(params.get('formato')),
    generos: Array.from(new Set(generos)),
    status: STATUS_OPTIONS.some((option) => option.value === status) ? (status as CatalogStatus) : 'all',
    publico: AUDIENCE_OPTIONS.some((option) => option.value === publico) ? (publico as CatalogAudience) : 'all',
    ordem: ORDER_OPTIONS.some((option) => option.value === ordem) ? (ordem as CatalogOrder) : 'relevance',
    ilustracoes: params.get('ilustracoes') === 'true',
    q: params.get('q') ?? '',
    page: Number.isFinite(page) && page > 0 ? Math.floor(page) : 0,
  };
}

/** Serializa o estado de catálogo para a URL (omite o que é padrão, mantém a URL legível). */
export function writeCatalogFilters(filters: CatalogFilters): string {
  const params = new URLSearchParams();
  const formato = formatToParam(filters.formato);
  if (formato) params.set('formato', formato);
  filters.generos.forEach((genero) => params.append('genero', genero));
  if (filters.status !== 'all') params.set('status', filters.status);
  if (filters.publico !== 'all') params.set('publico', filters.publico);
  if (filters.ordem !== 'relevance') params.set('ordem', filters.ordem);
  if (filters.ilustracoes) params.set('ilustracoes', 'true');
  if (filters.q.trim()) params.set('q', filters.q.trim());
  if (filters.page > 0) params.set('pagina', String(filters.page));
  return params.toString();
}

/** Pílulas de filtro ativo (rótulo + ação de remover). */
export function activeFilterPills(filters: CatalogFilters): Array<{ key: string; label: string }> {
  const pills: Array<{ key: string; label: string }> = [];
  filters.generos.forEach((genero) => {
    const label = CATALOG_GENRES.find((genre) => genre.value === genero)?.label ?? genero;
    pills.push({ key: `genero:${genero}`, label });
  });
  if (filters.status !== 'all') {
    pills.push({
      key: 'status',
      label: STATUS_OPTIONS.find((option) => option.value === filters.status)?.label ?? filters.status,
    });
  }
  if (filters.publico !== 'all') {
    pills.push({
      key: 'publico',
      label: AUDIENCE_OPTIONS.find((option) => option.value === filters.publico)?.label ?? filters.publico,
    });
  }
  if (filters.ilustracoes) pills.push({ key: 'ilustracoes', label: 'Com ilustrações' });
  if (filters.q.trim()) pills.push({ key: 'q', label: `“${filters.q.trim()}”` });
  return pills;
}

/** Remove uma pílula do estado, preservando o restante. */
export function removePill(filters: CatalogFilters, key: string): CatalogFilters {
  if (key.startsWith('genero:')) {
    const genero = key.slice('genero:'.length);
    return { ...filters, generos: filters.generos.filter((value) => value !== genero), page: 0 };
  }
  switch (key) {
    case 'status':
      return { ...filters, status: 'all', page: 0 };
    case 'publico':
      return { ...filters, publico: 'all', page: 0 };
    case 'ilustracoes':
      return { ...filters, ilustracoes: false, page: 0 };
    case 'q':
      return { ...filters, q: '', page: 0 };
    default:
      return filters;
  }
}

import { describe, it, expect } from 'vitest';
import {
  readCatalogFilters,
  writeCatalogFilters,
  activeFilterPills,
  removePill,
  DEFAULT_CATALOG_FILTERS,
} from '../catalogFilters';

describe('catalogFilters utility', () => {
  it('should parse default filters when search query is empty', () => {
    const filters = readCatalogFilters('');
    expect(filters.formato).toBe('all');
    expect(filters.generos).toEqual([]);
    expect(filters.status).toBe('all');
    expect(filters.publico).toBe('all');
    expect(filters.ordem).toBe('relevance');
    expect(filters.page).toBe(0);
  });

  it('should parse url query params correctly', () => {
    const query = '?formato=manga&genero=ACAO&genero=FANTASIA&status=ongoing&ordem=recent&pagina=2&q=kokuin';
    const filters = readCatalogFilters(query);

    expect(filters.formato).toBe('MANGA');
    expect(filters.generos).toEqual(['ACAO', 'FANTASIA']);
    expect(filters.status).toBe('ongoing');
    expect(filters.ordem).toBe('recent');
    expect(filters.page).toBe(2);
    expect(filters.q).toBe('kokuin');
  });

  it('should write non-default filters to query string', () => {
    const query = writeCatalogFilters({
      ...DEFAULT_CATALOG_FILTERS,
      formato: 'LIGHT_NOVEL',
      generos: ['FANTASIA'],
      q: 'kiraya',
    });

    expect(query).toContain('formato=light-novel');
    expect(query).toContain('genero=FANTASIA');
    expect(query).toContain('q=kiraya');
  });

  it('should compute active filter pills and allow removing them', () => {
    const initial = {
      ...DEFAULT_CATALOG_FILTERS,
      formato: 'MANGA' as const,
      generos: ['ACAO', 'COMEDIA'],
      status: 'ongoing' as const,
    };

    const pills = activeFilterPills(initial);
    expect(pills.length).toBe(3); // 2 gêneros + status (formato é Eixo 1 no FormatSwitcher, não pílula)
    expect(pills.map((p) => p.label)).toEqual(['Ação', 'Comédia', 'Em andamento']);

    const withoutAcao = removePill(initial, 'genero:ACAO');
    expect(withoutAcao.generos).toEqual(['COMEDIA']);

    const withoutStatus = removePill(initial, 'status');
    expect(withoutStatus.status).toBe('all');
  });
});

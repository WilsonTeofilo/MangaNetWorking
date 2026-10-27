import { useMemo, useState } from 'react';
import { Search, X, SlidersHorizontal, Check, Sparkles, PenLine } from 'lucide-react';
import { Work } from '../types';
import { useAuth } from '../context/AuthContext';
import { WorkCard } from '../components/ui/WorkCard';
import { FormatSwitcher } from '../components/ui/FormatSwitcher';
import { useCatalog } from '../hooks/useCatalog';
import { useCatalogUrlState } from '../hooks/useCatalogUrlState';
import {
  AUDIENCE_OPTIONS,
  CATALOG_GENRES,
  ORDER_OPTIONS,
  STATUS_OPTIONS,
  activeFilterPills,
  removePill,
} from '../utils/catalogFilters';
import mascotSvg from '../assets/brand/mascot-placeholder.svg';

interface CatalogPageProps {
  onSelectWork: (work: Work) => void;
  /** CTA de cold start para autores logados. */
  onPublishWork?: () => void;
}

const GENRES_VISIBLE = 6;
/** Abaixo disso o grid ganha um convite a publicar em vez de parecer um site vazio. */
const COLD_START_THRESHOLD = 8;

export function CatalogPage({ onSelectWork, onPublishWork }: CatalogPageProps) {
  const { user, isAuthenticated, toggleFavorite } = useAuth();
  const { filters, apply, clearAll } = useCatalogUrlState();
  const { data, works, loading, initialLoading, error, reload } = useCatalog(filters);

  const [showAllGenres, setShowAllGenres] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const activePills = useMemo(() => activeFilterPills(filters), [filters]);
  const visibleGenres = showAllGenres ? CATALOG_GENRES : CATALOG_GENRES.slice(0, GENRES_VISIBLE);
  const hasHiddenGenres = CATALOG_GENRES.length > GENRES_VISIBLE;
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

  const toggleGenre = (genre: string) => {
    apply((previous) => ({
      ...previous,
      generos: previous.generos.includes(genre)
        ? previous.generos.filter((value) => value !== genre)
        : [...previous.generos, genre],
      page: 0,
    }));
  };

  const goToPage = (page: number) => {
    apply({ page: Math.max(0, page) });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="w-full select-none pb-16">
      {/* 1. Cabeçalho amarelo: título, busca e o seletor de formato (eixo 1) */}
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
                  onChange={(event) => apply({ q: event.target.value, page: 0 }, 'replace')}
                  placeholder="Buscar obra, autor ou gênero..."
                  aria-label="Buscar obra, autor ou gênero"
                  className="w-full pl-9 pr-9 py-2.5 bg-[var(--mn-paper)] text-[var(--mn-ink)] font-body text-sm border-2 border-[var(--mn-ink)] shadow-[3px_3px_0_var(--mn-ink)] focus:shadow-[5px_5px_0_var(--mn-ink)] outline-none placeholder-[var(--mn-line)]"
                />
                {filters.q && (
                  <button
                    type="button"
                    onClick={() => apply({ q: '', page: 0 })}
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
                apply({ formato, page: 0, ...(formato === 'MANGA' ? { ilustracoes: false } : {}) })
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

      {/* 2. Eixo 2: gêneros (chips com rolagem) + filtros avançados */}
      <section className="w-full bg-[var(--mn-ink)] border-b-2 border-[var(--mn-line)] py-2.5 sticky top-[70px] md:top-[82px] z-30">
        <div className="mn-container space-y-2">
          {/* No mobile o formato fica fixo no topo ao rolar a lista. */}
          <div className="lg:hidden">
            <FormatSwitcher
              value={filters.formato}
              onChange={(formato) =>
                apply({ formato, page: 0, ...(formato === 'MANGA' ? { ilustracoes: false } : {}) })
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
            onClick={() => setDrawerOpen(true)}
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
              <span className="bg-[var(--mn-ink)] text-[var(--mn-yellow)] px-1 tabular-nums">{advancedFilterCount}</span>
            )}
          </button>
          </div>
        </div>
      </section>

      {/* 3. Resultados */}
      <div className="mn-container pt-6 space-y-5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b-2 border-[var(--mn-line)] pb-3">
          <span className="font-pixel text-[12px] text-[var(--mn-paper)] uppercase">
            {loading && !data ? 'Carregando…' : `Exibindo ${totalLabel}`}
          </span>

          {activePills.map((pill) => (
            <button
              key={pill.key}
              type="button"
              onClick={() => apply(removePill(filters, pill.key))}
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
              onClick={clearAll}
              className="font-pixel text-[12px] uppercase text-[var(--mn-yellow)] hover:underline underline-offset-4"
            >
              Limpar tudo
            </button>
          )}

          <span className="ml-auto font-pixel text-[12px] text-[var(--mn-mute)] uppercase">
            Ordem: {ORDER_OPTIONS.find((option) => option.value === filters.ordem)?.label}
          </span>
        </div>

        {/* 3.1 Estados: skeleton, erro, vazio */}
        {initialLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-5 gap-y-8" aria-hidden="true">
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
              onClick={reload}
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
              onClick={clearAll}
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
                  onToggleFavorite={isAuthenticated ? (workId) => void toggleFavorite(workId) : undefined}
                  analyticsSurface="CATALOGO"
                  analyticsEnabled={isAuthenticated}
                />
              ))}
            </div>

            {/* Cold start: grid pequeno ganha convite em vez de parecer vazio */}
            {isAuthenticated && user?.isCreator && (data?.total ?? 0) < COLD_START_THRESHOLD && onPublishWork && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 border-2 border-[var(--mn-yellow)] bg-[var(--mn-ink-2)] p-4">
                <Sparkles className="text-[var(--mn-yellow)] shrink-0" size={22} aria-hidden="true" />
                <div className="flex-1">
                  <p className="font-display text-lg text-[var(--mn-paper)] uppercase leading-tight">
                    A banca ainda tem poucas obras neste recorte
                  </p>
                  <p className="font-body text-xs text-[var(--mn-mute)] mt-0.5">
                    Publique a sua e apareça aqui para quem já está procurando o que ler.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onPublishWork}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[var(--mn-yellow)] text-[var(--mn-ink)] font-pixel text-[12px] uppercase border-2 border-[var(--mn-ink)] shadow-[3px_3px_0_var(--mn-ink)]"
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

      {/* 4. Drawer de filtros avançados (fecha com Esc / clique no fundo) */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button
            type="button"
            className="absolute inset-0 bg-[var(--mn-ink)]/70"
            aria-label="Fechar filtros"
            onClick={() => setDrawerOpen(false)}
          />
          <aside
            id="catalog-filter-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="catalog-filter-title"
            className="relative w-full max-w-sm h-full bg-[var(--mn-paper)] text-[var(--mn-ink)] border-l-2 border-[var(--mn-ink)] overflow-y-auto"
            onKeyDown={(event) => {
              if (event.key === 'Escape') setDrawerOpen(false);
            }}
          >
            <div className="flex items-center justify-between px-4 py-3 bg-[var(--mn-yellow)] border-b-2 border-[var(--mn-ink)]">
              <h2 id="catalog-filter-title" className="font-display text-xl uppercase">
                Filtros
              </h2>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="p-1 border-2 border-[var(--mn-ink)]"
                aria-label="Fechar filtros"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-4 space-y-6">
              <section className="space-y-2">
                <h3 className="font-pixel text-[12px] uppercase tracking-wider">Status</h3>
                <div className="grid grid-cols-2 gap-2">
                  {STATUS_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => apply({ status: option.value, page: 0 })}
                      aria-pressed={filters.status === option.value}
                      className={`px-2.5 py-1.5 font-body text-sm border-2 border-[var(--mn-ink)] text-left ${
                        filters.status === option.value ? 'bg-[var(--mn-ink)] text-[var(--mn-yellow)]' : 'bg-transparent'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </section>

              <section className="space-y-2">
                <h3 className="font-pixel text-[12px] uppercase tracking-wider">Público</h3>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => apply({ publico: 'all', page: 0 })}
                    aria-pressed={filters.publico === 'all'}
                    className={`flex-1 px-2.5 py-1.5 font-body text-sm border-2 border-[var(--mn-ink)] ${
                      filters.publico === 'all' ? 'bg-[var(--mn-ink)] text-[var(--mn-yellow)]' : 'bg-transparent'
                    }`}
                  >
                    Todos
                  </button>
                  {AUDIENCE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => apply({ publico: option.value, page: 0 })}
                      aria-pressed={filters.publico === option.value}
                      className={`flex-1 px-2.5 py-1.5 font-body text-sm border-2 border-[var(--mn-ink)] ${
                        filters.publico === option.value ? 'bg-[var(--mn-ink)] text-[var(--mn-yellow)]' : 'bg-transparent'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </section>

              <section className="space-y-2">
                <label className="font-pixel text-[12px] uppercase tracking-wider block" htmlFor="catalog-order">
                  Ordem
                </label>
                <select
                  id="catalog-order"
                  value={filters.ordem}
                  onChange={(event) =>
                    apply({ ordem: event.target.value as (typeof ORDER_OPTIONS)[number]['value'], page: 0 })
                  }
                  className="w-full px-2.5 py-2 bg-[var(--mn-paper)] border-2 border-[var(--mn-ink)] font-body text-sm"
                >
                  {ORDER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </section>

              {/* Filtro contextual: só faz sentido para light novel. */}
              {filters.formato === 'LIGHT_NOVEL' && (
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.ilustracoes}
                    onChange={(event) => apply({ ilustracoes: event.target.checked, page: 0 })}
                    className="mt-0.5 h-4 w-4 accent-[var(--mn-ink)]"
                  />
                  <span>
                    <span className="font-body text-sm block">Com ilustrações</span>
                    <span className="font-body text-[11px] text-[var(--mn-line)] block">
                      Light novels com apresentação ilustrada da obra.
                    </span>
                  </span>
                </label>
              )}

              <div className="flex items-center justify-between pt-2 border-t-2 border-[var(--mn-ink)]">
                <button
                  type="button"
                  onClick={clearAll}
                  className="font-pixel text-[12px] uppercase underline underline-offset-4"
                >
                  Limpar tudo
                </button>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="px-4 py-2 bg-[var(--mn-yellow)] text-[var(--mn-ink)] font-pixel text-[12px] uppercase border-2 border-[var(--mn-ink)] shadow-[3px_3px_0_var(--mn-ink)]"
                >
                  Ver resultados
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Resumo acessível do recorte atual */}
      <p className="sr-only" aria-live="polite">
        {`${totalLabel}. Formato: ${
          filters.formato === 'all' ? 'tudo' : filters.formato === 'MANGA' ? 'mangá' : 'light novel'
        }.`}
      </p>
    </div>
  );
}

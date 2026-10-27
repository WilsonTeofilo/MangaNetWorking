import { useEffect, useRef, useState } from 'react';
import { workApi } from '../api/workApi';
import { mapCatalogToWork, mapRelease, ReleaseRow } from '../utils/apiMappers';
import { FormatFilter } from '../utils/formatMeta';
import { Work } from '../types';

/** Um trilho de formato só aparece com pelo menos esta quantidade de obras. */
export const MIN_RAIL_SIZE = 4;

export interface HomeDiscovery {
  hero: Work[];
  trendingManga: Work[];
  trendingLightNovel: Work[];
  releases: ReleaseRow[];
  loading: boolean;
  error: string;
}

const EMPTY: HomeDiscovery = {
  hero: [],
  trendingManga: [],
  trendingLightNovel: [],
  releases: [],
  loading: true,
  error: '',
};

/**
 * Dados da home com o formato como primeiro eixo.
 *
 * <p>"Em alta" é calculado **separadamente por formato** (visualização de mangá e de light novel
 * não são comparáveis). Em "Tudo" os dois trilhos são pedidos em paralelo; com um formato
 * selecionado só o trilho daquele formato existe. A fonte é o catálogo (PostgreSQL), então um
 * filtro nunca depende do último sync do feed.</p>
 */
export function useHomeDiscovery(formato: FormatFilter): HomeDiscovery {
  const [state, setState] = useState<HomeDiscovery>(EMPTY);
  const requestId = useRef(0);

  useEffect(() => {
    const current = ++requestId.current;
    const param = formato === 'all' ? undefined : formato === 'MANGA' ? 'manga' : 'light-novel';
    const wantManga = formato !== 'LIGHT_NOVEL';
    const wantNovel = formato !== 'MANGA';

    setState((previous) => ({ ...previous, loading: true, error: '' }));

    Promise.all([
      workApi.getCatalog({ formato: param, ordem: 'relevance', size: 5, page: 0 }),
      wantManga
        ? workApi.getCatalog({ formato: 'manga', ordem: 'views', size: 6, page: 0 })
        : Promise.resolve(null),
      wantNovel
        ? workApi.getCatalog({ formato: 'light-novel', ordem: 'views', size: 6, page: 0 })
        : Promise.resolve(null),
      workApi.getReleases(param, 40),
    ])
      .then(([heroPage, mangaPage, novelPage, releases]) => {
        if (current !== requestId.current) return;
        setState({
          hero: heroPage.items.map(mapCatalogToWork),
          trendingManga: (mangaPage?.items ?? []).map(mapCatalogToWork),
          trendingLightNovel: (novelPage?.items ?? []).map(mapCatalogToWork),
          releases: releases.map(mapRelease),
          loading: false,
          error: '',
        });
      })
      .catch((error: unknown) => {
        if (current !== requestId.current) return;
        setState({
          hero: [],
          trendingManga: [],
          trendingLightNovel: [],
          releases: [],
          loading: false,
          error:
            error instanceof Error && error.message
              ? error.message
              : 'Não foi possível carregar a home agora.',
        });
      });
  }, [formato]);

  return state;
}

/** Agrupa lançamentos por obra, mantendo no máximo `perWork` capítulos recentes por obra. */
export function groupReleasesByWork(releases: ReleaseRow[], perWork = 3) {
  const groups = new Map<
    string,
    { work: Work; chapters: ReleaseRow[]; latestAt: string }
  >();

  for (const release of releases) {
    const existing = groups.get(release.workId);
    if (existing) {
      if (existing.chapters.length < perWork) existing.chapters.push(release);
      continue;
    }
    groups.set(release.workId, {
      work: {
        id: release.workId,
        slug: release.workSlug,
        title: release.workTitle,
        authorId: '',
        authorName: '',
        coverUrl: release.coverUrl,
        bannerUrl: release.coverUrl,
        synopsis: '',
        genres: [],
        status: 'ongoing',
        format: release.format,
        totalChapters: release.totalChapters,
        totalViews: release.totalViews,
        totalLikes: 0,
        totalFavorites: release.totalFavorites,
        totalComments: 0,
        rating: 0,
        updatedAt: release.publishedAt,
      },
      chapters: [release],
      latestAt: release.publishedAt,
    });
  }

  return Array.from(groups.values()).sort(
    (a, b) => Date.parse(b.latestAt) - Date.parse(a.latestAt)
  );
}

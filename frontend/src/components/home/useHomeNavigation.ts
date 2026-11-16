import { useEffect, useMemo, useState } from 'react';
import { Work, Chapter } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { workApi } from '../../api/workApi';
import { userApi, ReadingProgressDto } from '../../api/authApi';
import { mapWorkDetailsToWork, ReleaseRow } from '../../utils/apiMappers';
import { isChapterEarlyAccess } from '../../utils/discoveryAlgorithm';
import {
  FormatFilter,
  formatFromParam,
  formatToParam,
  isLightNovel,
  dayLabel,
} from '../../utils/formatMeta';
import { groupReleasesByWork, useHomeDiscovery } from '../../hooks/useHomeDiscovery';

const HOME_FORMAT_PARAM = 'inicio';

function readHomeFormat(search: string): FormatFilter {
  const raw = new URLSearchParams(search).get(HOME_FORMAT_PARAM);
  return formatFromParam(raw);
}

export interface UseHomeNavigationProps {
  onSelectWork: (work: Work) => void;
  onOpenChapter: (work: Work, chapter: Chapter, page?: number) => void;
}

export function useHomeNavigation({ onSelectWork, onOpenChapter }: UseHomeNavigationProps) {
  const { isAuthenticated, isMemberOf } = useAuth();

  const [formato, setFormato] = useState<FormatFilter>(() => readHomeFormat(window.location.search));
  const [heroIndex, setHeroIndex] = useState(0);
  const [progress, setProgress] = useState<ReadingProgressDto | null>(null);

  const discovery = useHomeDiscovery(formato);

  // Formato na URL (?inicio=light-novel): link compartilhado e F5 preservam o recorte
  useEffect(() => {
    const onPopState = () => {
      setFormato(readHomeFormat(window.location.search));
      setHeroIndex(0);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const applyFormat = (next: FormatFilter) => {
    setFormato(next);
    setHeroIndex(0);
    const url = new URL(window.location.href);
    const param = formatToParam(next);
    if (param) url.searchParams.set(HOME_FORMAT_PARAM, param);
    else url.searchParams.delete(HOME_FORMAT_PARAM);
    window.history.replaceState({ tab: 'feed' }, '', `${url.pathname}${url.search}${url.hash}`);
  };

  // "Continuar lendo": só dados reais de progresso
  useEffect(() => {
    if (!isAuthenticated) {
      setProgress(null);
      return;
    }
    let active = true;
    userApi
      .getReadingProgress()
      .then((entries) => {
        if (!active) return;
        const latest = [...entries]
          .filter((entry) => entry.workSlug)
          .sort((a, b) => Date.parse(b.updatedAt ?? '') - Date.parse(a.updatedAt ?? ''))[0];
        setProgress(latest ?? null);
      })
      .catch(() => {
        if (active) setProgress(null);
      });
    return () => {
      active = false;
    };
  }, [isAuthenticated]);

  const heroWorks = discovery.hero;
  const currentHero = heroWorks.length > 0 ? heroWorks[heroIndex % heroWorks.length] : null;

  const handleReadNow = async (work: Work) => {
    try {
      const dto = await workApi.getWorkBySlug(work.slug);
      const detailed = mapWorkDetailsToWork(dto);
      const first = detailed.chapters?.[0];
      if (!first) {
        onSelectWork(detailed);
        return;
      }
      if (isChapterEarlyAccess(first) && !isMemberOf(detailed.authorId)) {
        onSelectWork(detailed);
        return;
      }
      onOpenChapter(detailed, first);
    } catch {
      onSelectWork(work);
    }
  };

  const openRelease = (release: ReleaseRow) => {
    const work: Work = {
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
    };
    const chapter: Chapter = {
      id: release.chapterId,
      workId: release.workId,
      number: release.chapterNumber,
      title: release.chapterTitle,
      coverUrl: release.coverUrl,
      pages: [],
      createdAt: release.publishedAt,
      publicReleaseAt: release.publishedAt,
      views: 0,
      likes: 0,
      commentsCount: 0,
      format: isLightNovel(release.format) ? 'PROSE' : 'IMAGE_PAGES',
    };
    onOpenChapter(work, chapter);
  };

  const progressWork: Work | null = progress?.workSlug
    ? {
        id: progress.workId,
        slug: progress.workSlug,
        title: progress.workTitle ?? '',
        authorId: '',
        authorName: '',
        coverUrl: progress.workCoverUrl ?? '',
        bannerUrl: progress.workCoverUrl ?? '',
        synopsis: '',
        genres: [],
        status: 'ongoing',
        format: progress.workFormat ?? 'MANGA',
        totalChapters: 0,
        totalViews: 0,
        totalLikes: 0,
        totalFavorites: 0,
        totalComments: 0,
        rating: 0,
        updatedAt: progress.updatedAt ?? '',
      }
    : null;

  const progressChapter: Chapter | null =
    progress && progressWork && progress.chapterId
      ? {
          id: progress.chapterId,
          workId: progress.workId,
          number: progress.chapterNumber ?? 1,
          title: progress.chapterTitle ?? '',
          coverUrl: progress.workCoverUrl ?? undefined,
          pages: [],
          createdAt: progress.updatedAt ?? '',
          publicReleaseAt: progress.updatedAt ?? '',
          views: 0,
          likes: 0,
          commentsCount: 0,
          format: isLightNovel(progressWork.format) ? 'PROSE' : 'IMAGE_PAGES',
        }
      : null;

  const recentGroups = useMemo(
    () => groupReleasesByWork(discovery.releases, 3).slice(0, 4),
    [discovery.releases]
  );

  const timeline = useMemo(() => {
    const visible = discovery.releases.slice(0, 20);
    const groups = new Map<string, ReleaseRow[]>();
    for (const release of visible) {
      const key = dayLabel(release.publishedAt);
      const list = groups.get(key);
      if (list) list.push(release);
      else groups.set(key, [release]);
    }
    return Array.from(groups.entries());
  }, [discovery.releases]);

  return {
    formato,
    applyFormat,
    heroIndex,
    setHeroIndex,
    discovery,
    heroWorks,
    currentHero,
    progress,
    progressWork,
    progressChapter,
    recentGroups,
    timeline,
    handleReadNow,
    openRelease,
  };
}

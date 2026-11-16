import { useState, useMemo, useEffect } from 'react';
import { Work, Chapter, Creator } from '../../types';
import { workApi, AuthorSummaryDto } from '../../api/workApi';
import { userApi, ReadingProgressDto } from '../../api/authApi';
import { mapChapterSummary } from '../../utils/apiMappers';
import { useAuth } from '../../context/AuthContext';
import { useModals } from '../../context/ModalContext';
import { isChapterEarlyAccess } from '../../utils/discoveryAlgorithm';
import { offlineStorage } from '../../services/offlineStorage';

export interface UseWorkDetailDataProps {
  work: Work;
  onOpenChapter: (work: Work, chapter: Chapter, page?: number) => void;
  onRequireAuth?: () => void;
}

export function useWorkDetailData({
  work,
  onOpenChapter,
  onRequireAuth,
}: UseWorkDetailDataProps) {
  const { user, toggleFavorite, isMemberOf, isAuthenticated } = useAuth();
  const { openEarlyAccess, openVip } = useModals();

  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [readingProgress, setReadingProgress] = useState<ReadingProgressDto | null>(null);
  const [workLikes, setWorkLikes] = useState(Number(work.totalLikes ?? 0));
  const [favoritesCount, setFavoritesCount] = useState(Number(work.totalFavorites ?? 0));
  const [downloadingChapterId, setDownloadingChapterId] = useState<string | null>(null);
  const [offlineChapterIds, setOfflineChapterIds] = useState<Set<string>>(() =>
    new Set(offlineStorage.getOfflineChapters().map((c) => c.chapterId))
  );

  useEffect(() => {
    const handleUpdate = () => {
      setOfflineChapterIds(new Set(offlineStorage.getOfflineChapters().map((c) => c.chapterId)));
    };
    window.addEventListener('offline-storage-updated', handleUpdate);
    return () => window.removeEventListener('offline-storage-updated', handleUpdate);
  }, []);

  const handleDownloadOffline = async (e: React.MouseEvent, chapter: Chapter) => {
    e.stopPropagation();
    if (!user?.isVip) {
      openVip();
      return;
    }
    if (offlineChapterIds.has(chapter.id)) {
      if (window.confirm(`Deseja remover o capítulo #${chapter.number} do armazenamento offline?`)) {
        await offlineStorage.removeOfflineChapter(chapter.id);
      }
      return;
    }
    try {
      setDownloadingChapterId(chapter.id);
      await offlineStorage.downloadChapterOffline(chapter.id, work.id);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Falha ao baixar capítulo para leitura offline.');
    } finally {
      setDownloadingChapterId(null);
    }
  };

  const [realChapters, setRealChapters] = useState<Chapter[] | null>(null);
  const [chaptersError, setChaptersError] = useState(false);
  const [apiAuthor, setApiAuthor] = useState<AuthorSummaryDto | null>(null);

  useEffect(() => {
    let active = true;
    setRealChapters(null);
    setChaptersError(false);
    setApiAuthor(null);

    workApi
      .getWorkBySlug(work.slug)
      .then((dto) => {
        if (!active) return;
        setApiAuthor(dto.author ?? null);
        setRealChapters((dto.chapters ?? []).map((c) => mapChapterSummary(c, dto.id)));
        setWorkLikes(Number(dto.totalLikes ?? 0));
        setFavoritesCount(Number(dto.totalFavorites ?? 0));
      })
      .catch(() => {
        if (!active) return;
        setChaptersError(true);
        setRealChapters([]);
      });

    return () => {
      active = false;
    };
  }, [work.slug]);

  const isFavorited = user.favorites.includes(work.id);

  useEffect(() => {
    setWorkLikes(Number(work.totalLikes ?? 0));
    setFavoritesCount(Number(work.totalFavorites ?? 0));
  }, [work.id, work.totalLikes, work.totalFavorites]);

  const handleToggleFavorite = async () => {
    if (!isAuthenticated) {
      onRequireAuth?.();
      return;
    }
    const result = await toggleFavorite(work.id);
    if (result) {
      setFavoritesCount(result.totalFavorites);
    }
  };

  const creator: Creator | undefined = apiAuthor
    ? {
        id: apiAuthor.authorId,
        name: apiAuthor.authorName,
        handle: apiAuthor.authorHandle.replace(/^@/, ''),
        avatarUrl: apiAuthor.authorAvatarUrl ?? '',
        bio: '',
        pixKey: '',
        pixKeyType: 'aleatoria',
        documentCpf: '',
        membershipPriceBrl: Number(apiAuthor.membershipPriceBrl),
        monthlyMembersCount: 0,
        totalDonationsBrl: 0,
        walletBalanceBrl: 0,
        pendingPayoutsBrl: 0,
        worksCount: 0,
        verified: false,
        engagementBoostMul: 1,
        missions: [],
      }
    : undefined;

  const chapters = useMemo(() => {
    const source = realChapters !== null ? realChapters : [];
    const sorted = [...source];
    sorted.sort((a, b) => (sortOrder === 'asc' ? a.number - b.number : b.number - a.number));
    return sorted;
  }, [realChapters, sortOrder]);

  const firstChapter = chapters[0];

  useEffect(() => {
    if (!user.uid || user.uid === 'guest') {
      setReadingProgress(null);
      return;
    }
    let active = true;
    userApi
      .getReadingProgress()
      .then((history) => {
        if (active) setReadingProgress(history.find((item) => item.workId === work.id) ?? null);
      })
      .catch(() => {
        if (active) setReadingProgress(null);
      });
    return () => {
      active = false;
    };
  }, [user.uid, work.id]);

  const resumeChapter = readingProgress?.chapterId
    ? chapters.find((chapter) => chapter.id === readingProgress.chapterId)
    : undefined;
  const resumePage = Math.max(1, readingProgress?.page ?? 1);
  const chapterFinished = Boolean(
    readingProgress?.page && readingProgress?.totalPages && readingProgress.page >= readingProgress.totalPages
  );

  const handleOpenWithProgress = (chapter: Chapter, page?: number) => {
    const isLocked = isChapterEarlyAccess(chapter) && !isMemberOf(work.authorId);
    if (isLocked) {
      if (creator) {
        openEarlyAccess(chapter, creator, work);
        return;
      }
    }
    onOpenChapter(work, chapter, page);
  };

  const handleChapterClick = (chapter: Chapter) => handleOpenWithProgress(chapter);

  return {
    creator,
    chapters,
    firstChapter,
    chaptersError,
    sortOrder,
    setSortOrder,
    workLikes,
    favoritesCount,
    isFavorited,
    handleToggleFavorite,
    resumeChapter,
    resumePage,
    chapterFinished,
    readingProgress,
    handleOpenWithProgress,
    handleChapterClick,
    offlineChapterIds,
    downloadingChapterId,
    handleDownloadOffline,
  };
}

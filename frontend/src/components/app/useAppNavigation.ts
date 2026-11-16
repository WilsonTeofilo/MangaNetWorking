import { useEffect, useState } from 'react';
import { AppTab } from '../layout/Header';
import { Work, Chapter } from '../../types';
import { workApi } from '../../api/workApi';
import { authApi, userApi } from '../../api/authApi';
import { mapChapterSummary, mapWorkDetailsToWork } from '../../utils/apiMappers';
import { hasCatalogParams } from '../../utils/catalogFilters';
import { useAuth } from '../../context/AuthContext';

const NAV_STORAGE_KEY = 'mn:nav';
const AUTH_RETURN_KEY = 'mn:auth-return';

interface NavSnapshot {
  tab: AppTab;
  workSlug?: string;
  chapterNumber?: number;
  profileUsername?: string;
}

interface AuthReturnTarget {
  slug: string;
  chapterNumber?: number;
}

function readAuthReturn(): AuthReturnTarget | null {
  try {
    const raw = window.sessionStorage.getItem(AUTH_RETURN_KEY);
    return raw ? (JSON.parse(raw) as AuthReturnTarget) : null;
  } catch {
    return null;
  }
}

function saveAuthReturn(target: AuthReturnTarget) {
  try {
    window.sessionStorage.setItem(AUTH_RETURN_KEY, JSON.stringify(target));
  } catch {
    // sessionStorage indisponível
  }
}

function clearAuthReturn() {
  try {
    window.sessionStorage.removeItem(AUTH_RETURN_KEY);
  } catch {
    // sessionStorage indisponível
  }
}

function readNavSnapshot(): NavSnapshot | null {
  try {
    const raw = window.sessionStorage.getItem(NAV_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as NavSnapshot) : null;
  } catch {
    return null;
  }
}

export function useAppNavigation() {
  const { refreshSession } = useAuth();

  const [paymentReturnStatus, setPaymentReturnStatus] = useState<string | null>(null);
  const [passwordResetRoute, setPasswordResetRoute] = useState(() => window.location.pathname === '/reset-password');
  const [passwordResetToken, setPasswordResetToken] = useState('');

  useEffect(() => {
    if (window.location.pathname !== '/reset-password') return;
    const token = new URLSearchParams(window.location.hash.slice(1)).get('token') ?? '';
    setPasswordResetToken(token);
    window.history.replaceState({}, '', '/reset-password');
  }, []);

  useEffect(() => {
    if (window.location.pathname !== '/vip') return;
    const status = new URLSearchParams(window.location.search).get('status');
    if (status === 'approved' || status === 'pending' || status === 'failure') {
      setPaymentReturnStatus(status);
      if (status === 'approved') void refreshSession();
    }
    window.history.replaceState({}, '', '/');
  }, [refreshSession]);

  const [currentTab, setCurrentTab] = useState<AppTab>(() => {
    if (typeof window !== 'undefined') {
      const search = window.location.search;
      if (new URLSearchParams(search).has('aba')) {
        return 'creator-dashboard';
      }
      if (hasCatalogParams(search)) {
        return 'works';
      }
    }
    return readNavSnapshot()?.tab ?? 'feed';
  });

  const [publicProfileUsername, setPublicProfileUsername] = useState(
    () => readNavSnapshot()?.profileUsername ?? ''
  );
  const [selectedWork, setSelectedWork] = useState<Work | null>(null);
  const [readingChapter, setReadingChapter] = useState<Chapter | null>(null);
  const [readingStartPage, setReadingStartPage] = useState<number | undefined>(undefined);

  const [pendingRestore, setPendingRestore] = useState<{ slug: string; chapterNumber?: number } | null>(() => {
    const nav = readNavSnapshot();
    return nav?.workSlug ? { slug: nav.workSlug, chapterNumber: nav.chapterNumber } : null;
  });

  useEffect(() => {
    if (!pendingRestore) return;
    let active = true;
    workApi
      .getWorkBySlug(pendingRestore.slug)
      .then(async (dto) => {
        if (!active) return;
        const restoredWork = mapWorkDetailsToWork(dto);
        setSelectedWork(restoredWork);
        if (pendingRestore.chapterNumber) {
          const chapter = restoredWork.chapters?.find((c) => c.number === pendingRestore.chapterNumber);
          if (chapter) {
            setReadingChapter(chapter);
            setReadingStartPage(undefined);
            const entries = await userApi.getReadingProgress().catch(() => []);
            if (!active) return;
            const entry = entries.find((item) => item.chapterId === chapter.id);
            if (entry) {
              const page = entry.page ?? 1;
              const totalPages = entry.totalPages ?? 0;
              setReadingStartPage(totalPages > 0 && page >= totalPages ? 1 : page);
            }
          }
        }
      })
      .catch(() => {
        if (active) setCurrentTab('feed');
      })
      .finally(() => {
        if (active) setPendingRestore(null);
      });
    return () => {
      active = false;
    };
  }, [pendingRestore]);

  useEffect(() => {
    if (pendingRestore) return;
    const snapshot: NavSnapshot = {
      tab: currentTab,
      workSlug: selectedWork?.slug,
      chapterNumber: readingChapter?.number,
      profileUsername: publicProfileUsername || undefined,
    };
    try {
      window.sessionStorage.setItem(NAV_STORAGE_KEY, JSON.stringify(snapshot));
    } catch {
      // sessionStorage indisponível
    }
  }, [pendingRestore, currentTab, selectedWork?.slug, readingChapter?.number, publicProfileUsername]);

  const handleSelectWork = (work: Work) => {
    setSelectedWork(work);
    setReadingChapter(null);
    setReadingStartPage(undefined);
    if (typeof window !== 'undefined') {
      const snapshot: NavSnapshot = {
        tab: currentTab,
        workSlug: work.slug,
      };
      window.history.pushState(snapshot, '', window.location.pathname);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Registra entrada inicial no histórico se ainda não existir
    const currentState = window.history.state as NavSnapshot | null;
    if (!currentState || !currentState.tab) {
      window.history.replaceState({ tab: currentTab }, '', window.location.href);
    }

    const handlePopState = (event: PopStateEvent) => {
      const state = event.state as NavSnapshot | null;
      if (!state) {
        setSelectedWork(null);
        setReadingChapter(null);
        setCurrentTab('feed');
        return;
      }

      setCurrentTab(state.tab || 'feed');
      setPublicProfileUsername(state.profileUsername || '');

      if (state.workSlug) {
        workApi
          .getWorkBySlug(state.workSlug)
          .then((dto) => {
            const restored = mapWorkDetailsToWork(dto);
            setSelectedWork(restored);
            if (state.chapterNumber) {
              const chap = restored.chapters?.find((c) => c.number === state.chapterNumber);
              setReadingChapter(chap || null);
            } else {
              setReadingChapter(null);
            }
          })
          .catch(() => {
            setSelectedWork(null);
            setReadingChapter(null);
          });
      } else {
        setSelectedWork(null);
        setReadingChapter(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentTab]);

  useEffect(() => {
    const onOpenWork = (event: Event) => {
      const slug = (event as CustomEvent<{ slug?: string }>).detail?.slug;
      if (!slug) return;
      workApi
        .getWorkBySlug(slug)
        .then((dto) => {
          setCurrentTab('feed');
          setSelectedWork(mapWorkDetailsToWork(dto));
          setReadingChapter(null);
          setReadingStartPage(undefined);
        })
        .catch(() => {});
    };
    window.addEventListener('mn:open-work', onOpenWork);
    return () => window.removeEventListener('mn:open-work', onOpenWork);
  }, []);

  const handleOpenChapter = (work: Work, chapter: Chapter, page?: number) => {
    setSelectedWork(work);
    setReadingChapter(chapter);
    setReadingStartPage(page);
    if (typeof window !== 'undefined') {
      const snapshot: NavSnapshot = {
        tab: currentTab,
        workSlug: work.slug,
        chapterNumber: chapter.number,
      };
      window.history.pushState(snapshot, '', window.location.pathname);
    }
  };

  const handleNavigateChapter = (nextNumber: number) => {
    if (!selectedWork) return;
    setReadingStartPage(undefined);
    workApi
      .getWorkBySlug(selectedWork.slug)
      .then((dto) => {
        const found = (dto.chapters ?? []).find((c) => c.chapterNumber === nextNumber);
        if (found) {
          setReadingChapter(mapChapterSummary(found, dto.id));
        }
      })
      .catch((err) => {
        console.warn('[App] Capítulo não encontrado ou erro de rede:', err);
      });
  };

  const handleSwitchTab = (tab: AppTab) => {
    const isDifferent =
      tab !== currentTab || selectedWork !== null || readingChapter !== null;

    setSelectedWork(null);
    setReadingChapter(null);
    setCurrentTab(tab);

    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      let paramsChanged = false;

      if (tab !== 'creator-dashboard' && searchParams.has('aba')) {
        searchParams.delete('aba');
        paramsChanged = true;
      }

      if (tab !== 'works' && hasCatalogParams(window.location.search)) {
        if (isDifferent) {
          window.history.pushState({ tab }, '', window.location.pathname);
        } else {
          window.history.replaceState({ tab }, '', window.location.pathname);
        }
        return;
      }

      const query = searchParams.toString();
      const nextUrl = window.location.pathname + (query ? `?${query}` : '');

      if (isDifferent) {
        window.history.pushState({ tab }, '', nextUrl);
      } else if (paramsChanged) {
        window.history.replaceState({ tab }, '', nextUrl);
      }
    }
  };

  const handleRequireAuth = () => {
    if (selectedWork) {
      saveAuthReturn({
        slug: selectedWork.slug,
        chapterNumber: readingChapter?.number,
      });
    }
    handleSwitchTab('login');
  };

  const restoreAuthReturn = async (): Promise<boolean> => {
    const target = readAuthReturn();
    if (!target) return false;
    try {
      const dto = await workApi.getWorkBySlug(target.slug);
      const restoredWork = mapWorkDetailsToWork(dto);
      const chapter = target.chapterNumber
        ? restoredWork.chapters?.find((item) => item.number === target.chapterNumber) ?? null
        : null;
      setCurrentTab('feed');
      setSelectedWork(restoredWork);
      setReadingChapter(chapter);
      setReadingStartPage(undefined);
      if (chapter) {
        try {
          window.sessionStorage.setItem('mn:scroll-comments', '1');
        } catch {
          // ignore
        }
      }
      return true;
    } catch {
      return false;
    } finally {
      clearAuthReturn();
    }
  };

  const openPublicProfile = (username: string) => {
    setPublicProfileUsername(username);
    setSelectedWork(null);
    setReadingChapter(null);
    setCurrentTab('public-profile');
    if (typeof window !== 'undefined') {
      window.history.pushState(
        { tab: 'public-profile', profileUsername: username },
        '',
        window.location.pathname
      );
    }
  };

  const handleLoginSuccess = async () => {
    const session = await authApi.me().catch(() => null);
    await refreshSession();
    const needsOnboarding = session ? !session.profileOnboardingCompleted : false;
    if (needsOnboarding) {
      handleSwitchTab('onboarding');
      return;
    }
    const restored = await restoreAuthReturn();
    if (!restored) {
      handleSwitchTab('feed');
    }
  };

  const handleProfileSaved = async () => {
    const restored = await restoreAuthReturn();
    if (!restored) {
      handleSwitchTab('feed');
    }
  };

  return {
    paymentReturnStatus,
    setPaymentReturnStatus,
    passwordResetRoute,
    setPasswordResetRoute,
    passwordResetToken,
    currentTab,
    setCurrentTab,
    publicProfileUsername,
    selectedWork,
    setSelectedWork,
    readingChapter,
    setReadingChapter,
    readingStartPage,
    setReadingStartPage,
    handleSelectWork,
    handleOpenChapter,
    handleNavigateChapter,
    handleSwitchTab,
    handleRequireAuth,
    openPublicProfile,
    handleLoginSuccess,
    handleProfileSaved,
    clearAuthReturn,
  };
}

import { useEffect, useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { ModalProvider } from './context/ModalContext';
import { Header, AppTab } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { HomePage } from './pages/HomePage';
import { CatalogPage } from './pages/CatalogPage';
import { hasCatalogParams } from './utils/catalogFilters';
import { BibliotecaPage } from './pages/BibliotecaPage';
import { WorkDetailPage } from './pages/WorkDetailPage';
import { LoginPage } from './pages/LoginPage';
import { PasswordResetPage } from './pages/PasswordResetPage';
import { ReaderProfilePage } from './pages/ReaderProfilePage';
import { CreatorDashboardPage } from './pages/CreatorDashboardPage';
import { CreatorMissionsPage } from './pages/CreatorMissionsPage';
import { CreatorAnalyticsPage } from './pages/CreatorAnalyticsPage';
import { CreatorWorksPage } from './pages/CreatorWorksPage';
import { CreatorChaptersPage } from './pages/CreatorChaptersPage';
import { CreatorMonetizationPage } from './pages/CreatorMonetizationPage';
import { AccountProfilePage } from './pages/AccountProfilePage';
import { BecomeWriterPage } from './pages/BecomeWriterPage';
import { PublicProfilePage } from './pages/PublicProfilePage';
import { OnboardingPage } from './pages/OnboardingPage';
import { ModerationBackofficePage } from './pages/ModerationBackofficePage';
import { ReaderPage } from './pages/ReaderPage';
import { SobrePage } from './pages/SobrePage';
import { DonateModal } from './components/modals/DonateModal';
import { MembershipModal } from './components/modals/MembershipModal';
import { EarlyAccessModal } from './components/modals/EarlyAccessModal';
import { VipModal } from './components/modals/VipModal';
import { ReportModal } from './components/modals/ReportModal';
import { Work, Chapter } from './types';
import { MOCK_CHAPTERS } from './data/mockData';
import { workApi } from './api/workApi';
import { authApi, userApi } from './api/authApi';
import { mapChapterSummary, mapWorkDetailsToWork } from './utils/apiMappers';
import { useAuth } from './context/AuthContext';

/** Chave do snapshot de navegação — mantém a tela atual no F5 (o app não usa rotas). */
const NAV_STORAGE_KEY = 'mn:nav';
/** Destino salvo quando um visitante tenta comentar/favoritar e precisa entrar. */
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
    // sessionStorage indisponível: o login ainda funciona, só não volta ao ponto exato.
  }
}

function clearAuthReturn() {
  try {
    window.sessionStorage.removeItem(AUTH_RETURN_KEY);
  } catch {
    // sessionStorage indisponível: nada a limpar.
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

function AppContent() {
  const { refreshSession, user, isAuthenticated, acceptCurrentPrivacyPolicy, logout, favoriteNotice, dismissFavoriteNotice } = useAuth();
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
    // Link compartilhado com filtro de catálogo (`?formato=light-novel`) abre o catálogo.
    if (typeof window !== 'undefined' && hasCatalogParams(window.location.search)) {
      return 'works';
    }
    return readNavSnapshot()?.tab ?? 'feed';
  });
  const [publicProfileUsername, setPublicProfileUsername] = useState(
    () => readNavSnapshot()?.profileUsername ?? ''
  );
  const [selectedWork, setSelectedWork] = useState<Work | null>(null);
  const [readingChapter, setReadingChapter] = useState<Chapter | null>(null);
  /** Página em que o leitor deve abrir o capítulo (continuar de onde parou). */
  const [readingStartPage, setReadingStartPage] = useState<number | undefined>(undefined);
  /** Obra/capítulo a reabrir depois do F5 (recarregados da API pelo slug). */
  const [pendingRestore, setPendingRestore] = useState<{ slug: string; chapterNumber?: number } | null>(() => {
    const nav = readNavSnapshot();
    return nav?.workSlug ? { slug: nav.workSlug, chapterNumber: nav.chapterNumber } : null;
  });
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [privacyError, setPrivacyError] = useState('');

  /** Reabre a obra/capítulo de onde o F5 interrompeu (o app guarda a tela em sessionStorage). */
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
            // Volta para a página exata em que o leitor estava antes do F5.
            // O `await` mantém `active` válido até o fim (o cleanup do efeito só
            // acontece depois que `pendingRestore` vira null).
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
        // Obra removida/offline: volta para o feed em vez de ficar preso no loading.
        if (active) setCurrentTab('feed');
      })
      .finally(() => {
        if (active) setPendingRestore(null);
      });
    return () => {
      active = false;
    };
  }, [pendingRestore]);

  /** Mantém a tela atual no snapshot para o F5 não voltar ao feed. */
  useEffect(() => {
    // Não sobrescreve o snapshot antes de a restauração terminar: um segundo F5
    // durante o carregamento perderia a obra que estava sendo reaberta.
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
      // sessionStorage indisponível (modo privado restrito): navegação segue normal.
    }
  }, [pendingRestore, currentTab, selectedWork?.slug, readingChapter?.number, publicProfileUsername]);

  // Ao selecionar uma obra, abre a Página de Banner/Detalhes da Obra (WorkDetailPage)
  const handleSelectWork = (work: Work) => {
    setSelectedWork(work);
    setReadingChapter(null);
    setReadingStartPage(undefined);
  };

  // Destino real das notificações internas: abre a obra pelo slug sem recarregar o app.
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

  // Ao selecionar um capítulo específico, abre o leitor (ReaderPage).
  // `page` opcional retoma a leitura exatamente onde o leitor parou.
  const handleOpenChapter = (work: Work, chapter: Chapter, page?: number) => {
    setSelectedWork(work);
    setReadingChapter(chapter);
    setReadingStartPage(page);
  };

  const handleNavigateChapter = (nextNumber: number) => {
    if (!selectedWork) return;
    setReadingStartPage(undefined);

    const fallbackToMock = () => {
      if (!import.meta.env.DEV) return;
      const nextCap = MOCK_CHAPTERS.find(
        (c) => c.workId === selectedWork.id && c.number === nextNumber
      );
      if (nextCap) {
        setReadingChapter(nextCap);
      }
    };

    // Tenta resolver o capítulo na obra real (API); cai no mock se indisponível.
    workApi
      .getWorkBySlug(selectedWork.slug)
      .then((dto) => {
        const found = (dto.chapters ?? []).find((c) => c.chapterNumber === nextNumber);
        if (found) {
          setReadingChapter(mapChapterSummary(found, dto.id));
        } else {
          fallbackToMock();
        }
      })
      .catch(() => fallbackToMock());
  };

  const handleSwitchTab = (tab: AppTab) => {
    setSelectedWork(null);
    setReadingChapter(null);
    setCurrentTab(tab);
    // Sair do catálogo limpa o estado de filtros da URL: outro link não herda o recorte.
    if (tab !== 'works' && typeof window !== 'undefined' && hasCatalogParams(window.location.search)) {
      window.history.replaceState({ tab }, '', window.location.pathname);
    }
  };

  /** Visitante tentou comentar/favoritar: guarda o destino e abre login/cadastro. */
  const handleRequireAuth = () => {
    if (selectedWork) {
      saveAuthReturn({
        slug: selectedWork.slug,
        chapterNumber: readingChapter?.number,
      });
    }
    handleSwitchTab('login');
  };

  /** Reabre a obra/capítulo (e a conversa) salvos antes do login. */
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
          // Sem sessionStorage, o usuário volta ao capítulo mas não rola automaticamente.
        }
      }
      return true;
    } catch {
      return false;
    } finally {
      clearAuthReturn();
    }
  };

  /** Abre a página pública de um username (pelo próprio perfil ou pelo link de um autor). */
  const openPublicProfile = (username: string) => {
    setPublicProfileUsername(username);
    handleSwitchTab('public-profile');
  };

  /**
   * Depois do login: o servidor decide se ainda falta montar o perfil.
   * Lemos a sessão RECÉM-ADQUIRIDA (não o `user` antigo da closure, que era a causa
   * de todo login cair no onboarding mesmo com o perfil pronto).
   */
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

  /** Onboarding de conta nova: se veio de um comentário, volta para ele. */
  const handleProfileSaved = async () => {
    const restored = await restoreAuthReturn();
    if (!restored) {
      handleSwitchTab('feed');
    }
  };

  if (passwordResetRoute) {
    return <PasswordResetPage token={passwordResetToken} onBackToLogin={() => {
      window.history.replaceState({}, '', '/');
      setPasswordResetRoute(false);
      handleSwitchTab('login');
    }} />;
  }

  if (isAuthenticated && user.privacyConsentRequired) {
    return (
      <main className="min-h-screen bg-[var(--mn-ink)] p-6 text-[var(--mn-paper)]">
        <section role="dialog" aria-modal="true" aria-labelledby="privacy-reaccept-title" className="mx-auto mt-16 max-w-xl border-2 border-[var(--mn-yellow)] bg-[var(--mn-ink-2)] p-6 shadow-[6px_6px_0_var(--mn-yellow)]">
          <h1 id="privacy-reaccept-title" className="font-display text-2xl uppercase">Política atualizada</h1>
          <p className="mt-3 text-sm leading-relaxed text-[var(--mn-mute)]">
            A versão {user.privacyPolicyVersion} exige novo aceite antes de continuar. A versão anterior não será considerada aceite desta política.
          </p>
          <p className="mt-4 text-sm">Consulte a Política de Privacidade publicada pelo projeto antes de confirmar o aceite.</p>
          <label className="mt-5 flex items-start gap-3 text-sm">
            <input autoFocus type="checkbox" checked={privacyAccepted} onChange={(event) => setPrivacyAccepted(event.target.checked)} className="mt-1 h-4 w-4 accent-[var(--mn-yellow)]" />
            Li e aceito a versão {user.privacyPolicyVersion}.
          </label>
          {privacyError && <p role="alert" className="mt-3 text-sm text-[var(--mn-red)]">{privacyError}</p>}
          <div className="mt-6 flex flex-wrap gap-3">
            <button disabled={!privacyAccepted} onClick={() => void acceptCurrentPrivacyPolicy().catch(() => setPrivacyError('Não foi possível registrar seu aceite. Tente novamente.'))} className="mn-on-yellow border-2 border-[var(--mn-yellow)] bg-[var(--mn-yellow)] px-4 py-2 font-pixel text-xs text-[var(--mn-ink)] disabled:cursor-not-allowed disabled:opacity-50">ACEITAR E CONTINUAR</button>
            <button onClick={() => void logout()} className="border-2 border-[var(--mn-paper)] px-4 py-2 font-pixel text-xs text-[var(--mn-paper)]">SAIR</button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <>
        {/* 1. Tela do Leitor do Mangá (Página do Mangá) */}
        {readingChapter && selectedWork ? (
          <ReaderPage
            work={selectedWork}
            chapter={readingChapter}
            initialPage={readingStartPage}
            onBack={() => {
              setReadingChapter(null);
              setReadingStartPage(undefined);
            }}
            onNavigateChapter={handleNavigateChapter}
            onRequireAuth={handleRequireAuth}
          />
        ) : selectedWork ? (
          /* 2. Tela de Detalhes da Obra com Banner (Página de Banner / Dentro do Catálogo) */
          <div className="min-h-screen bg-[#0B0B0C] text-[#F4EFE3] flex flex-col font-body selection:bg-[#FFD400] selection:text-[#0B0B0C]">
            <Header
              currentTab={currentTab}
              setCurrentTab={handleSwitchTab}
              onOpenLogin={() => handleSwitchTab('login')}
            />
            <main className="flex-1 w-full">
              <WorkDetailPage
                work={selectedWork}
                onBackToCatalog={() => setSelectedWork(null)}
                onOpenChapter={handleOpenChapter}
                onRequireAuth={handleRequireAuth}
              />
            </main>
            <Footer />
          </div>
        ) : currentTab === 'login' ? (
          /* 3. Tela de Login MangaTeofilo Tempestuosa */
          <LoginPage
            onBackToFeed={() => {
              clearAuthReturn();
              handleSwitchTab('feed');
            }}
            onLoginSuccess={handleLoginSuccess}
          />
        ) : (
          /* 4. Telas Principais (Feed, Catálogo, Biblioteca, Workspace) */
          <div className="min-h-screen bg-[#0B0B0C] text-[#F4EFE3] flex flex-col font-body selection:bg-[#FFD400] selection:text-[#0B0B0C]">
            <Header
              currentTab={currentTab}
              setCurrentTab={handleSwitchTab}
              onOpenLogin={() => handleSwitchTab('login')}
              publicProfileUsername={publicProfileUsername}
            />

            <main className="flex-1 w-full">
              {currentTab === 'feed' && (
                <HomePage
                  onSelectWork={handleSelectWork}
                  onOpenChapter={handleOpenChapter}
                  onNavigateToCatalog={() => handleSwitchTab('works')}
                  onPublishWork={() => handleSwitchTab('become-writer')}
                />
              )}

              {currentTab === 'works' && (
                <CatalogPage
                  onSelectWork={handleSelectWork}
                  onPublishWork={() => handleSwitchTab('become-writer')}
                />
              )}

              {currentTab === 'about' && (
                <SobrePage
                  onBackToFeed={() => handleSwitchTab('feed')}
                  onExplore={() => handleSwitchTab('works')}
                />
              )}

              {currentTab === 'library' && (
                <BibliotecaPage
                  onSelectWork={handleSelectWork}
                  onOpenChapter={handleOpenChapter}
                  onNavigateToCatalog={() => handleSwitchTab('works')}
                />
              )}

              {currentTab === 'reader-profile' && (
                <ReaderProfilePage onSelectWork={handleSelectWork} />
              )}

              {currentTab === 'account' && (
                <AccountProfilePage
                  onOpenPublicProfile={openPublicProfile}
                  onOpenReaderPanel={() => handleSwitchTab('reader-profile')}
                  onBecomeWriter={() => handleSwitchTab('become-writer')}
                />
              )}

              {currentTab === 'become-writer' && (
                <BecomeWriterPage onBackToAccount={() => handleSwitchTab('account')} />
              )}

              {currentTab === 'onboarding' && (
                <OnboardingPage
                  onOpenPublicProfile={openPublicProfile}
                  onProfileSaved={handleProfileSaved}
                />
              )}

              {currentTab === 'public-profile' && (
                <PublicProfilePage username={publicProfileUsername || user.username || ''} />
              )}

              {currentTab === 'creator-dashboard' && (
                <CreatorDashboardPage onOpenPublicProfile={openPublicProfile} />
              )}

              {currentTab === 'creator-missions' && (
                <CreatorMissionsPage />
              )}

              {currentTab === 'creator-analytics' && (
                <CreatorAnalyticsPage />
              )}

              {currentTab === 'creator-works' && (
                <CreatorWorksPage />
              )}

              {currentTab === 'creator-chapters' && (
                <CreatorChaptersPage />
              )}

              {currentTab === 'creator-monetization' && (
                <CreatorMonetizationPage />
              )}

              {currentTab === 'moderation' && (
                <ModerationBackofficePage onBack={() => handleSwitchTab('feed')} />
              )}
            </main>

            <Footer />
          </div>
        )}

        {favoriteNotice && (
          <div role="status" className="fixed inset-x-4 top-20 z-[100] mx-auto max-w-lg border-2 border-[var(--mn-yellow)] bg-[var(--mn-ink)] p-4 text-[var(--mn-paper)] shadow-[4px_4px_0_var(--mn-yellow)]">
            <p className="font-display text-lg uppercase">Biblioteca</p>
            <p className="mt-1 text-sm">{favoriteNotice}</p>
            <button className="mt-3 underline focus-visible:outline" onClick={dismissFavoriteNotice}>Fechar aviso</button>
          </div>
        )}

        {paymentReturnStatus && (
          <div role="status" className="fixed inset-x-4 top-20 z-[100] mx-auto max-w-lg border-2 border-[var(--mn-yellow)] bg-[var(--mn-ink)] p-4 text-[var(--mn-paper)] shadow-[4px_4px_0_var(--mn-yellow)]">
            <p className="font-display text-lg uppercase">
              {paymentReturnStatus === 'approved' ? 'Pagamento recebido' : paymentReturnStatus === 'pending' ? 'Pagamento pendente' : 'Pagamento não concluído'}
            </p>
            <p className="mt-1 text-sm">
              {paymentReturnStatus === 'approved' ? 'Estamos atualizando sua assinatura VIP após confirmação segura do Mercado Pago.' : paymentReturnStatus === 'pending' ? 'Aguarde a confirmação do Mercado Pago. Seu VIP não será ativado antes da aprovação.' : 'Nenhuma cobrança foi confirmada. Você pode tentar novamente.'}
            </p>
            <button className="mt-3 underline focus-visible:outline" onClick={() => setPaymentReturnStatus(null)}>Fechar aviso</button>
          </div>
        )}

        {/* Modais Globais Táteis */}
        <DonateModal />
        <MembershipModal />
        <EarlyAccessModal />
        <VipModal />
        <ReportModal />
    </>
  );
}

export function App() {
  return (
    <AuthProvider>
      <ModalProvider>
        <AppContent />
      </ModalProvider>
    </AuthProvider>
  );
}

export default App;

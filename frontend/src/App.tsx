import { useEffect, useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { ModalProvider } from './context/ModalContext';
import { Header, AppTab } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { HomePage } from './pages/HomePage';
import { CatalogPage } from './pages/CatalogPage';
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
import { authApi } from './api/authApi';
import { mapChapterSummary } from './utils/apiMappers';
import { useAuth } from './context/AuthContext';

function AppContent() {
  const { refreshSession, user, isAuthenticated, acceptCurrentPrivacyPolicy, logout } = useAuth();
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

  const [currentTab, setCurrentTab] = useState<AppTab>('feed');
  const [publicProfileUsername, setPublicProfileUsername] = useState('');
  const [selectedWork, setSelectedWork] = useState<Work | null>(null);
  const [readingChapter, setReadingChapter] = useState<Chapter | null>(null);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [privacyError, setPrivacyError] = useState('');

  // Ao selecionar uma obra, abre a Página de Banner/Detalhes da Obra (WorkDetailPage)
  const handleSelectWork = (work: Work) => {
    setSelectedWork(work);
    setReadingChapter(null);
  };

  // Ao selecionar um capítulo específico, abre o leitor (ReaderPage)
  const handleOpenChapter = (work: Work, chapter: Chapter) => {
    setSelectedWork(work);
    setReadingChapter(chapter);
  };

  const handleNavigateChapter = (nextNumber: number) => {
    if (!selectedWork) return;

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
    handleSwitchTab(needsOnboarding ? 'onboarding' : 'feed');
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
            onBack={() => setReadingChapter(null)}
            onNavigateChapter={handleNavigateChapter}
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
              />
            </main>
            <Footer />
          </div>
        ) : currentTab === 'login' ? (
          /* 3. Tela de Login MangaTeofilo Tempestuosa */
          <LoginPage
            onBackToFeed={() => handleSwitchTab('feed')}
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
                />
              )}

              {currentTab === 'works' && (
                <CatalogPage onSelectWork={handleSelectWork} />
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
                  onProfileSaved={() => handleSwitchTab('feed')}
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

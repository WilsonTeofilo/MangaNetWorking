import { lazy, Suspense } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ModalProvider } from './context/ModalContext';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { useAppNavigation } from './components/app/useAppNavigation';
import { PrivacyConsentGate } from './components/app/PrivacyConsentGate';
import { GlobalAppNotices } from './components/app/GlobalAppNotices';
import { AppTabRouter } from './components/app/AppTabRouter';

const WorkDetailPage = lazy(() => import('./pages/WorkDetailPage').then((m) => ({ default: m.WorkDetailPage })));
const LoginPage = lazy(() => import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const PasswordResetPage = lazy(() => import('./pages/PasswordResetPage').then((m) => ({ default: m.PasswordResetPage })));
const ReaderPage = lazy(() => import('./pages/ReaderPage').then((m) => ({ default: m.ReaderPage })));

function RouteLoadingFallback() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center py-24 text-center">
      <p className="font-pixel text-xs text-[var(--mn-mute)] uppercase tracking-wider animate-pulse">
        Carregando...
      </p>
    </div>
  );
}

function AppContent() {
  const { user, isAuthenticated } = useAuth();
  const nav = useAppNavigation();

  if (nav.passwordResetRoute) {
    return (
      <Suspense fallback={<RouteLoadingFallback />}>
        <PasswordResetPage
          token={nav.passwordResetToken}
          onBackToLogin={() => {
            window.history.replaceState({}, '', '/');
            nav.setPasswordResetRoute(false);
            nav.handleSwitchTab('login');
          }}
        />
      </Suspense>
    );
  }

  if (isAuthenticated && user.privacyConsentRequired) {
    return <PrivacyConsentGate />;
  }

  return (
    <>
      {nav.readingChapter && nav.selectedWork ? (
        <Suspense fallback={<RouteLoadingFallback />}>
          <ReaderPage
            work={nav.selectedWork}
            chapter={nav.readingChapter}
            initialPage={nav.readingStartPage}
            onBack={() => {
              if (typeof window !== 'undefined' && window.history.state?.chapterNumber) {
                window.history.back();
              } else {
                nav.setReadingChapter(null);
                nav.setReadingStartPage(undefined);
              }
            }}
            onNavigateChapter={nav.handleNavigateChapter}
            onRequireAuth={nav.handleRequireAuth}
          />
        </Suspense>
      ) : nav.selectedWork ? (
        <div className="min-h-screen bg-[var(--mn-ink)] text-[var(--mn-paper)] flex flex-col font-body selection:bg-[var(--mn-yellow)] selection:text-[var(--mn-ink)]">
          <Header
            currentTab={nav.currentTab}
            setCurrentTab={nav.handleSwitchTab}
            onOpenLogin={() => nav.handleSwitchTab('login')}
            publicProfileUsername={nav.publicProfileUsername}
            onOpenPublicProfile={nav.openPublicProfile}
          />
          <main className="flex-1 w-full">
            <Suspense fallback={<RouteLoadingFallback />}>
              <WorkDetailPage
                work={nav.selectedWork}
                onBackToCatalog={() => {
                  if (typeof window !== 'undefined' && window.history.state?.workSlug) {
                    window.history.back();
                  } else {
                    nav.setSelectedWork(null);
                  }
                }}
                onOpenChapter={nav.handleOpenChapter}
                onRequireAuth={nav.handleRequireAuth}
                onOpenPublicProfile={nav.openPublicProfile}
              />
            </Suspense>
          </main>
          <Footer />
        </div>
      ) : nav.currentTab === 'login' ? (
        <Suspense fallback={<RouteLoadingFallback />}>
          <LoginPage
            onBackToFeed={() => {
              nav.clearAuthReturn();
              nav.handleSwitchTab('feed');
            }}
            onLoginSuccess={nav.handleLoginSuccess}
          />
        </Suspense>
      ) : (
        <div className="min-h-screen bg-[var(--mn-ink)] text-[var(--mn-paper)] flex flex-col font-body selection:bg-[var(--mn-yellow)] selection:text-[var(--mn-ink)]">
          <Header
            currentTab={nav.currentTab}
            setCurrentTab={nav.handleSwitchTab}
            onOpenLogin={() => nav.handleSwitchTab('login')}
            publicProfileUsername={nav.publicProfileUsername}
            onOpenPublicProfile={nav.openPublicProfile}
          />
          <main className="flex-1 w-full">
            <AppTabRouter
              currentTab={nav.currentTab}
              publicProfileUsername={nav.publicProfileUsername}
              authUsername={user?.username}
              onSelectWork={nav.handleSelectWork}
              onOpenChapter={nav.handleOpenChapter}
              onSwitchTab={nav.handleSwitchTab}
              onOpenPublicProfile={nav.openPublicProfile}
              onProfileSaved={nav.handleProfileSaved}
            />
          </main>
          <Footer />
        </div>
      )}

      <GlobalAppNotices
        paymentReturnStatus={nav.paymentReturnStatus}
        onClearPaymentStatus={() => nav.setPaymentReturnStatus(null)}
      />
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

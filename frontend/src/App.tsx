import { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { ModalProvider } from './context/ModalContext';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { HomePage } from './pages/HomePage';
import { CatalogPage } from './pages/CatalogPage';
import { BibliotecaPage } from './pages/BibliotecaPage';
import { WorkDetailPage } from './pages/WorkDetailPage';
import { LoginPage } from './pages/LoginPage';
import { ReaderProfilePage } from './pages/ReaderProfilePage';
import { CreatorWorkspacePage } from './pages/CreatorWorkspacePage';
import { ReaderPage } from './pages/ReaderPage';
import { DonateModal } from './components/modals/DonateModal';
import { MembershipModal } from './components/modals/MembershipModal';
import { EarlyAccessModal } from './components/modals/EarlyAccessModal';
import { Work, Chapter } from './types';
import { MOCK_CHAPTERS } from './data/mockData';

export function App() {
  const [currentTab, setCurrentTab] = useState<
    'feed' | 'works' | 'library' | 'creator-workspace' | 'reader-profile' | 'login'
  >('feed');
  const [selectedWork, setSelectedWork] = useState<Work | null>(null);
  const [readingChapter, setReadingChapter] = useState<Chapter | null>(null);

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
    const nextCap = MOCK_CHAPTERS.find(
      (c) => c.workId === selectedWork.id && c.number === nextNumber
    );
    if (nextCap) {
      setReadingChapter(nextCap);
    }
  };

  const handleSwitchTab = (
    tab: 'feed' | 'works' | 'library' | 'creator-workspace' | 'reader-profile' | 'login'
  ) => {
    setSelectedWork(null);
    setReadingChapter(null);
    setCurrentTab(tab);
  };

  return (
    <AuthProvider>
      <ModalProvider>
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
            onLoginSuccess={() => handleSwitchTab('feed')}
          />
        ) : (
          /* 4. Telas Principais (Feed, Catálogo, Biblioteca, Workspace) */
          <div className="min-h-screen bg-[#0B0B0C] text-[#F4EFE3] flex flex-col font-body selection:bg-[#FFD400] selection:text-[#0B0B0C]">
            <Header
              currentTab={currentTab}
              setCurrentTab={handleSwitchTab}
              onOpenLogin={() => handleSwitchTab('login')}
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

              {currentTab === 'library' && (
                <BibliotecaPage
                  onSelectWork={handleSelectWork}
                  onOpenChapter={handleOpenChapter}
                  onNavigateToCatalog={() => handleSwitchTab('works')}
                />
              )}

              {currentTab === 'reader-profile' && (
                <div className="max-w-7xl mx-auto px-4 py-6">
                  <ReaderProfilePage onSelectWork={handleSelectWork} />
                </div>
              )}

              {currentTab === 'creator-workspace' && (
                <div className="max-w-7xl mx-auto px-4 py-6">
                  <CreatorWorkspacePage />
                </div>
              )}
            </main>

            <Footer />
          </div>
        )}

        {/* Modais Globais Táteis */}
        <DonateModal />
        <MembershipModal />
        <EarlyAccessModal />
      </ModalProvider>
    </AuthProvider>
  );
}

export default App;

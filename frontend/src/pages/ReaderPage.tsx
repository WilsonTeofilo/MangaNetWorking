import { useState, useEffect } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, Heart, Flag } from 'lucide-react';
import { Work, Chapter } from '../types';
import { useAuth } from '../context/AuthContext';
import { useModals } from '../context/ModalContext';
import { monetizationApi } from '../api/monetizationApi';
import { userApi } from '../api/authApi';
import { Button } from '../components/ui/Button';

interface ReaderPageProps {
  work: Work;
  chapter: Chapter;
  onBack: () => void;
  onNavigateChapter: (nextNumber: number) => void;
}

export function ReaderPage({ work, chapter, onBack, onNavigateChapter }: ReaderPageProps) {
  const { user, toggleFavorite } = useAuth();
  const { openDonate, openReport } = useModals();

  const [currentPage, setCurrentPage] = useState(1);
  const [cumulativePages, setCumulativePages] = useState(0);
  const [showAdNotice, setShowAdNotice] = useState(false);

  const isLiked = user.favorites.includes(work.id);
  const totalPages = chapter.pages?.length || 24;

  // Rastreio de leitura contínua no MongoDB
  useEffect(() => {
    userApi.trackReadingProgress({
      workId: work.id,
      chapterId: chapter.id,
      page: currentPage,
      completed: currentPage === totalPages,
    }).catch(() => {});
  }, [work.id, chapter.id, currentPage, totalPages]);

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);

      const nextCumulative = cumulativePages + 1;
      if (nextCumulative >= 30) {
        // Se usuário for VIP, 100% dos anúncios são suprimidos!
        if (!user.isVip) {
          setShowAdNotice(true);
          monetizationApi.recordAdImpression({
            workId: work.id,
            creatorId: work.authorId,
            chapterId: chapter.id,
            pagesRead: 30,
          }).catch(() => {});
        }
        setCumulativePages(0);
      } else {
        setCumulativePages(nextCumulative);
      }
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  // Navegação por teclado acessível (setas e espaço)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        handleNextPage();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevPage();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, totalPages, cumulativePages]);

  return (
    <div className="min-h-screen bg-[#0B0B0C] text-[#F4EFE3] flex flex-col select-none font-body">
      
      {/* 1. Barra Superior Mínima e Sem Decoração Excessiva */}
      <header className="sticky top-0 z-40 bg-[#0B0B0C] border-b border-[#34343A] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-1.5 border border-[#34343A] bg-[#151517] text-[#A9A59A] hover:text-[#F4EFE3] hover:border-[#F4EFE3] transition-colors"
            aria-label="Voltar para a ficha da obra"
          >
            <ArrowLeft size={16} />
          </button>

          <div>
            <h3 className="font-display text-base tracking-wide text-[#F4EFE3] uppercase leading-none truncate max-w-xs sm:max-w-md">
              {work.title}
            </h3>
            <span className="font-pixel text-[11px] text-[#FFD400] tracking-wider block mt-0.5">
              CAP. #{chapter.number} — {chapter.title}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="font-pixel text-xs text-[#A9A59A] tabular-nums">
            PÁG. {currentPage} / {totalPages}
          </span>

          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              openDonate(work.authorId, work.authorName, work.title, work.id);
            }}
            className="!min-h-[34px] !py-1 !px-3 !text-xs"
          >
            APOIAR
          </Button>

          <button
            type="button"
            onClick={() => openReport(work.id, work.title, chapter.id)}
            className="p-1.5 border border-[#34343A] bg-[#151517] text-[#A9A59A] hover:text-[#E63946] hover:border-[#E63946] transition-colors"
            title="Denunciar pirataria, pornografia ou violação"
          >
            <Flag size={14} />
          </button>
        </div>
      </header>

      {/* 2. Barra de Progresso Fina no Topo */}
      <div className="w-full h-1 bg-[#151517]">
        <div
          className="h-full bg-[#FFD400] transition-all duration-100"
          style={{ width: `${(currentPage / totalPages) * 100}%` }}
        />
      </div>

      {/* 3. Bloco Discreto de Publicidade (A cada 30 páginas, Altura Reservada, Sem Layout Shift) */}
      {showAdNotice && (
        <div className="bg-[#151517] border-b border-[#34343A] p-3 text-center text-xs animate-in fade-in">
          <div className="max-w-xl mx-auto flex items-center justify-between gap-4">
            <span className="font-body text-[#A9A59A]">
              <strong className="text-[#FFD400] font-pixel text-[11px] mr-1.5 uppercase">
                PUBLICIDADE:
              </strong>
              58% da receita deste anúncio é creditada diretamente a {work.authorName}.
            </span>
            <button
              type="button"
              onClick={() => setShowAdNotice(false)}
              className="px-2 py-0.5 border border-[#34343A] text-[#F4EFE3] hover:text-[#FFD400] font-pixel text-[10px]"
            >
              FECHAR
            </button>
          </div>
        </div>
      )}

      {/* 4. Visualizador Centralizado em Coluna (Webtoon, Max ~800px, Sem Borda Decorativa) */}
      <main className="flex-1 max-w-[800px] mx-auto w-full py-4 px-2 flex flex-col items-center">
        <div className="relative w-full overflow-hidden bg-[#000000] flex justify-center">
          <img
            src={chapter.pages?.[currentPage - 1] || chapter.pages?.[0] || work.coverUrl}
            alt={`Página ${currentPage} de ${work.title}`}
            className="w-full h-auto object-contain select-none max-h-[85vh]"
          />
        </div>

        {/* Navegação Entre Páginas */}
        <div className="flex items-center justify-between w-full mt-4 bg-[#151517] border border-[#34343A] p-3">
          <Button
            type="button"
            variant="secondary"
            onClick={handlePrevPage}
            disabled={currentPage === 1}
            className="!min-h-[36px] !text-xs !px-3"
          >
            <ChevronLeft size={14} className="mr-1" /> ANTERIOR
          </Button>

          <span className="font-pixel text-xs text-[#A9A59A] tabular-nums">
            {currentPage} DE {totalPages}
          </span>

          <Button
            type="button"
            variant="primary"
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
            className="!min-h-[36px] !text-xs !px-3"
          >
            PRÓXIMA <ChevronRight size={14} className="ml-1" />
          </Button>
        </div>
      </main>

      {/* 5. Barra Inferior Mínima */}
      <footer className="sticky bottom-0 bg-[#0B0B0C] border-t border-[#34343A] px-4 py-2.5 flex items-center justify-between">
        <button
          type="button"
          onClick={() => toggleFavorite(work.id)}
          className={`px-3 py-1.5 font-display text-xs uppercase flex items-center gap-1.5 border transition-all ${
            isLiked
              ? 'bg-[#FFD400] text-[#0B0B0C] border-[#0B0B0C]'
              : 'bg-[#151517] text-[#A9A59A] border-[#34343A] hover:text-[#F4EFE3]'
          }`}
        >
          <Heart size={14} className={isLiked ? 'fill-[#0B0B0C]' : ''} />
          <span>{isLiked ? 'FAVORITADO' : 'FAVORITAR'}</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigateChapter(chapter.number - 1)}
            disabled={chapter.number <= 1}
            className="px-3 py-1 font-pixel text-xs uppercase border border-[#34343A] bg-[#151517] text-[#A9A59A] hover:text-[#F4EFE3] disabled:opacity-30 disabled:cursor-not-allowed"
          >
            CAP. ANTERIOR
          </button>

          <button
            type="button"
            onClick={() => onNavigateChapter(chapter.number + 1)}
            disabled={chapter.number >= (work.totalChapters || 10)}
            className="px-3 py-1 font-pixel text-xs uppercase border-2 border-[#0B0B0C] bg-[#FFD400] text-[#0B0B0C] font-bold hover:bg-[#E0B800] disabled:opacity-30 disabled:cursor-not-allowed"
          >
            PRÓXIMO CAP.
          </button>
        </div>
      </footer>

    </div>
  );
}

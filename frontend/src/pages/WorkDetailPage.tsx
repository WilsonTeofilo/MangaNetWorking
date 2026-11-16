import { Work, Chapter } from '../types';
import { useWorkDetailData } from '../components/work/useWorkDetailData';
import { WorkDetailHero } from '../components/work/WorkDetailHero';
import { WorkChapterList } from '../components/work/WorkChapterList';
import { WorkCreatorSidebar } from '../components/work/WorkCreatorSidebar';

export interface WorkDetailPageProps {
  work: Work;
  onBackToCatalog: () => void;
  onOpenChapter: (work: Work, chapter: Chapter, page?: number) => void;
  onRequireAuth?: () => void;
}

/**
 * Orquestrador limpo da Ficha de Detalhe da Obra.
 * Decomposto modularmente conforme TASK-108: consome useWorkDetailData e
 * orquestra Breadcrumbs, Hero da Obra, Lista de Capítulos e Sidebar do Autor.
 */
export function WorkDetailPage({
  work,
  onBackToCatalog,
  onOpenChapter,
  onRequireAuth,
}: WorkDetailPageProps) {
  const {
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
  } = useWorkDetailData({ work, onOpenChapter, onRequireAuth });

  return (
    <div className="mn-container py-6 space-y-8 select-none">
      {/* 1. Breadcrumbs Oficiais */}
      <nav className="flex items-center gap-2 font-pixel text-[12px] text-[var(--mn-mute)] uppercase tracking-wider">
        <button
          type="button"
          onClick={onBackToCatalog}
          className="hover:text-[var(--mn-yellow)] transition-colors"
        >
          INÍCIO
        </button>
        <span>&gt;</span>
        <button
          type="button"
          onClick={onBackToCatalog}
          className="hover:text-[var(--mn-yellow)] transition-colors"
        >
          CATÁLOGO
        </button>
        <span>&gt;</span>
        <span className="text-[var(--mn-paper)] font-bold truncate max-w-xs">{work.title}</span>
      </nav>

      {/* 2. Hero da Obra com Banner de Arte ao Fundo */}
      <WorkDetailHero
        work={work}
        creator={creator}
        workLikes={workLikes}
        favoritesCount={favoritesCount}
        isFavorited={isFavorited}
        onToggleFavorite={handleToggleFavorite}
        firstChapter={firstChapter}
        resumeChapter={resumeChapter}
        resumePage={resumePage}
        chapterFinished={chapterFinished}
        readingProgress={readingProgress}
        onOpenWithProgress={handleOpenWithProgress}
        onChapterClick={handleChapterClick}
      />

      {/* 3. Grade de Conteúdo: Lista de Capítulos + Sidebar do Autor */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 items-start">
        <WorkChapterList
          work={work}
          chapters={chapters}
          chaptersError={chaptersError}
          sortOrder={sortOrder}
          onToggleSortOrder={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          onChapterClick={handleChapterClick}
          offlineChapterIds={offlineChapterIds}
          downloadingChapterId={downloadingChapterId}
          onDownloadOffline={handleDownloadOffline}
        />

        <WorkCreatorSidebar work={work} creator={creator} />
      </div>
    </div>
  );
}

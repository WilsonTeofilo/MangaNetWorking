import { Work, Chapter } from '../types';
import { useAuth } from '../context/AuthContext';
import { useModals } from '../context/ModalContext';
import { AdOverlay } from '../components/ads/AdOverlay';
import { WorkCommentsPanel } from '../components/comments/WorkCommentsPanel';
import { ProseReaderView } from '../components/reader/ProseReaderView';
import { MangaReaderView } from '../components/reader/MangaReaderView';
import { useReaderTelemetry } from '../components/reader/useReaderTelemetry';
import { useReaderState } from '../components/reader/useReaderState';
import { ReaderHeader } from '../components/reader/ReaderHeader';
import { ReaderProgressBar } from '../components/reader/ReaderProgressBar';
import { ReaderNavigationFooter } from '../components/reader/ReaderNavigationFooter';
import { ReaderEarlyAccessLock } from '../components/reader/ReaderEarlyAccessLock';

interface ReaderPageProps {
  work: Work;
  chapter: Chapter;
  initialPage?: number;
  onBack: () => void;
  onNavigateChapter: (nextNumber: number) => void;
  onRequireAuth?: () => void;
}

const AD_SECONDS = 15;

export function ReaderPage({
  work,
  chapter,
  initialPage,
  onBack,
  onNavigateChapter,
  onRequireAuth,
}: ReaderPageProps) {
  const { user, toggleFavorite } = useAuth();
  const { openDonate, openReport } = useModals();

  const state = useReaderState({
    work,
    chapter,
    initialPage,
    onRequireAuth,
  });

  // Hook isolado de telemetria e checkpoints
  useReaderTelemetry({
    workId: work.id,
    chapterId: chapter.id,
    chapterFormat: state.chapterFormat,
    currentPage: state.currentPage,
    totalPages: state.totalPages,
    proseBlocks: state.proseBlocks,
    chapterFinished: state.chapterFinished,
    firstPageRef: state.firstPageRef,
    onFinishChapter: state.finishChapter,
  });

  const isFavorited = user.favorites.includes(work.id);

  return (
    <div className="min-h-screen bg-[var(--mn-ink)] text-[var(--mn-paper)] flex flex-col select-none font-body">
      {/* 1. Header do Reader */}
      <ReaderHeader
        work={work}
        chapter={chapter}
        chapterFormat={state.chapterFormat}
        currentPage={state.currentPage}
        totalPages={state.totalPages}
        readingMode={state.readingMode}
        proseSettings={state.proseSettings}
        supportEnabled={state.supportEnabled}
        onBack={onBack}
        onUpdateProseSettings={state.updateProseSettings}
        onChangeReadingMode={state.changeReadingMode}
        onOpenDonate={openDonate}
        onOpenReport={openReport}
      />

      {/* 2. Barra de Progresso Fina no Topo */}
      <ReaderProgressBar
        chapterFormat={state.chapterFormat}
        currentPage={state.currentPage}
        totalPages={state.totalPages}
      />

      {/* 3. Área Principal do Leitor */}
      <main className="flex-1 max-w-[800px] mx-auto w-full py-4 px-2 flex flex-col items-center">
        {state.earlyAccessLocked ? (
          <ReaderEarlyAccessLock authorName={work.authorName} onBack={onBack} />
        ) : state.chapterFormat === 'PROSE' ? (
          <ProseReaderView
            chapterNumber={chapter.number}
            totalChapters={work.totalChapters || chapter.number}
            proseBlocks={state.proseBlocks}
            proseContent={state.proseContent}
            proseSettings={state.proseSettings}
            chapterFinished={state.chapterFinished}
            chapterLiked={state.chapterLiked}
            chapterLikes={state.chapterLikes}
            likePending={state.likePending}
            likeNotice={state.likeNotice}
            supportEnabled={state.supportEnabled}
            membershipPriceBrl={state.membershipPriceBrl}
            authorId={work.authorId}
            authorName={work.authorName}
            workId={work.id}
            workTitle={work.title}
            onNavigateChapter={onNavigateChapter}
            onBack={onBack}
            onReplay={state.replayChapter}
            onToggleLike={state.handleToggleChapterLike}
            onOpenDonate={openDonate}
          />
        ) : (
          <MangaReaderView
            readingMode={state.readingMode}
            pages={state.pages}
            currentPage={state.currentPage}
            totalPages={state.totalPages}
            chapterNumber={chapter.number}
            totalChapters={work.totalChapters || chapter.number}
            workTitle={work.title}
            chapterFinished={state.chapterFinished}
            chapterLiked={state.chapterLiked}
            chapterLikes={state.chapterLikes}
            likePending={state.likePending}
            likeNotice={state.likeNotice}
            supportEnabled={state.supportEnabled}
            membershipPriceBrl={state.membershipPriceBrl}
            authorId={work.authorId}
            authorName={work.authorName}
            workId={work.id}
            adOpen={state.adSlot !== null}
            firstPageRef={state.firstPageRef}
            onPageChange={state.setCurrentPage}
            onFinishChapter={state.finishChapter}
            onNavigateChapter={onNavigateChapter}
            onBack={onBack}
            onReplay={state.replayChapter}
            onToggleLike={state.handleToggleChapterLike}
            onOpenDonate={openDonate}
          />
        )}

        <div className="mt-8 w-full">
          <WorkCommentsPanel
            workId={work.id}
            chapterId={chapter.id}
            heading={`COMENTÁRIOS DO CAP. #${chapter.number}`}
            onRequireAuth={onRequireAuth}
          />
        </div>
      </main>

      {/* 4. Footer com Favoritar e Navegação */}
      <ReaderNavigationFooter
        work={work}
        chapter={chapter}
        isFavorited={isFavorited}
        onToggleFavorite={() => toggleFavorite(work.id)}
        onNavigateChapter={onNavigateChapter}
      />

      {/* 5. Anúncio em Overlay */}
      <AdOverlay
        open={state.adSlot !== null}
        slot={state.adSlot ?? 'start'}
        seconds={AD_SECONDS}
        workTitle={work.title}
        creatorName={work.authorName}
        onComplete={() => state.setAdSlot(null)}
      />
    </div>
  );
}

export default ReaderPage;

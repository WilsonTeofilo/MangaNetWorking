import { getSeparatorGlyph, illustrationSrc } from '../creator/novel/novelEditorTypes';
import { ProseBlock, ProseSettings } from './readerTypes';
import { ChapterEndPanel } from './ChapterEndPanel';

interface ProseReaderViewProps {
  chapterNumber: number;
  totalChapters: number;
  proseBlocks: ProseBlock[];
  proseContent: string | null;
  proseSettings: ProseSettings;
  chapterFinished: boolean;
  chapterLiked: boolean;
  chapterLikes: number;
  likePending: boolean;
  likeNotice: string | null;
  supportEnabled: boolean;
  membershipPriceBrl: number | null;
  authorId: string;
  authorName: string;
  workId: string;
  workTitle: string;
  onNavigateChapter: (nextNumber: number) => void;
  onBack: () => void;
  onReplay: () => void;
  onToggleLike: () => void;
  onOpenDonate: (authorId: string, authorName: string, workTitle: string, workId: string) => void;
}

export function ProseReaderView({
  chapterNumber,
  totalChapters,
  proseBlocks,
  proseContent,
  proseSettings,
  chapterFinished,
  chapterLiked,
  chapterLikes,
  likePending,
  likeNotice,
  supportEnabled,
  membershipPriceBrl,
  authorId,
  authorName,
  workId,
  workTitle,
  onNavigateChapter,
  onBack,
  onReplay,
  onToggleLike,
  onOpenDonate,
}: ProseReaderViewProps) {
  return (
    <>
      {/* Barra de progresso específica para prosa */}
      <div className="w-full h-1 bg-[var(--mn-ink-2)] sticky top-14 z-30" aria-hidden="true">
        <div
          className="h-full bg-[var(--mn-yellow)] transition-all duration-200"
          id="prose-progress-bar"
          style={{ width: '0%' }}
        />
      </div>

      <article
        lang="pt-BR"
        aria-label={`Texto do capítulo ${chapterNumber}`}
        style={{
          fontSize: `${proseSettings.fontSize}px`,
          lineHeight: proseSettings.lineHeight,
          maxWidth: `${proseSettings.maxWidth}px`,
          fontFamily: proseSettings.serif ? 'Georgia, "Times New Roman", serif' : undefined,
        }}
        className="w-full px-5 py-8 sm:px-10 sm:py-12 text-left font-body text-[var(--mn-paper)] whitespace-pre-wrap select-text"
      >
        {proseBlocks.length > 0 ? (
          proseBlocks.map((block, idx) => (
            <div
              key={idx}
              data-prose-block={block.type === 'text' ? 'true' : 'false'}
              className="mb-8"
            >
              {block.type === 'text' && block.content.text && (
                <div className="prose-block-text">
                  {block.content.text.split('\n').map((line, lineIdx) => (
                    <span key={lineIdx}>
                      {lineIdx > 0 && <br />}
                      {line}
                    </span>
                  ))}
                </div>
              )}
              {block.type === 'illustration' && block.content.fileId && (
                <div className="my-6 text-center">
                  <img
                    src={illustrationSrc(block.content.fileId)}
                    alt={block.content.altText || `Ilustração do capítulo ${chapterNumber}`}
                    style={{
                      maxWidth: `${block.content.width || 50}%`,
                      height: 'auto',
                      maxHeight: '50vh',
                    }}
                    className="mx-auto rounded border border-[var(--mn-line)]"
                    loading="lazy"
                  />
                  {block.content.altText && (
                    <p className="font-body text-xs text-[var(--mn-mute)] mt-1 text-center">
                      {block.content.altText}
                    </p>
                  )}
                </div>
              )}
              {block.type === 'separator' && (
                <div className="my-8 text-center font-display tracking-[0.4em] text-[var(--mn-yellow)]">
                  <span>{getSeparatorGlyph(block.content?.style)}</span>
                </div>
              )}
            </div>
          ))
        ) : (
          proseContent ?? 'Carregando capítulo…'
        )}
      </article>

      {chapterFinished && (
        <ChapterEndPanel
          chapterNumber={chapterNumber}
          totalChapters={totalChapters}
          chapterLiked={chapterLiked}
          chapterLikes={chapterLikes}
          likePending={likePending}
          likeNotice={likeNotice}
          supportEnabled={supportEnabled}
          membershipPriceBrl={membershipPriceBrl}
          authorId={authorId}
          authorName={authorName}
          workId={workId}
          workTitle={workTitle}
          onNavigateChapter={onNavigateChapter}
          onBack={onBack}
          onReplay={onReplay}
          onToggleLike={onToggleLike}
          onOpenDonate={onOpenDonate}
        />
      )}
    </>
  );
}

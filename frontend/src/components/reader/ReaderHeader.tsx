import { ArrowLeft, BookOpen, Flag, ScrollText } from 'lucide-react';
import { Work, Chapter } from '../../types';
import { ProseSettings, ReadingMode } from './readerTypes';
import { ReaderProseSettingsBar } from './ReaderProseSettingsBar';
import { Button } from '../ui/Button';

interface ReaderHeaderProps {
  work: Work;
  chapter: Chapter;
  chapterFormat: 'IMAGE_PAGES' | 'PROSE';
  currentPage: number;
  totalPages: number;
  readingMode: ReadingMode;
  proseSettings: ProseSettings;
  supportEnabled: boolean;
  onBack: () => void;
  onUpdateProseSettings: (patch: Partial<ProseSettings>) => void;
  onChangeReadingMode: (mode: ReadingMode) => void;
  onOpenDonate: (authorId: string, authorName: string, workTitle: string, workId: string) => void;
  onOpenReport: (workId: string, workTitle: string, chapterId: string) => void;
}

export function ReaderHeader({
  work,
  chapter,
  chapterFormat,
  currentPage,
  totalPages,
  readingMode,
  proseSettings,
  supportEnabled,
  onBack,
  onUpdateProseSettings,
  onChangeReadingMode,
  onOpenDonate,
  onOpenReport,
}: ReaderHeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-[var(--mn-ink)] border-b border-[var(--mn-line)] px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="p-1.5 border border-[var(--mn-line)] bg-[var(--mn-ink-2)] text-[var(--mn-mute)] hover:text-[var(--mn-paper)] hover:border-[var(--mn-paper)] transition-colors"
          aria-label="Voltar para a ficha da obra"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h3 className="font-display text-base tracking-wide text-[var(--mn-paper)] uppercase leading-none truncate max-w-xs sm:max-w-md">
            {work.title}
          </h3>
          <span className="font-pixel text-[12px] text-[var(--mn-yellow)] tracking-wider block mt-0.5">
            CAP. #{chapter.number} — {chapter.title}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {chapterFormat === 'PROSE' && (
          <ReaderProseSettingsBar
            settings={proseSettings}
            onUpdate={onUpdateProseSettings}
          />
        )}

        {chapterFormat !== 'PROSE' && (
          <div
            className="flex items-center border border-[var(--mn-line)]"
            role="group"
            aria-label="Modo de leitura"
          >
            <button
              type="button"
              onClick={() => onChangeReadingMode('paginated')}
              aria-pressed={readingMode === 'paginated'}
              title="Leitura página a página (ideal para PC)"
              className={`flex items-center gap-1 px-2 py-1 font-pixel text-[12px] uppercase transition-colors ${
                readingMode === 'paginated'
                  ? 'bg-[var(--mn-yellow)] text-[var(--mn-ink)]'
                  : 'bg-[var(--mn-ink-2)] text-[var(--mn-mute)] hover:text-[var(--mn-paper)]'
              }`}
            >
              <BookOpen size={13} />
              <span className="hidden md:inline">PÁGINA</span>
            </button>
            <button
              type="button"
              onClick={() => onChangeReadingMode('vertical')}
              aria-pressed={readingMode === 'vertical'}
              title="Rolagem contínua/webtoon (ideal para celular)"
              className={`flex items-center gap-1 px-2 py-1 font-pixel text-[12px] uppercase transition-colors border-l border-[var(--mn-line)] ${
                readingMode === 'vertical'
                  ? 'bg-[var(--mn-yellow)] text-[var(--mn-ink)]'
                  : 'bg-[var(--mn-ink-2)] text-[var(--mn-mute)] hover:text-[var(--mn-paper)]'
              }`}
            >
              <ScrollText size={13} />
              <span className="hidden md:inline">SCROLL</span>
            </button>
          </div>
        )}

        <span className="hidden sm:inline font-pixel text-[12px] text-[var(--mn-mute)] tabular-nums">
          {chapterFormat === 'PROSE'
            ? 'LEITURA EM PROSA (SCROLL)'
            : `PÁG. ${currentPage} / ${totalPages}`}
        </span>

        {supportEnabled && (
          <Button
            type="button"
            variant="secondary"
            onClick={() => onOpenDonate(work.authorId, work.authorName, work.title, work.id)}
            className="!min-h-[34px] !py-1 !px-3 !text-xs"
          >
            APOIAR
          </Button>
        )}

        <button
          type="button"
          onClick={() => onOpenReport(work.id, work.title, chapter.id)}
          className="p-1.5 border border-[var(--mn-line)] bg-[var(--mn-ink-2)] text-[var(--mn-mute)] hover:text-[var(--mn-red)] hover:border-[var(--mn-red)] transition-colors"
          title="Denunciar pirataria, pornografia ou violação"
        >
          <Flag size={14} />
        </button>
      </div>
    </header>
  );
}

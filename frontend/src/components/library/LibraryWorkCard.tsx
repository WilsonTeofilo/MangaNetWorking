import { Trash2 } from 'lucide-react';
import { Work, Chapter } from '../../types';
import { LibraryWorkDto, ReadingProgressDto } from '../../api/authApi';
import { Cover } from '../ui/Cover';
import { FormatBadge } from '../ui/FormatBadge';
import { isLightNovel } from '../../utils/formatMeta';

export type LibraryCardData = {
  work: Work;
  entry: LibraryWorkDto;
  progress: ReadingProgressDto | null;
  finished: boolean;
  page: number;
  totalPages: number;
};

export interface LibraryWorkCardProps {
  card: LibraryCardData;
  onSelectWork: (work: Work) => void;
  onOpenChapter?: (work: Work, chapter: Chapter, page?: number) => void;
  onRemoveFavorite: (workId: string) => void;
}

export function LibraryWorkCard({
  card,
  onSelectWork,
  onOpenChapter,
  onRemoveFavorite,
}: LibraryWorkCardProps) {
  const handleOpen = () => {
    if (!card.progress || !onOpenChapter) {
      onSelectWork(card.work);
      return;
    }
    const chapterId = card.progress.chapterId;
    if (!chapterId) {
      onSelectWork(card.work);
      return;
    }
    const chapter: Chapter = {
      id: chapterId,
      workId: card.work.id,
      number: card.progress.chapterNumber ?? 1,
      title: card.progress.chapterTitle ?? '',
      pages: [],
      createdAt: card.progress.updatedAt ?? '',
      publicReleaseAt: '',
      views: 0,
      likes: 0,
      commentsCount: 0,
      format: isLightNovel(card.work.format) ? 'PROSE' : 'IMAGE_PAGES',
    };
    onOpenChapter(card.work, chapter, card.page);
  };

  const percent = card.totalPages > 0 ? Math.round((card.page / card.totalPages) * 100) : 0;
  const isLn = isLightNovel(card.work.format);

  return (
    <article className="group relative flex flex-col border-2 border-[var(--mn-line)] bg-[var(--mn-ink-2)] shadow-[4px_4px_0_var(--mn-paper)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_var(--mn-yellow)] transition-all">
      {/* Capa 2:3 Clicável e Soberana */}
      <div
        className="relative cursor-pointer overflow-hidden aspect-[2/3]"
        onClick={handleOpen}
        title={`Abrir ${card.work.title}`}
      >
        <Cover src={card.work.coverUrl} title={card.work.title} aspectRatio="2/3" dropShadow={false} />

        {/* Badge de formato no canto inferior esquerdo */}
        <div className="absolute bottom-3 left-2 z-10">
          <FormatBadge format={card.work.format} />
        </div>

        {/* Total de capítulos no canto superior direito */}
        <span className="absolute top-2 right-2 z-10 bg-[var(--mn-ink)]/90 border border-[var(--mn-yellow)] text-[var(--mn-yellow)] px-1.5 py-0.5 font-pixel text-[11px] tabular-nums">
          {`${card.entry.totalChapters} CAPS`}
        </span>

        {/* Botão de desfavoritar discreto no canto superior esquerdo */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemoveFavorite(card.work.id);
          }}
          className="absolute top-2 left-2 z-10 p-1.5 bg-[var(--mn-ink)]/80 text-[var(--mn-mute)] hover:text-[var(--mn-red)] hover:bg-[var(--mn-ink)] border border-[var(--mn-line)] opacity-80 group-hover:opacity-100 transition-opacity cursor-pointer"
          title="Remover da biblioteca"
          aria-label="Remover da biblioteca"
        >
          <Trash2 size={13} />
        </button>

        {/* Barra de Progresso Embutida na base inferior da capa (3px) */}
        {card.progress && (
          <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[var(--mn-line)] z-10" aria-hidden="true">
            <div
              className="h-full bg-[var(--mn-yellow)]"
              style={{ width: `${card.finished ? 100 : percent}%` }}
            />
          </div>
        )}
      </div>

      {/* Conteúdo textual do card */}
      <div className="p-3 flex flex-col flex-1 justify-between gap-2">
        <div>
          <h3
            onClick={handleOpen}
            className="font-display text-sm sm:text-base leading-tight uppercase line-clamp-2 text-[var(--mn-paper)] group-hover:text-[var(--mn-yellow)] cursor-pointer transition-colors"
            title={card.work.title}
          >
            {card.work.title}
          </h3>
          <p className="font-body text-[11px] sm:text-[12px] text-[var(--mn-mute)] truncate mt-0.5">
            por {card.work.authorName || 'autor independente'}
          </p>
        </div>

        {/* Informação discreta de progresso em Silkscreen */}
        <div className="pt-2 border-t border-[var(--mn-line)]">
          {card.progress ? (
            isLn ? (
              <div className="flex items-center justify-between font-pixel text-[10px] text-[var(--mn-mute)] uppercase">
                <span>
                  {card.finished
                    ? '100% CONCLUÍDO'
                    : `CAP. ${card.progress.chapterNumber ?? 1} · ${percent}%`}
                </span>
                <span className="tabular-nums text-[var(--mn-yellow)]">
                  {card.finished ? 'CONCLUÍDO' : `${percent}%`}
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-between font-pixel text-[10px] text-[var(--mn-mute)] uppercase">
                <span>
                  {card.finished ? '100% CONCLUÍDO' : `PÁG. ${card.page}/${card.totalPages || '?'}`}
                </span>
                <span className="tabular-nums text-[var(--mn-yellow)]">
                  {card.finished ? 'CONCLUÍDO' : `${percent}%`}
                </span>
              </div>
            )
          ) : (
            <p className="font-pixel text-[10px] text-[var(--mn-mute)] uppercase">AINDA NÃO ABERTA</p>
          )}
        </div>
      </div>
    </article>
  );
}

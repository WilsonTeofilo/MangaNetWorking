import { Eye, Heart, Star, BookOpen } from 'lucide-react';
import { Work, Chapter, Creator } from '../../types';
import { ReadingProgressDto } from '../../api/authApi';
import { Cover } from '../ui/Cover';
import { Button } from '../ui/Button';
import { Sticker } from '../ui/Sticker';
import { FormatBadge } from '../ui/FormatBadge';
import { useModals } from '../../context/ModalContext';

export interface WorkDetailHeroProps {
  work: Work;
  creator?: Creator;
  workLikes: number;
  favoritesCount: number;
  isFavorited: boolean;
  onToggleFavorite: () => void;
  firstChapter?: Chapter;
  resumeChapter?: Chapter;
  resumePage: number;
  chapterFinished: boolean;
  readingProgress: ReadingProgressDto | null;
  onOpenWithProgress: (chapter: Chapter, page?: number) => void;
  onChapterClick: (chapter: Chapter) => void;
}

export function WorkDetailHero({
  work,
  creator,
  workLikes,
  favoritesCount,
  isFavorited,
  onToggleFavorite,
  firstChapter,
  resumeChapter,
  resumePage,
  chapterFinished,
  readingProgress,
  onOpenWithProgress,
  onChapterClick,
}: WorkDetailHeroProps) {
  const { openDonate } = useModals();

  return (
    <section className="border-2 border-[var(--mn-line)] bg-[var(--mn-ink-2)] shadow-[6px_6px_0_var(--mn-paper)] p-6 sm:p-8 relative overflow-hidden">
      {/* Banner Horizontal de Arte Ilustrada ao Fundo */}
      {work.bannerUrl && (
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30 pointer-events-none filter saturate-125"
          style={{ backgroundImage: `url(${work.bannerUrl})` }}
        />
      )}
      {/* Scrim Gradiente Nanquim */}
      <div className="absolute inset-0 bg-gradient-to-r from-[var(--mn-ink-2)] via-[var(--mn-ink-2)]/90 to-[var(--mn-ink-2)]/40 pointer-events-none" />

      <div className="flex flex-col md:flex-row gap-8 items-start relative z-10">
        {/* Capa Vertical 2:3 */}
        <div className="w-52 sm:w-60 shrink-0 mx-auto md:mx-0">
          <Cover
            src={work.coverUrl}
            title={work.title}
            aspectRatio="2/3"
            dropShadow={true}
            className="w-full"
          />
        </div>

        {/* Dados da Obra */}
        <div className="flex-1 space-y-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="font-pixel text-[12px] text-[var(--mn-yellow)] font-bold tracking-widest uppercase">
                OBRA NACIONAL ORIGINAL
              </span>
              <FormatBadge format={work.format} size="md" />
              {work.status === 'completed' && <Sticker kind="complete" />}
            </div>

            <h1 className="font-display text-4xl sm:text-5xl md:text-6xl text-[var(--mn-paper)] leading-[1.08] pt-1 uppercase tracking-tight">
              {work.title}
            </h1>

            <p className="font-body text-sm text-[var(--mn-mute)] mt-1.5">
              Criado por{' '}
              <strong className="text-[var(--mn-yellow)] font-semibold">{work.authorName}</strong>
            </p>

            {/* Total da obra: soma das visualizações de todos os capítulos */}
            <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-body text-sm text-[var(--mn-mute)] tabular-nums">
              <span className="inline-flex items-center gap-1.5" title="Visualizações da obra (soma dos capítulos)">
                <Eye size={14} aria-hidden="true" /> {Number(work.totalViews ?? 0).toLocaleString('pt-BR')}{' '}
                {Number(work.totalViews ?? 0) === 1 ? 'visualização' : 'visualizações'}
              </span>
              <span className="inline-flex items-center gap-1.5" title="Curtidas da obra (soma das curtidas dos capítulos)">
                <Heart size={14} aria-hidden="true" /> {Number(workLikes).toLocaleString('pt-BR')}{' '}
                {Number(workLikes) === 1 ? 'curtida' : 'curtidas'}
              </span>
              <span className="inline-flex items-center gap-1.5" title="Leitores que favoritaram a obra">
                <Star size={14} aria-hidden="true" className="fill-[var(--mn-yellow)] text-[var(--mn-yellow)]" />{' '}
                {Number(favoritesCount).toLocaleString('pt-BR')}{' '}
                {Number(favoritesCount) === 1 ? 'favorito' : 'favoritos'}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <BookOpen size={14} aria-hidden="true" /> {work.totalChapters}{' '}
                {work.totalChapters === 1 ? 'capítulo' : 'capítulos'}
              </span>
            </p>
          </div>

          {/* Chips de Gênero */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {work.genres.map((genre) => (
              <span
                key={genre}
                className="px-2.5 py-0.5 bg-[var(--mn-ink)] border border-[var(--mn-line)] text-[var(--mn-paper)] font-pixel text-[12px] uppercase tracking-wider"
              >
                {genre}
              </span>
            ))}
          </div>

          {/* Sinopse Editorial */}
          <div className="pt-2 border-t border-[var(--mn-line)]">
            <span className="font-pixel text-[12px] text-[var(--mn-mute)] tracking-wider uppercase block mb-1">
              SINOPSE
            </span>
            <p className="font-body text-sm text-[var(--mn-paper)] leading-relaxed max-w-2xl">
              {work.synopsis}
            </p>
          </div>

          {/* Botões de Ação */}
          <div className="flex flex-wrap items-center gap-3 pt-4">
            {resumeChapter ? (
              <Button
                variant="primary"
                onClick={() => onOpenWithProgress(resumeChapter, chapterFinished ? 1 : resumePage)}
                className="!text-lg !px-6"
              >
                {chapterFinished
                  ? `LER NOVAMENTE · CAP. ${resumeChapter.number}`
                  : `CONTINUAR DE ONDE PAROU · CAP. ${resumeChapter.number} · PÁG. ${resumePage}`}
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={() => firstChapter && onChapterClick(firstChapter)}
                disabled={!firstChapter}
                className="!text-lg !px-6"
              >
                LER DO COMEÇO
              </Button>
            )}

            <button
              type="button"
              onClick={onToggleFavorite}
              aria-pressed={isFavorited}
              className={`inline-flex items-center gap-2 px-4 py-2.5 font-display text-base uppercase border-2 transition-all ${
                isFavorited
                  ? 'bg-[var(--mn-yellow)] text-[var(--mn-ink)] border-[var(--mn-ink)] shadow-[3px_3px_0_var(--mn-paper)]'
                  : 'bg-[var(--mn-ink)] text-[var(--mn-paper)] border-[var(--mn-line)] hover:border-[var(--mn-yellow)]'
              }`}
            >
              <Star size={16} className={isFavorited ? 'fill-[var(--mn-ink)]' : ''} />
              <span>{isFavorited ? 'NA BIBLIOTECA' : 'FAVORITAR'}</span>
              <span className="tabular-nums opacity-80">{Number(favoritesCount).toLocaleString('pt-BR')}</span>
            </button>

            {creator && (
              <Button
                variant="secondary"
                onClick={() => openDonate(creator.id, creator.name, work.title, work.id)}
                className="!text-sm"
              >
                APOIAR AUTOR
              </Button>
            )}

            {resumeChapter && !chapterFinished && readingProgress?.totalPages ? (
              <p className="w-full font-body text-xs text-[var(--mn-mute)]">
                Você parou na página {resumePage} de {readingProgress.totalPages} do capítulo{' '}
                {resumeChapter.number}.
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

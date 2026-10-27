import { Field } from '../../ui/Field';
import { PageItem } from './mangaEditorTypes';

interface MangaReviewStepProps {
  workTitle: string;
  nextChapterNumber: number;
  chapterTitle: string;
  setChapterTitle: (title: string) => void;
  releaseDate: string;
  setReleaseDate: (date: string) => void;
  pages: PageItem[];
  coverFile: File | null;
}

export function MangaReviewStep({
  workTitle,
  nextChapterNumber,
  chapterTitle,
  setChapterTitle,
  releaseDate,
  setReleaseDate,
  pages,
  coverFile,
}: MangaReviewStepProps) {
  return (
    <section className="border-2 border-[var(--mn-line)] bg-[var(--mn-ink-2)] p-5 space-y-4">
      <h3 className="font-display text-xl text-[var(--mn-paper)] uppercase">Revise antes de publicar</h3>
      <Field
        label="TÍTULO DO CAPÍTULO"
        value={chapterTitle}
        onChange={(event) => setChapterTitle(event.target.value)}
      />
      <div className="space-y-1.5">
        <label htmlFor="release-date" className="font-body text-sm font-semibold text-[var(--mn-paper)] block">
          DATA DE LANÇAMENTO (opcional)
        </label>
        <input
          id="release-date"
          type="datetime-local"
          value={releaseDate}
          onChange={(event) => setReleaseDate(event.target.value)}
          className="w-full bg-[var(--mn-ink-2)] border-2 border-[var(--mn-line)] px-3 py-2 font-body text-sm text-[var(--mn-paper)] focus:border-[var(--mn-paper)] focus:shadow-[3px_3px_0_var(--mn-yellow)] outline-none"
        />
        <p className="font-pixel text-[11px] uppercase text-[var(--mn-mute)]">
          Sem data: publica agora. Com data: fica agendado (e o autor pode mudar depois).
        </p>
      </div>
      <dl className="grid sm:grid-cols-2 gap-2 font-body text-sm">
        <div className="flex justify-between border-b border-[var(--mn-line)] py-1">
          <dt className="text-[var(--mn-mute)]">Obra</dt>
          <dd className="text-[var(--mn-paper)]">{workTitle}</dd>
        </div>
        <div className="flex justify-between border-b border-[var(--mn-line)] py-1">
          <dt className="text-[var(--mn-mute)]">Número</dt>
          <dd className="text-[var(--mn-paper)]">{nextChapterNumber}</dd>
        </div>
        <div className="flex justify-between border-b border-[var(--mn-line)] py-1">
          <dt className="text-[var(--mn-mute)]">Formato</dt>
          <dd className="text-[var(--mn-paper)]">Mangá (páginas)</dd>
        </div>
        <div className="flex justify-between border-b border-[var(--mn-line)] py-1">
          <dt className="text-[var(--mn-mute)]">Conteúdo</dt>
          <dd className="text-[var(--mn-paper)]">{pages.length} página(s)</dd>
        </div>
        <div className="flex justify-between border-b border-[var(--mn-line)] py-1">
          <dt className="text-[var(--mn-mute)]">Lançamento</dt>
          <dd className="text-[var(--mn-paper)]">
            {releaseDate ? new Date(releaseDate).toLocaleString('pt-BR') : 'imediato'}
          </dd>
        </div>
        <div className="flex justify-between border-b border-[var(--mn-line)] py-1">
          <dt className="text-[var(--mn-mute)]">Capa própria</dt>
          <dd className="text-[var(--mn-paper)]">{coverFile ? 'sim' : 'usa a capa da obra'}</dd>
        </div>
      </dl>
    </section>
  );
}

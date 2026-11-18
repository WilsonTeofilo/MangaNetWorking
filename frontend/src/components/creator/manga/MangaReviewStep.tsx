import { Field } from '../../ui/Field';
import { PageItem } from './mangaEditorTypes';
import { MangaChapterType } from './useMangaChapterEditor';

const CHAPTER_TYPE_LABEL: Record<MangaChapterType, string> = {
  REGULAR: 'Capítulo regular',
  PROLOGUE: 'Prólogo (capítulo 0)',
  SPECIAL: 'Conteúdo especial',
};

interface MangaReviewStepProps {
  workTitle: string;
  nextChapterNumber: number;
  chapterTitle: string;
  setChapterTitle: (title: string) => void;
  chapterType: MangaChapterType;
  setChapterType: (type: MangaChapterType) => void;
  prologueTaken: boolean;
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
  chapterType,
  setChapterType,
  prologueTaken,
  releaseDate,
  setReleaseDate,
  pages,
  coverFile,
}: MangaReviewStepProps) {
  const displayChapterNumber = chapterType === 'PROLOGUE' ? 0 : nextChapterNumber;

  return (
    <section className="border-2 border-[var(--mn-line)] bg-[var(--mn-ink-2)] p-5 space-y-5">
      <h3 className="font-display text-xl text-[var(--mn-paper)] uppercase">Revise antes de publicar</h3>

      {/* Seletor de Tipo de Capítulo */}
      <div>
        <label className="block font-body text-xs font-semibold text-[var(--mn-mute)] uppercase tracking-wider mb-2">
          TIPO DE CAPÍTULO
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(['REGULAR', 'PROLOGUE', 'SPECIAL'] as const).map((t) => {
            const disabled = t === 'PROLOGUE' && prologueTaken;
            const selected = chapterType === t;
            return (
              <button
                key={t}
                type="button"
                disabled={disabled}
                onClick={() => setChapterType(t)}
                className={`p-3 border-2 text-left transition-all ${
                  selected
                    ? 'border-[var(--mn-yellow)] bg-[var(--mn-yellow)] text-black font-bold shadow-[2px_2px_0_var(--mn-paper)]'
                    : disabled
                      ? 'border-[var(--mn-line)] opacity-40 cursor-not-allowed bg-[var(--mn-ink-2)] text-[var(--mn-mute)]'
                      : 'border-[var(--mn-line)] bg-[var(--mn-ink)] text-[var(--mn-paper)] hover:border-[var(--mn-paper)]'
                }`}
              >
                <div className="font-display text-sm uppercase">{CHAPTER_TYPE_LABEL[t]}</div>
                <div className="text-xs font-body mt-1 opacity-80">
                  {t === 'REGULAR' && 'Capítulo normal de mangá'}
                  {t === 'PROLOGUE' && 'Capítulo 0 narrativo'}
                  {t === 'SPECIAL' && 'Extra, side-story ou omake'}
                </div>
              </button>
            );
          })}
        </div>
        {prologueTaken && chapterType === 'PROLOGUE' && (
          <p className="text-xs font-body text-[var(--mn-red)] mt-1.5">Esta obra já possui um prólogo.</p>
        )}
      </div>

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
          <dd className="text-[var(--mn-paper)]">{displayChapterNumber}</dd>
        </div>
        <div className="flex justify-between border-b border-[var(--mn-line)] py-1">
          <dt className="text-[var(--mn-mute)]">Tipo</dt>
          <dd className="text-[var(--mn-yellow)] font-semibold">{CHAPTER_TYPE_LABEL[chapterType]}</dd>
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

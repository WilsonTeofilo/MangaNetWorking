import { useEffect, useState } from 'react';
import { FileText, ChevronDown } from 'lucide-react';
import { workApi, CreatorWorkSummaryDto } from '../api/workApi';
import { ChapterPublishWizard } from '../components/creator/ChapterPublishWizard';

/**
 * "Capítulos" — publicar capítulos de uma obra sua.
 *
 * <p>Responsabilidade única (como no MangaTeofilo: `CreatorChaptersPage`): primeiro você
 * <strong>escolhe a obra</strong> entre as suas; depois o fluxo de 5 etapas sobe as páginas,
 * define a capa do capítulo, revisa e publica. Aqui não se cria obra nova — a obra já
 * existe (foi criada em "Minhas obras").</p>
 */
export function CreatorChaptersPage() {
  const [works, setWorks] = useState<CreatorWorkSummaryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedWorkId, setSelectedWorkId] = useState<string>('');
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    workApi
      .listMyWorks()
      .then((payload) => {
        setWorks(payload);
        setSelectedWorkId((current) =>
          payload.some((work) => work.id === current) ? current : payload[0]?.id || ''
        );
      })
      .catch(() => setError('Não foi possível carregar suas obras.'))
      .finally(() => setLoading(false));
  }, []);

  const selectedWork = works.find((work) => work.id === selectedWorkId) || null;

  return (
    <section className="mn-container py-10 space-y-6">
      <header className="border-2 border-[var(--mn-yellow)] bg-[var(--mn-ink-2)] p-6 shadow-[6px_6px_0_var(--mn-yellow)]">
        <p className="font-pixel text-[11px] tracking-widest text-[var(--mn-mute)] uppercase">Criador</p>
        <h1 className="font-display text-3xl sm:text-4xl text-[var(--mn-paper)] uppercase mt-1 flex items-center gap-3">
          <FileText size={26} className="text-[var(--mn-yellow)]" /> Capítulos
        </h1>
        <p className="mt-2 text-sm text-[var(--mn-mute)]">
          Escolha a obra que você criou em <strong className="text-[var(--mn-paper)]">Minhas obras</strong> e publique
          o capítulo: upload das páginas, capa do capítulo, revisão e publicação.
        </p>
      </header>

      {error && (
        <p role="alert" className="border-2 border-[var(--mn-red)] bg-[var(--mn-ink-2)] p-3 font-body text-sm text-[var(--mn-paper)]">
          {error}
        </p>
      )}

      {/* Escolha da obra */}
      <div className="border-2 border-[var(--mn-line)] bg-[var(--mn-ink-2)] p-4 space-y-3">
        <p className="font-pixel text-[11px] uppercase text-[var(--mn-mute)]">Obra do capítulo</p>
        {loading ? (
          <p className="font-pixel text-[11px] uppercase text-[var(--mn-mute)]">Carregando suas obras...</p>
        ) : works.length === 0 ? (
          <p className="font-body text-sm text-[var(--mn-mute)]">
            Você ainda não tem obra. Crie a obra em <strong className="text-[var(--mn-paper)]">Minhas obras</strong>{' '}
            antes de publicar um capítulo.
          </p>
        ) : (
          <div className="relative">
            <button
              type="button"
              onClick={() => setPickerOpen((open) => !open)}
              aria-expanded={pickerOpen}
              className="w-full flex items-center justify-between gap-3 border-2 border-[var(--mn-line)] bg-[var(--mn-ink)] px-4 py-3 font-body text-sm text-[var(--mn-paper)] hover:border-[var(--mn-yellow)]"
            >
              <span className="flex items-center gap-3 min-w-0">
                {selectedWork && (
                  <img
                    src={selectedWork.coverUrl || '/avatar-placeholder.png'}
                    alt=""
                    className="w-8 h-11 object-cover border border-[var(--mn-line)]"
                  />
                )}
                <span className="truncate">{selectedWork ? selectedWork.title : 'Escolha a obra'}</span>
              </span>
              <ChevronDown size={16} className={`text-[var(--mn-mute)] transition-transform ${pickerOpen ? 'rotate-180' : ''}`} />
            </button>

            {pickerOpen && (
              <ul className="absolute z-20 mt-1 w-full border-2 border-[var(--mn-line)] bg-[var(--mn-ink)] max-h-64 overflow-auto">
                {works.map((work) => (
                  <li key={work.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedWorkId(work.id);
                        setPickerOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-left font-body text-sm text-[var(--mn-paper)] hover:bg-[var(--mn-ink-2)]"
                    >
                      <img
                        src={work.coverUrl || '/avatar-placeholder.png'}
                        alt=""
                        className="w-7 h-9 object-cover border border-[var(--mn-line)]"
                      />
                      <span className="truncate">{work.title}</span>
                      <span className="ml-auto font-pixel text-[10px] uppercase text-[var(--mn-mute)]">
                        {work.totalChapters} cap
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Fluxo do capítulo (5 etapas) */}
      {selectedWork && (
        <ChapterPublishWizard
          workId={selectedWork.id}
          workTitle={selectedWork.title}
          nextChapterNumber={selectedWork.totalChapters + 1}
        />
      )}
    </section>
  );
}

import { useEffect, useState } from 'react';
import { FileText, ChevronDown, Pencil, Trash2 } from 'lucide-react';
import { workApi, CreatorWorkSummaryDto } from '../api/workApi';
import { ChapterPublishWizard, ChapterDraft } from '../components/creator/ChapterPublishWizard';
import { Button } from '../components/ui/Button';

/**
 * "Capítulos" — publicar e editar capítulos de uma obra sua.
 *
 * <p>Responsabilidade única (como no MangaTeofilo: `CreatorChaptersPage`): primeiro você
 * <strong>escolhe a obra</strong> entre as suas; depois o fluxo de 5 etapas sobe as páginas,
 * define a capa do capítulo, revisa e publica. Aqui não se cria obra nova — a obra já
 * existe (foi criada em "Minhas obras").</p>
 *
 * <p>Cada capítulo publicado pode ser **editado** (páginas em nova ordem, capa, título, texto e
 * data de lançamento) — o mesmo CRUD do MangaTeofilo.</p>
 */
/** Extrai a lista de páginas do capítulo (o servidor entrega em JSON). */
function parsePages(read: { pages?: string[]; pagesJson?: string | null }): string[] {
  if (Array.isArray(read.pages)) return read.pages;
  if (!read.pagesJson) return [];
  try {
    const parsed = JSON.parse(read.pagesJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

interface ChapterRow {
  chapterNumber: number;
  title: string;
  coverUrl?: string | null;
  pages: string[];
  releaseDate?: string | null;
  content?: string | null;
  blocksJson?: string | null;
  chapterType?: 'REGULAR' | 'PROLOGUE' | 'SPECIAL' | null;
}

/** Contagem aproximada de caracteres visíveis do capítulo (prosa). */
function proseLength(row: ChapterRow): number {
  if (row.blocksJson) {
    try {
      const parsed = JSON.parse(row.blocksJson) as { blocks?: Array<{ type: string; content?: { text?: string } }> };
      return (parsed.blocks ?? []).reduce(
        (sum, block) => (block.type === 'text' ? sum + (block.content?.text ?? '').length : sum),
        0
      );
    } catch {
      return row.content?.length ?? 0;
    }
  }
  return row.content?.length ?? 0;
}

/** Quantas ilustrações intercaladas o capítulo tem (prosa). */
function proseIllustrations(row: ChapterRow): number {
  if (!row.blocksJson) return 0;
  try {
    const parsed = JSON.parse(row.blocksJson) as { blocks?: Array<{ type: string }> };
    return (parsed.blocks ?? []).filter((block) => block.type === 'illustration').length;
  } catch {
    return 0;
  }
}

export function CreatorChaptersPage() {
  const [works, setWorks] = useState<CreatorWorkSummaryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedWorkId, setSelectedWorkId] = useState<string>('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [chapters, setChapters] = useState<ChapterRow[]>([]);
  const [chaptersLoading, setChaptersLoading] = useState(false);
  const [editing, setEditing] = useState<ChapterDraft | null>(null);
  /** Incrementa depois de publicar/editar para recarregar a lista de capítulos. */
  const [reloadToken, setReloadToken] = useState(0);

  const reloadWorks = () => {
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
  };

  useEffect(() => {
    reloadWorks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedWork = works.find((work) => work.id === selectedWorkId) || null;

  // Carrega os capítulos da obra selecionada (com as páginas, para editar).
  useEffect(() => {
    if (!selectedWork) {
      setChapters([]);
      return;
    }
    let active = true;
    setChaptersLoading(true);
    workApi
      .getWorkBySlug(selectedWork.slug)
      .then(async (work) => {
        const rows: ChapterRow[] = [];
        for (const chapter of work.chapters ?? []) {
          const read = await workApi.readChapter(selectedWork.slug, chapter.chapterNumber).catch(() => null);
          rows.push({
            chapterNumber: chapter.chapterNumber,
            title: chapter.title,
            coverUrl: chapter.coverUrl,
            pages: read ? parsePages(read) : [],
            releaseDate: chapter.publicReleaseAt ?? null,
            content: read?.content ?? null,
            blocksJson: read?.blocksJson ?? null,
            chapterType: read?.chapterType ?? null,
          });
        }
        if (active) setChapters(rows);
      })
      .catch(() => {
        if (active) setChapters([]);
      })
      .finally(() => {
        if (active) setChaptersLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedWork, reloadToken]);

  const removeChapter = async (chapter: ChapterRow) => {
    if (!selectedWork) return;
    if (!window.confirm(`Excluir o capítulo #${chapter.chapterNumber}? As páginas dele saem do catálogo.`)) return;
    try {
      await workApi.deleteChapter(selectedWork.id, chapter.chapterNumber);
      setError(null);
      setChapters((current) => current.filter((item) => item.chapterNumber !== chapter.chapterNumber));
      setEditing(null);
      reloadWorks();
    } catch (err: any) {
      setError(err?.message || 'Não foi possível excluir o capítulo.');
    }
  };

  return (
    <section className="mn-container py-10 space-y-6">
      <header className="border-2 border-[var(--mn-yellow)] bg-[var(--mn-ink-2)] p-6 shadow-[6px_6px_0_var(--mn-yellow)]">
        <p className="font-pixel text-[11px] tracking-widest text-[var(--mn-mute)] uppercase">Criador</p>
        <h1 className="font-display text-3xl sm:text-4xl text-[var(--mn-paper)] uppercase mt-1 flex items-center gap-3">
          <FileText size={26} className="text-[var(--mn-yellow)]" /> Capítulos
        </h1>
        <p className="mt-2 text-sm text-[var(--mn-mute)]">
          Escolha a obra e publique o capítulo. Mangá usa páginas ordenadas; light novel usa um editor
          de texto com ilustrações intercaladas — cada formato tem o seu próprio fluxo abaixo.
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
                        setEditing(null);
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

      {/* Capítulos publicados da obra */}
      {selectedWork && !editing && (
        <div className="border-2 border-[var(--mn-line)] bg-[var(--mn-ink-2)] p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="font-pixel text-[11px] uppercase text-[var(--mn-mute)]">
              Capítulos publicados ({chapters.length})
            </p>
            {chaptersLoading && (
              <span className="font-pixel text-[10px] uppercase text-[var(--mn-mute)]">carregando...</span>
            )}
          </div>
          {chapters.length === 0 && !chaptersLoading && (
            <p className="font-body text-sm text-[var(--mn-mute)]">
              Nenhum capítulo publicado nesta obra ainda.{' '}
              {selectedWork.format === 'LIGHT_NOVEL'
                ? 'Publique o primeiro no fluxo abaixo (Detalhes → Escrever → Revisar → Publicar): o capítulo aparece aqui com o botão EDITAR.'
                : 'Publique o primeiro no fluxo abaixo (Upload → Organizar páginas → Capa → Revisar → Publicar): ele aparece aqui com o botão EDITAR.'}
            </p>
          )}
          <ul className="space-y-2">
            {chapters.map((chapter) => (
              <li
                key={chapter.chapterNumber}
                className="flex flex-wrap items-center justify-between gap-3 border-2 border-[var(--mn-line)] bg-[var(--mn-ink)] px-3 py-2"
              >
                <span className="font-body text-sm text-[var(--mn-paper)]">
                  <span className="font-pixel text-[11px] uppercase text-[var(--mn-yellow)] mr-2">
                    #{chapter.chapterNumber}
                  </span>
                  {chapter.title}
                  {selectedWork?.format === 'LIGHT_NOVEL' ? (
                    <>
                      <span className="ml-2 font-pixel text-[10px] uppercase text-[var(--mn-mute)]">
                        {proseLength(chapter).toLocaleString('pt-BR')} car
                      </span>
                      <span className="ml-2 font-pixel text-[10px] uppercase text-[var(--mn-mute)]">
                        {proseIllustrations(chapter)} ilus
                      </span>
                      {chapter.chapterType === 'PROLOGUE' && (
                        <span className="ml-2 font-pixel text-[10px] uppercase text-[var(--mn-teal)]">prólogo</span>
                      )}
                      {chapter.chapterType === 'SPECIAL' && (
                        <span className="ml-2 font-pixel text-[10px] uppercase text-[var(--mn-teal)]">especial</span>
                      )}
                    </>
                  ) : (
                    <span className="ml-2 font-pixel text-[10px] uppercase text-[var(--mn-mute)]">
                      {chapter.pages.length} pág
                    </span>
                  )}
                  {chapter.releaseDate && new Date(chapter.releaseDate).getTime() > Date.now() && (
                    <span className="ml-2 font-pixel text-[10px] uppercase text-[var(--mn-teal)]">
                      PROGRAMADO PARA {new Date(chapter.releaseDate).toLocaleDateString('pt-BR')}
                    </span>
                  )}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    onClick={() =>
                      setEditing({
                        chapterNumber: chapter.chapterNumber,
                        title: chapter.title,
                        pages: chapter.pages,
                        coverUrl: chapter.coverUrl ?? null,
                        releaseDate: chapter.releaseDate ?? null,
                        content: chapter.content ?? null,
                        blocksJson: chapter.blocksJson ?? null,
                        chapterType: chapter.chapterType ?? null,
                      })
                    }
                  >
                    <Pencil size={13} /> EDITAR
                  </Button>
                  <Button variant="ghost" onClick={() => removeChapter(chapter)} title="Excluir este capítulo (com as páginas)">
                    <Trash2 size={13} /> EXCLUIR
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Fluxo do capítulo (5 etapas) */}
      {selectedWork && (
        <>
          {editing && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-2 border-[var(--mn-teal)] bg-[var(--mn-ink-2)] px-4 py-3">
              <p className="font-pixel text-[11px] uppercase text-[var(--mn-teal)]">
                Editando o capítulo #{editing.chapterNumber} — “{editing.title}”
              </p>
              <Button variant="ghost" onClick={() => setEditing(null)}>
                CANCELAR EDIÇÃO
              </Button>
            </div>
          )}
          <ChapterPublishWizard
            // A chave remonta o wizard quando o capitulo em edicao muda: sem isso o
            // estado inicial (paginas salvas, titulo, capa) ficaria do capitulo anterior.
            key={editing ? `edicao-${editing.chapterNumber}` : 'novo'}
            workId={selectedWork.id}
            workTitle={selectedWork.title}
            workFormat={selectedWork.format}
            nextChapterNumber={
              editing?.chapterNumber ??
              Math.max(0, ...chapters.map((row) => row.chapterNumber)) + 1
            }
            draft={editing}
            existingChapterNumbers={chapters.map((row) => row.chapterNumber)}
            onPublished={() => setReloadToken((token) => token + 1)}
          />
        </>
      )}
    </section>
  );
}

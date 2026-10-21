import { useMemo, useRef, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, GripVertical, Image as ImageIcon, Trash2, Upload, X, ZoomIn } from 'lucide-react';
import { workApi } from '../../api/workApi';
import { storageApi } from '../../api/storageApi';
import { Button } from '../ui/Button';
import { Field } from '../ui/Field';

/**
 * Publicação de obra + capítulo em 5 etapas, na mesma ordem e com as mesmas regras do
 * MangaTeofilo (`useChapterWizard` + `ChapterStepUpload/Organize/Cover/Review/Publish`):
 *
 *   1. Upload (capa e páginas)  2. Organizar páginas  3. Ajustar capa
 *   4. Revisar metadados         5. Publicar
 *
 * O avanço é travado até a etapa atual estar completa e o checklist mostra o estado de
 * cada passo. A pré-visualização das páginas é local (objectURL), como no MangaTeofilo.
 */

const STEPS = [
  { id: 1, label: 'Upload (capa e páginas)' },
  { id: 2, label: 'Organizar páginas' },
  { id: 3, label: 'Ajustar capa' },
  { id: 4, label: 'Revisar metadados' },
  { id: 5, label: 'Publicar' },
] as const;

const GENRES = ['ACAO', 'AVENTURA', 'ROMANCE', 'FANTASIA', 'SCI_FI', 'SHONEN', 'DRAMA', 'TERROR'];

interface PageItem {
  key: string;
  file: File;
  previewUrl: string;
}

export function ChapterPublishWizard() {
  const [step, setStep] = useState<number>(1);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [pages, setPages] = useState<PageItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState<PageItem | null>(null);
  const [title, setTitle] = useState('');
  const [synopsis, setSynopsis] = useState('');
  const [genres, setGenres] = useState<string[]>(['ACAO']);
  const [format, setFormat] = useState<'MANGA' | 'LIGHT_NOVEL'>('MANGA');
  const [declared, setDeclared] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const pagesInputRef = useRef<HTMLInputElement | null>(null);
  const coverInputRef = useRef<HTMLInputElement | null>(null);

  const uploadStepReady = Boolean(coverFile) && pages.length > 0;
  const organizeStepReady = pages.length > 0;
  const coverStepReady = Boolean(coverFile);
  const metadataStepReady = title.trim().length > 0 && synopsis.trim().length > 0 && declared;

  const checklist = useMemo(
    () => [
      { id: 1, label: 'Upload (capa e páginas)', ok: uploadStepReady },
      { id: 2, label: 'Organizar páginas', ok: organizeStepReady },
      { id: 3, label: 'Ajustar capa', ok: coverStepReady },
      { id: 4, label: 'Revisar metadados', ok: metadataStepReady },
      { id: 5, label: 'Publicar', ok: uploadStepReady && organizeStepReady && coverStepReady && metadataStepReady },
    ],
    [uploadStepReady, organizeStepReady, coverStepReady, metadataStepReady]
  );

  const maxStep = useMemo(() => {
    if (!uploadStepReady) return 1;
    if (!organizeStepReady) return 2;
    if (!coverStepReady) return 3;
    if (!metadataStepReady) return 4;
    return 5;
  }, [uploadStepReady, organizeStepReady, coverStepReady, metadataStepReady]);

  const goToStep = (target: number) => {
    setStep(Math.min(Math.max(1, target), maxStep));
    setError(null);
  };

  const addPages = (files: FileList | File[]) => {
    const selected = Array.from(files).filter((file) => file.type.startsWith('image/'));
    if (selected.length === 0) {
      setError('Selecione arquivos de imagem (JPG, PNG ou WebP).');
      return;
    }
    setError(null);
    setPages((current) => [
      ...current,
      ...selected.map((file) => ({
        key: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        previewUrl: URL.createObjectURL(file),
      })),
    ]);
  };

  const removePage = (key: string) => {
    setPages((current) => {
      const target = current.find((item) => item.key === key);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return current.filter((item) => item.key !== key);
    });
  };

  const movePage = (index: number, direction: -1 | 1) => {
    setPages((current) => {
      const next = [...current];
      const target = index + direction;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const pickCover = (file: File | undefined) => {
    if (!file) return;
    setError(null);
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  const publish = async () => {
    if (!coverFile) {
      setError('Envie a capa da obra.');
      return;
    }
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const cover = await storageApi.uploadFile(coverFile);
      const uploaded: string[] = [];
      for (const page of pages) {
        const stored = await storageApi.uploadFile(page.file);
        uploaded.push(stored.url);
      }

      const work = await workApi.createWork({
        title: title.trim(),
        synopsis: synopsis.trim(),
        coverUrl: cover.url,
        genres,
        originalAuthorDeclaration: true,
        format,
      });

      if (uploaded.length > 0) {
        await workApi.createChapter(work.workId, {
          chapterNumber: 1,
          title: 'Capítulo 1: O Começo',
          pages: uploaded,
          publicReleaseAt: new Date().toISOString(),
        });
      }

      setSuccess(`Obra "${title.trim()}" publicada com ${uploaded.length} página(s).`);
    } catch (err: any) {
      setError(err?.message || 'Não foi possível publicar. Verifique os dados e tente novamente.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Checklist de publicação (mesma ordem do MangaTeofilo) */}
      <nav aria-label="Etapas de publicação" className="border-2 border-[var(--mn-line)] bg-[var(--mn-ink-2)] p-4">
        <ol className="grid sm:grid-cols-5 gap-2">
          {STEPS.map((item) => {
            const state = checklist.find((entry) => entry.id === item.id);
            const active = step === item.id;
            const locked = item.id > maxStep;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => goToStep(item.id)}
                  disabled={locked}
                  aria-current={active ? 'step' : undefined}
                  className={`w-full text-left px-3 py-2 border-2 font-pixel text-[11px] uppercase transition-colors ${
                    active
                      ? 'bg-[var(--mn-yellow)] text-[var(--mn-ink)] border-[var(--mn-ink)]'
                      : state?.ok
                        ? 'border-[var(--mn-teal)] text-[var(--mn-teal)] hover:bg-[var(--mn-ink)]'
                        : locked
                          ? 'border-[var(--mn-line)] text-[var(--mn-mute)] opacity-60 cursor-not-allowed'
                          : 'border-[var(--mn-line)] text-[var(--mn-paper)] hover:bg-[var(--mn-ink)]'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    {state?.ok ? <Check size={12} /> : <span>{item.id}.</span>}
                    {item.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      {/* ETAPA 1 — Upload */}
      {step === 1 && (
        <section className="border-2 border-[var(--mn-yellow)] bg-[var(--mn-ink-2)] p-5 space-y-4">
          <h3 className="font-display text-xl text-[var(--mn-paper)] uppercase">Envie a capa e as páginas</h3>
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              addPages(event.dataTransfer.files);
            }}
            className={`border-2 border-dashed p-8 text-center transition-colors ${
              dragging ? 'border-[var(--mn-yellow)] bg-[var(--mn-ink)]' : 'border-[var(--mn-line)]'
            }`}
          >
            <ImageIcon size={28} className="mx-auto text-[var(--mn-mute)]" />
            <p className="font-display text-sm text-[var(--mn-paper)] uppercase mt-2">Arraste as páginas aqui</p>
            <p className="font-body text-xs text-[var(--mn-mute)]">ou use o seletor abaixo (JPG, PNG ou WebP)</p>
            <Button type="button" variant="ghost" className="mt-3" onClick={() => pagesInputRef.current?.click()}>
              <Upload size={14} /> ESCOLHER PÁGINAS
            </Button>
            <input
              ref={pagesInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={(event) => {
                if (event.target.files) addPages(event.target.files);
                event.target.value = '';
              }}
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="border-2 border-[var(--mn-line)] p-3 space-y-2">
              <p className="font-pixel text-[11px] uppercase text-[var(--mn-mute)]">Capa da obra (2:3)</p>
              {coverPreview ? (
                <img src={coverPreview} alt="Pré-visualização da capa" className="w-24 h-32 object-cover border-2 border-[var(--mn-line)]" />
              ) : (
                <p className="font-pixel text-[11px] uppercase text-[var(--mn-mute)]">Nenhum arquivo selecionado</p>
              )}
              <Button type="button" variant="ghost" onClick={() => coverInputRef.current?.click()}>
                {coverFile ? 'TROCAR CAPA' : 'ESCOLHER CAPA'}
              </Button>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(event) => {
                  pickCover(event.target.files?.[0]);
                  event.target.value = '';
                }}
              />
            </div>

            <div className="border-2 border-[var(--mn-line)] p-3 space-y-2">
              <p className="font-pixel text-[11px] uppercase text-[var(--mn-mute)]">
                Páginas ({pages.length})
              </p>
              {pages.length === 0 && (
                <p className="font-pixel text-[11px] uppercase text-[var(--mn-mute)]">Nenhuma página selecionada</p>
              )}
              <ul className="flex flex-wrap gap-2">
                {pages.map((page, index) => (
                  <li key={page.key} className="relative">
                    <img src={page.previewUrl} alt={`Página ${index + 1}`} className="w-14 h-20 object-cover border border-[var(--mn-line)]" />
                    <span className="absolute bottom-0 left-0 bg-black/70 px-1 font-pixel text-[9px] text-white">
                      Pág {index + 1}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

      {/* ETAPA 2 — Organizar páginas */}
      {step === 2 && (
        <section className="border-2 border-[var(--mn-line)] bg-[var(--mn-ink-2)] p-5 space-y-4">
          <h3 className="font-display text-xl text-[var(--mn-paper)] uppercase">Organize as páginas</h3>
          <p className="font-body text-xs text-[var(--mn-mute)]">
            A ordem das páginas é a ordem de leitura. Use as setas para mover, o ícone de lixeira para remover
            e o zoom para conferir antes de publicar.
          </p>
          <ul className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {pages.map((page, index) => (
              <li key={page.key} className="border-2 border-[var(--mn-line)] bg-[var(--mn-ink)] p-2 space-y-2">
                <button
                  type="button"
                  onClick={() => setPreview(page)}
                  className="block w-full focus-visible:outline"
                  title="Ampliar"
                >
                  <img src={page.previewUrl} alt={`Página ${index + 1}`} className="w-full h-28 object-cover" />
                </button>
                <span className="font-pixel text-[10px] uppercase text-[var(--mn-yellow)]">Pág {index + 1}</span>
                <div className="flex items-center justify-between gap-1">
                  <button
                    type="button"
                    onClick={() => movePage(index, -1)}
                    disabled={index === 0}
                    className="p-1 border border-[var(--mn-line)] text-[var(--mn-paper)] disabled:opacity-40 hover:border-[var(--mn-yellow)]"
                    title="Mover para cima"
                    aria-label={`Mover a página ${index + 1} para cima`}
                  >
                    <ChevronLeft size={12} />
                  </button>
                  <GripVertical size={12} className="text-[var(--mn-mute)]" />
                  <button
                    type="button"
                    onClick={() => movePage(index, 1)}
                    disabled={index === pages.length - 1}
                    className="p-1 border border-[var(--mn-line)] text-[var(--mn-paper)] disabled:opacity-40 hover:border-[var(--mn-yellow)]"
                    title="Mover para baixo"
                    aria-label={`Mover a página ${index + 1} para baixo`}
                  >
                    <ChevronRight size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => removePage(page.key)}
                    className="p-1 border border-[var(--mn-line)] text-[var(--mn-red)] hover:border-[var(--mn-red)]"
                    title="Remover página"
                    aria-label={`Remover a página ${index + 1}`}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ETAPA 3 — Ajustar capa */}
      {step === 3 && (
        <section className="border-2 border-[var(--mn-line)] bg-[var(--mn-ink-2)] p-5 space-y-4">
          <h3 className="font-display text-xl text-[var(--mn-paper)] uppercase">Ajustar capa</h3>
          <p className="font-body text-xs text-[var(--mn-mute)]">
            A capa é recortada e redimensionada pelo servidor (512px, sem metadados). Confira o enquadramento
            e troque o arquivo se precisar.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            {coverPreview && (
              <img src={coverPreview} alt="Capa da obra" className="w-40 h-56 object-cover border-2 border-[var(--mn-yellow)]" />
            )}
            <Button type="button" variant="ghost" onClick={() => coverInputRef.current?.click()}>
              {coverFile ? 'TROCAR ARQUIVO DA CAPA' : 'ESCOLHER A CAPA'}
            </Button>
          </div>
        </section>
      )}

      {/* ETAPA 4 — Revisar metadados */}
      {step === 4 && (
        <section className="border-2 border-[var(--mn-line)] bg-[var(--mn-ink-2)] p-5 space-y-4">
          <h3 className="font-display text-xl text-[var(--mn-paper)] uppercase">Revise os metadados</h3>
          <Field label="TÍTULO DA OBRA" value={title} onChange={(event) => setTitle(event.target.value)} />
          <div className="space-y-1.5">
            <label htmlFor="wizard-synopsis" className="font-body text-sm font-semibold text-[var(--mn-paper)] block">
              SINOPSE
            </label>
            <textarea
              id="wizard-synopsis"
              value={synopsis}
              onChange={(event) => setSynopsis(event.target.value)}
              rows={3}
              className="w-full p-3 bg-[var(--mn-ink-2)] text-[var(--mn-paper)] font-body text-sm border-2 border-[var(--mn-line)] focus:border-[var(--mn-paper)] focus:shadow-[3px_3px_0_var(--mn-yellow)] outline-none"
            />
          </div>
          <div className="space-y-2">
            <p className="font-body text-sm font-semibold text-[var(--mn-paper)]">GÊNEROS</p>
            <div className="flex flex-wrap gap-2">
              {GENRES.map((genre) => (
                <button
                  key={genre}
                  type="button"
                  onClick={() =>
                    setGenres((current) =>
                      current.includes(genre) ? current.filter((item) => item !== genre) : [...current, genre]
                    )
                  }
                  aria-pressed={genres.includes(genre)}
                  className={`px-3 py-1 border-2 font-pixel text-[11px] uppercase transition-colors ${
                    genres.includes(genre)
                      ? 'bg-[var(--mn-yellow)] text-[var(--mn-ink)] border-[var(--mn-ink)]'
                      : 'border-[var(--mn-line)] text-[var(--mn-paper)] hover:border-[var(--mn-yellow)]'
                  }`}
                >
                  {genre}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <p className="font-body text-sm font-semibold text-[var(--mn-paper)]">FORMATO</p>
            <div className="flex gap-2">
              {(['MANGA', 'LIGHT_NOVEL'] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setFormat(option)}
                  aria-pressed={format === option}
                  className={`px-3 py-1 border-2 font-pixel text-[11px] uppercase transition-colors ${
                    format === option
                      ? 'bg-[var(--mn-yellow)] text-[var(--mn-ink)] border-[var(--mn-ink)]'
                      : 'border-[var(--mn-line)] text-[var(--mn-paper)] hover:border-[var(--mn-yellow)]'
                  }`}
                >
                  {option === 'MANGA' ? 'MANGÁ (PÁGINAS)' : 'LIGHT NOVEL (PROSA)'}
                </button>
              ))}
            </div>
          </div>
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={declared}
              onChange={(event) => setDeclared(event.target.checked)}
              className="mt-1 w-5 h-5 accent-[var(--mn-yellow)] cursor-pointer"
            />
            <span className="font-display text-sm text-[var(--mn-paper)] uppercase leading-snug">
              Declaro que todas as obras e capítulos publicados nesta conta são de minha autoria original.
            </span>
          </label>
        </section>
      )}

      {/* ETAPA 5 — Publicar */}
      {step === 5 && (
        <section className="border-2 border-[var(--mn-yellow)] bg-[var(--mn-ink-2)] p-5 space-y-4">
          <h3 className="font-display text-xl text-[var(--mn-paper)] uppercase">Publicar</h3>
          <dl className="grid sm:grid-cols-2 gap-2 font-body text-sm">
            <div className="flex justify-between border-b border-[var(--mn-line)] py-1">
              <dt className="text-[var(--mn-mute)]">Título</dt>
              <dd className="text-[var(--mn-paper)]">{title}</dd>
            </div>
            <div className="flex justify-between border-b border-[var(--mn-line)] py-1">
              <dt className="text-[var(--mn-mute)]">Páginas</dt>
              <dd className="text-[var(--mn-paper)]">{pages.length}</dd>
            </div>
            <div className="flex justify-between border-b border-[var(--mn-line)] py-1">
              <dt className="text-[var(--mn-mute)]">Formato</dt>
              <dd className="text-[var(--mn-paper)]">{format}</dd>
            </div>
            <div className="flex justify-between border-b border-[var(--mn-line)] py-1">
              <dt className="text-[var(--mn-mute)]">Gêneros</dt>
              <dd className="text-[var(--mn-paper)]">{genres.join(', ') || '—'}</dd>
            </div>
          </dl>
          <Button onClick={publish} disabled={busy} variant="primary" className="!px-6">
            {busy ? 'PUBLICANDO...' : 'PUBLICAR OBRA NO CATÁLOGO OFICIAL'}
          </Button>
        </section>
      )}

      {/* Navegacao entre etapas */}
      <div className="flex items-center justify-between gap-3">
        <Button type="button" variant="ghost" onClick={() => goToStep(step - 1)} disabled={step <= 1}>
          <ChevronLeft size={14} /> VOLTAR
        </Button>
        <span className="font-pixel text-[11px] uppercase text-[var(--mn-mute)]">
          Etapa {step} de 5
        </span>
        <Button type="button" variant="ghost" onClick={() => goToStep(step + 1)} disabled={step >= maxStep}>
          AVANÇAR <ChevronRight size={14} />
        </Button>
      </div>

      {error && (
        <p role="alert" className="border-2 border-[var(--mn-red)] bg-[var(--mn-ink-2)] p-3 font-body text-sm text-[var(--mn-paper)]">
          {error}
        </p>
      )}
      {success && (
        <p role="status" className="border-2 border-[var(--mn-teal)] bg-[var(--mn-ink-2)] p-3 font-body text-sm text-[var(--mn-paper)]">
          {success}
        </p>
      )}

      {/* Preview ampliada da pagina */}
      {preview && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Pré-visualização da página ${pages.findIndex((item) => item.key === preview.key) + 1}`}
          className="fixed inset-0 z-[120] bg-black/85 flex items-center justify-center p-6"
          onClick={() => setPreview(null)}
        >
          <div className="relative max-h-full overflow-auto" onClick={(event) => event.stopPropagation()}>
            <img src={preview.previewUrl} alt="Página ampliada" className="max-h-[80vh] object-contain" />
            <button
              type="button"
              onClick={() => setPreview(null)}
              className="absolute top-2 right-2 p-2 bg-[var(--mn-ink)] border-2 border-[var(--mn-paper)] text-[var(--mn-paper)]"
              aria-label="Fechar pré-visualização"
            >
              <X size={16} />
            </button>
            <p className="mt-2 font-pixel text-[11px] uppercase text-[var(--mn-paper)] flex items-center gap-1">
              <ZoomIn size={12} /> Pág {pages.findIndex((item) => item.key === preview.key) + 1}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

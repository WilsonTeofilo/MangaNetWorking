import { useMemo, useRef, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, GripVertical, Image as ImageIcon, Trash2, Upload, X, ZoomIn } from 'lucide-react';
import { workApi } from '../../api/workApi';
import { storageApi } from '../../api/storageApi';
import { Button } from '../ui/Button';
import { Field } from '../ui/Field';

/**
 * Publicação de um CAPÍTULO em 5 etapas, na mesma ordem e com as mesmas regras do
 * MangaTeofilo (`useChapterWizard` + `ChapterStepUpload/Organize/Cover/Review/Publish`):
 *
 *   1. Upload (páginas)   2. Organizar páginas   3. Capa do capítulo
 *   4. Revisar             5. Publicar
 *
 * A obra **já existe**: ela vem escolhida na tela "Capítulos" (que lista as obras de
 * "Minhas obras"). Aqui não se cria nem se configura obra — só o capítulo.
 * O avanço é travado até a etapa atual estar completa e o checklist mostra o estado.
 */

const STEPS = [
  { id: 1, label: 'Upload (páginas)' },
  { id: 2, label: 'Organizar páginas' },
  { id: 3, label: 'Capa do capítulo' },
  { id: 4, label: 'Revisar' },
  { id: 5, label: 'Publicar' },
] as const;

interface PageItem {
  key: string;
  file: File;
  previewUrl: string;
}

export function ChapterPublishWizard({
  workId,
  workTitle,
  nextChapterNumber,
}: {
  workId: string;
  workTitle: string;
  nextChapterNumber: number;
}) {
  const [step, setStep] = useState<number>(1);
  const [pages, setPages] = useState<PageItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState<PageItem | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [chapterTitle, setChapterTitle] = useState(`Capítulo ${nextChapterNumber}`);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const pagesInputRef = useRef<HTMLInputElement | null>(null);
  const coverInputRef = useRef<HTMLInputElement | null>(null);

  const uploadReady = pages.length > 0;
  const organizeReady = pages.length > 0;
  const coverReady = true;
  const reviewReady = chapterTitle.trim().length > 0 && pages.length > 0;

  const checklist = useMemo(
    () => [
      { id: 1, label: 'Upload (páginas)', ok: uploadReady },
      { id: 2, label: 'Organizar páginas', ok: organizeReady },
      { id: 3, label: 'Capa do capítulo', ok: coverReady },
      { id: 4, label: 'Revisar', ok: reviewReady },
      { id: 5, label: 'Publicar', ok: uploadReady && organizeReady && reviewReady },
    ],
    [uploadReady, organizeReady, reviewReady]
  );

  const maxStep = useMemo(() => {
    if (!uploadReady) return 1;
    if (!organizeReady) return 2;
    if (!reviewReady) return 4;
    return 5;
  }, [uploadReady, organizeReady, reviewReady]);

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
    if (pages.length === 0) {
      setError('Envie pelo menos uma página do capítulo.');
      return;
    }
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const uploaded: string[] = [];
      for (const page of pages) {
        const stored = await storageApi.uploadFile(page.file);
        uploaded.push(stored.url);
      }
      let coverUrl: string | undefined;
      if (coverFile) {
        const storedCover = await storageApi.uploadFile(coverFile);
        coverUrl = storedCover.url;
      }

      // O capítulo NASCE dentro de uma obra já existente (escolhida em "Capítulos").
      await workApi.createChapter(workId, {
        chapterNumber: nextChapterNumber,
        title: chapterTitle.trim(),
        coverUrl,
        pages: uploaded,
        publicReleaseAt: new Date().toISOString(),
      });

      setSuccess(`Capítulo publicado em "${workTitle}".`);
      setPages([]);
    } catch (err: any) {
      setError(err?.message || 'Não foi possível publicar o capítulo. Verifique os dados e tente novamente.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <p className="font-pixel text-[11px] uppercase text-[var(--mn-mute)]">
        Publicando em <span className="text-[var(--mn-yellow)]">{workTitle}</span> · capítulo {nextChapterNumber}
      </p>

      {/* Checklist de publicação (mesma ordem do MangaTeofilo) */}
      <nav aria-label="Etapas de publicação do capítulo" className="border-2 border-[var(--mn-line)] bg-[var(--mn-ink-2)] p-4">
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

      {/* ETAPA 1 — Upload das páginas */}
      {step === 1 && (
        <section className="border-2 border-[var(--mn-yellow)] bg-[var(--mn-ink-2)] p-5 space-y-4">
          <h3 className="font-display text-xl text-[var(--mn-paper)] uppercase">Envie as páginas do capítulo</h3>
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
          {pages.length > 0 && (
            <p className="font-pixel text-[11px] uppercase text-[var(--mn-mute)]">
              {pages.length} página(s) selecionada(s)
            </p>
          )}
        </section>
      )}

      {/* ETAPA 2 — Organizar páginas */}
      {step === 2 && (
        <section className="border-2 border-[var(--mn-line)] bg-[var(--mn-ink-2)] p-5 space-y-4">
          <h3 className="font-display text-xl text-[var(--mn-paper)] uppercase">Organize as páginas</h3>
          <p className="font-body text-xs text-[var(--mn-mute)]">
            A ordem das páginas é a ordem de leitura. Use as setas para mover, o ícone de lixeira para
            remover e o zoom para conferir antes de publicar.
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

      {/* ETAPA 3 — Capa do capítulo */}
      {step === 3 && (
        <section className="border-2 border-[var(--mn-line)] bg-[var(--mn-ink-2)] p-5 space-y-4">
          <h3 className="font-display text-xl text-[var(--mn-paper)] uppercase">Capa do capítulo</h3>
          <p className="font-body text-xs text-[var(--mn-mute)]">
            Opcional: se você não enviar, o capítulo usa a capa da obra.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            {coverPreview && (
              <img src={coverPreview} alt="Capa do capítulo" className="w-28 h-40 object-cover border-2 border-[var(--mn-yellow)]" />
            )}
            <Button type="button" variant="ghost" onClick={() => coverInputRef.current?.click()}>
              {coverFile ? 'TROCAR ARQUIVO' : 'ESCOLHER CAPA DO CAPÍTULO'}
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
        </section>
      )}

      {/* ETAPA 4 — Revisar */}
      {step === 4 && (
        <section className="border-2 border-[var(--mn-line)] bg-[var(--mn-ink-2)] p-5 space-y-4">
          <h3 className="font-display text-xl text-[var(--mn-paper)] uppercase">Revise antes de publicar</h3>
          <Field label="TÍTULO DO CAPÍTULO" value={chapterTitle} onChange={(event) => setChapterTitle(event.target.value)} />
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
              <dt className="text-[var(--mn-mute)]">Páginas</dt>
              <dd className="text-[var(--mn-paper)]">{pages.length}</dd>
            </div>
            <div className="flex justify-between border-b border-[var(--mn-line)] py-1">
              <dt className="text-[var(--mn-mute)]">Capa própria</dt>
              <dd className="text-[var(--mn-paper)]">{coverFile ? 'sim' : 'usa a capa da obra'}</dd>
            </div>
          </dl>
        </section>
      )}

      {/* ETAPA 5 — Publicar */}
      {step === 5 && (
        <section className="border-2 border-[var(--mn-yellow)] bg-[var(--mn-ink-2)] p-5 space-y-4">
          <h3 className="font-display text-xl text-[var(--mn-paper)] uppercase">Publicar capítulo</h3>
          <p className="font-body text-xs text-[var(--mn-mute)]">
            O capítulo entra na obra <strong className="text-[var(--mn-paper)]">{workTitle}</strong> e fica
            disponível no catálogo.
          </p>
          <Button onClick={publish} disabled={busy} variant="primary" className="!px-6">
            {busy ? 'PUBLICANDO...' : 'PUBLICAR CAPÍTULO'}
          </Button>
        </section>
      )}

      {/* Navegacao entre etapas */}
      <div className="flex items-center justify-between gap-3">
        <Button type="button" variant="ghost" onClick={() => goToStep(step - 1)} disabled={step <= 1}>
          <ChevronLeft size={14} /> VOLTAR
        </Button>
        <span className="font-pixel text-[11px] uppercase text-[var(--mn-mute)]">Etapa {step} de 5</span>
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

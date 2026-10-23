import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Crop, GripVertical, Pencil, Image as ImageIcon, Trash2, Upload, X, ZoomIn, Plus, CornerDownLeft } from 'lucide-react';
import { workApi } from '../../api/workApi';
import { storageApi } from '../../api/storageApi';
import { Button } from '../ui/Button';
import { Field } from '../ui/Field';
import { toBackendLocalDateTime } from '../../utils/datetime';
import { ImageCropper } from '../common/ImageCropper';
import { LightNovelChapterWizard } from './LightNovelChapterWizard';
import type { ChapterDraft } from './LightNovelChapterWizard';

// O contrato de rascunho é comum aos dois fluxos (mangá e light novel).
export type { ChapterDraft };

/**
 * Publicação de um CAPÍTULO em 5 etapas, na mesma ordem e com as mesmas regras do
 * MangaTeofilo (`useChapterWizard` + `ChapterStepUpload/Organize/Cover/Review/Publish`):
 *
 *   1. Upload (páginas ou texto)   2. Organizar páginas   3. Capa do capítulo
 *   4. Revisar                       5. Publicar
 *
 * A obra **já existe**: ela vem escolhida na tela "Capítulos" (que lista as obras de
 * "Minhas obras"). Aqui não se cria nem se configura obra — só o capítulo.
 *
 * O formato da obra manda: MANGA publica páginas, LIGHT_NOVEL publica texto de prosa.
 *
 * Organizar páginas: arrastar para reordenar (além das setas), ir direto para a página N
 * digitando o número, e adicionar mais imagens sem voltar para a etapa de upload.
 */

const STEPS = [
  { id: 1, label: 'Upload' },
  { id: 2, label: 'Organizar páginas' },
  { id: 3, label: 'Capa do capítulo' },
  { id: 4, label: 'Revisar' },
  { id: 5, label: 'Publicar' },
] as const;

interface PageItem {
  key: string;
  /** Arquivo novo (ainda não enviado). Ausente em página já publicada. */
  file?: File;
  /** URL definitiva da página (no modo de edição, a página já está no storage). */
  url?: string;
  previewUrl: string;
}

export interface ChapterPublishWizardProps {
  workId: string;
  workTitle: string;
  workFormat?: 'MANGA' | 'LIGHT_NOVEL' | null;
  nextChapterNumber: number;
  /** Capítulo em edição (páginas, texto e metadados já gravados). */
  draft?: ChapterDraft | null;
  /** Números de capítulo já usados na obra (light novel: impede um segundo capítulo 0). */
  existingChapterNumbers?: number[];
  /** Publicou/editou: o painel recarrega a lista de capítulos. */
  onPublished?: () => void;
}

/**
 * Roteia para o fluxo certo. Mangá e light novel são sistemas de publicação
 * diferentes: páginas ordenadas vs. documento de blocos (texto + ilustrações).
 */
export function ChapterPublishWizard(props: ChapterPublishWizardProps) {
  if (props.workFormat === 'LIGHT_NOVEL') {
    return <LightNovelChapterWizard {...props} />;
  }
  return <MangaChapterPublishWizard {...props} />;
}

function MangaChapterPublishWizard({
  workId,
  workTitle,
  workFormat,
  nextChapterNumber,
  draft,
}: ChapterPublishWizardProps) {
  const isEditing = Boolean(draft);
  const isProse = workFormat === 'LIGHT_NOVEL';

  const [step, setStep] = useState<number>(1);
  const [pages, setPages] = useState<PageItem[]>(() =>
    (draft?.pages ?? []).map((url, index) => ({
      key: `existente-${index}-${url}`,
      url,
      previewUrl: url,
    }))
  );
  const [prose, setProse] = useState('');
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState<PageItem | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  /** URL da capa atual (edicao): permite reajustar sem subir arquivo. */
  const [coverUrl, setCoverUrl] = useState<string | null>(draft?.coverUrl ?? null);
  // a URL definitiva da capa (o arquivo local so vale enquanto a tela estiver aberta)
  const [coverPreview, setCoverPreview] = useState<string | null>(draft?.coverUrl ?? null);
  const [chapterTitle, setChapterTitle] = useState(`Capítulo ${nextChapterNumber}`);
  // Padrao: agora. O campo ja vem preenchido com a data/hora atual (o autor pode mudar).
  const [releaseDate, setReleaseDate] = useState(() => toBackendLocalDateTime(new Date()));
  const [chapterCoverCropOpen, setChapterCoverCropOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [jumpTo, setJumpTo] = useState('');
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const pagesInputRef = useRef<HTMLInputElement | null>(null);
  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const pageRefs = useRef<Record<string, HTMLLIElement | null>>({});

  const uploadReady = isProse ? prose.trim().length > 0 : pages.length > 0;
  const organizeReady = uploadReady;
  const coverReady = true;
  const reviewReady = chapterTitle.trim().length > 0 && uploadReady;

  const checklist = useMemo(
    () => [
      { id: 1, label: 'Upload', ok: uploadReady },
      { id: 2, label: 'Organizar páginas', ok: organizeReady },
      { id: 3, label: 'Capa do capítulo', ok: coverReady },
      { id: 4, label: 'Revisar', ok: reviewReady },
      { id: 5, label: 'Publicar', ok: uploadReady && organizeReady && reviewReady },
    ],
    [uploadReady, organizeReady, reviewReady]
  );

  const maxStep = useMemo(() => {
    // Em EDIÇÃO nada é travado: o capítulo já existe e o autor mexe em qualquer etapa.
    if (isEditing) return 5;
    if (!uploadReady) return 1;
    if (!organizeReady) return 2;
    if (!reviewReady) return 4;
    return 5;
  }, [uploadReady, organizeReady, reviewReady, isEditing]);

  const goToStep = (target: number) => {
    setStep(Math.min(Math.max(1, target), maxStep));
    setError(null);
  };

  const addPages = (files: FileList | File[], advance = false) => {
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
    // Upload feito: vai direto para organizar (é onde a pessoa mexe na ordem).
    if (advance) {
      setStep(2);
    }
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

  /** Arrastar e soltar: move a página para a posição alvo. */
  const reorderByDrag = (from: number, to: number) => {
    setPages((current) => {
      if (from === to || from < 0 || to < 0 || from >= current.length || to >= current.length) return current;
      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  /** Vai direto para a página digitada (como no MangaTeofilo). */
  const jumpToPage = () => {
    const target = Number(jumpTo);
    if (!Number.isInteger(target) || target < 1 || target > pages.length) {
      setError('Digite um número de página existente.');
      return;
    }
    setError(null);
    const key = pages[target - 1]?.key;
    if (key && pageRefs.current[key]) {
      pageRefs.current[key]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    setJumpTo('');
  };

  // Reidrata o capitulo em edicao: sem isso, trocar de capitulo mantem as paginas
  // (e o titulo/capa/data) do anterior. A guarda evita apagar o trabalho em andamento.
  const appliedDraftKey = useRef<string | null>(null);
  useEffect(() => {
    const key = draft ? `edicao-${draft.chapterNumber}` : 'novo';
    if (appliedDraftKey.current === key) return;
    appliedDraftKey.current = key;
    setPages(
      (draft?.pages ?? []).map((url, index) => ({
        key: `existente-${index}-${url}`,
        url,
        previewUrl: url,
      }))
    );
    setChapterTitle(draft?.title ?? `Capítulo ${nextChapterNumber}`);
    setCoverFile(null);
    setCoverUrl(draft?.coverUrl ?? null);
    setCoverPreview(draft?.coverUrl ?? null);
    setReleaseDate(draft?.releaseDate || toBackendLocalDateTime(new Date()));
    setProse('');
    setError(null);
  }, [draft, nextChapterNumber]);

  const pickCover = (file: File | undefined) => {
    if (!file) return;
    setError(null);
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  const publish = async () => {
    if (!uploadReady) {
      setError(isProse ? 'Escreva o texto do capítulo.' : 'Envie pelo menos uma página do capítulo.');
      return;
    }
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const uploaded: string[] = [];
      if (!isProse) {
        for (const page of pages) {
          if (page.url) {
            // Página já publicada: mantém a URL (não reenvia o arquivo).
            uploaded.push(page.url);
            continue;
          }
          if (!page.file) continue;
          const stored = await storageApi.uploadFile(page.file);
          uploaded.push(stored.url);
        }
      }
      // A capa definitiva: a que ja estava gravada (ou o recorte novo) tem prioridade
      // sobre o arquivo local recem-escolhido.
      let chapterCoverUrl: string | undefined = coverUrl ?? undefined;
      if (!chapterCoverUrl && coverFile) {
        const storedCover = await storageApi.uploadFile(coverFile);
        chapterCoverUrl = storedCover.url;
      }

      // O capítulo NASCE dentro de uma obra já existente (escolhida em "Capítulos"),
      // e no formato da obra: páginas (MANGA) ou prosa (LIGHT_NOVEL).
      // Sem data, o capítulo entra no ar imediatamente; com data, fica agendado.
      const chapterNumber = draft?.chapterNumber ?? nextChapterNumber;
      if (isEditing) {
        await workApi.updateChapter(workId, chapterNumber, {
          title: chapterTitle.trim(),
          coverUrl: chapterCoverUrl,
          pages: isProse ? undefined : uploaded,
          content: isProse ? prose.trim() : undefined,
          format: isProse ? 'PROSE' : 'IMAGE_PAGES',
          publicReleaseAt: releaseDate ? toBackendLocalDateTime(new Date(releaseDate)) : toBackendLocalDateTime(new Date()),
        });
      } else {
        await workApi.createChapter(workId, {
          chapterNumber,
          title: chapterTitle.trim(),
          coverUrl: chapterCoverUrl,
          pages: isProse ? undefined : uploaded,
          content: isProse ? prose.trim() : undefined,
          format: isProse ? 'PROSE' : 'IMAGE_PAGES',
          publicReleaseAt: releaseDate ? toBackendLocalDateTime(new Date(releaseDate)) : toBackendLocalDateTime(new Date()),
        });
      }

      setSuccess(
        releaseDate
          ? `Capítulo agendado para ${new Date(releaseDate).toLocaleDateString('pt-BR')} em "${workTitle}".`
          : `Capítulo publicado em "${workTitle}".`
      );
      setPages([]);
      setProse('');
    } catch (err: any) {
      setError(err?.message || 'Não foi possível publicar o capítulo. Verifique os dados e tente novamente.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {isEditing ? (
        <p className="flex flex-wrap items-center gap-2 border-2 border-[var(--mn-teal)] bg-[var(--mn-teal)]/15 px-3 py-2 font-pixel text-[11px] uppercase text-[var(--mn-teal)]">
          <Pencil size={13} /> MODO EDIÇÃO · capítulo {draft?.chapterNumber} de “{workTitle}” — todas as etapas liberadas
        </p>
      ) : (
        <p className="font-pixel text-[11px] uppercase text-[var(--mn-mute)]">
          Publicando em <span className="text-[var(--mn-yellow)]">{workTitle}</span> · capítulo {nextChapterNumber} ·{' '}
          {isProse ? 'light novel (prosa)' : 'mangá (páginas)'}
        </p>
      )}

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

      {/* ETAPA 1 — Upload (páginas ou texto) */}
      {step === 1 && (
        <section className="border-2 border-[var(--mn-yellow)] bg-[var(--mn-ink-2)] p-5 space-y-4">
          <h3 className="font-display text-xl text-[var(--mn-paper)] uppercase">
            {isProse ? 'Escreva o capítulo' : 'Envie as páginas do capítulo'}
          </h3>
          {isProse ? (
            <div className="space-y-1.5">
              <label htmlFor="chapter-prose" className="font-body text-sm font-semibold text-[var(--mn-paper)] block">
                TEXTO DO CAPÍTULO
              </label>
              <textarea
                id="chapter-prose"
                value={prose}
                onChange={(event) => setProse(event.target.value)}
                rows={12}
                placeholder="Escreva aqui o capítulo da sua light novel. O servidor higieniza o texto (sem HTML) e limita o tamanho."
                className="w-full p-3 bg-[var(--mn-ink-2)] text-[var(--mn-paper)] font-body text-sm border-2 border-[var(--mn-line)] focus:border-[var(--mn-paper)] focus:shadow-[3px_3px_0_var(--mn-yellow)] outline-none"
              />
              <p className="font-pixel text-[11px] uppercase text-[var(--mn-mute)]">
                {prose.trim().length} caracteres
              </p>
            </div>
          ) : (
            <>
              <div
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragging(false);
                  addPages(event.dataTransfer.files, true);
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
                    if (event.target.files) addPages(event.target.files, true);
                    event.target.value = '';
                  }}
                />
              </div>
              {pages.length > 0 && (
                <p className="font-pixel text-[11px] uppercase text-[var(--mn-mute)]">
                  {pages.length} página(s) selecionada(s)
                </p>
              )}
            </>
          )}
        </section>
      )}

      {/* ETAPA 2 — Organizar páginas */}
      {step === 2 && (
        <section className="border-2 border-[var(--mn-line)] bg-[var(--mn-ink-2)] p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-display text-xl text-[var(--mn-paper)] uppercase">Organize as páginas</h3>
            <Button type="button" variant="ghost" onClick={() => pagesInputRef.current?.click()}>
              <Plus size={14} /> ADICIONAR MAIS IMAGENS
            </Button>
          </div>
          <input
            ref={pagesInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={(event) => {
              if (event.target.files) addPages(event.target.files, false);
              event.target.value = '';
            }}
          />

          {isProse ? (
            <p className="font-body text-xs text-[var(--mn-mute)]">
              Light novel é texto: não há páginas para organizar. Acompanhe o texto na etapa de revisão.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <label htmlFor="jump-page" className="font-pixel text-[11px] uppercase text-[var(--mn-mute)]">
                  IR PARA A PÁGINA
                </label>
                <input
                  id="jump-page"
                  type="number"
                  min={1}
                  max={pages.length}
                  value={jumpTo}
                  onChange={(event) => setJumpTo(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      jumpToPage();
                    }
                  }}
                  className="w-20 bg-[var(--mn-ink)] border-2 border-[var(--mn-line)] px-2 py-1 font-pixel text-[12px] text-[var(--mn-paper)] focus:border-[var(--mn-yellow)] outline-none"
                />
                <Button type="button" variant="ghost" onClick={jumpToPage}>
                  <CornerDownLeft size={13} /> IR
                </Button>
                <span className="font-pixel text-[11px] uppercase text-[var(--mn-mute)]">
                  de {pages.length} página(s)
                </span>
              </div>

              <p className="font-body text-xs text-[var(--mn-mute)]">
                Arraste uma página para cima de outra para reordenar, ou use as setas. A ordem das páginas é a
                ordem de leitura.
              </p>

              <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {pages.map((page, index) => (
                  <li
                    key={page.key}
                    ref={(element) => {
                      pageRefs.current[page.key] = element;
                    }}
                    draggable
                    onDragStart={() => setDragIndex(index)}
                    onDragOver={(event) => {
                      event.preventDefault();
                      setOverIndex(index);
                    }}
                    onDragEnd={() => {
                      setDragIndex(null);
                      setOverIndex(null);
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      if (dragIndex !== null) reorderByDrag(dragIndex, index);
                      setDragIndex(null);
                      setOverIndex(null);
                    }}
                    className={`border-2 bg-[var(--mn-ink)] p-2 space-y-2 cursor-grab active:cursor-grabbing ${
                      overIndex === index && dragIndex !== null && dragIndex !== index
                        ? 'border-[var(--mn-yellow)]'
                        : 'border-[var(--mn-line)]'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setPreview(page)}
                      className="block w-full focus-visible:outline"
                      title="Ampliar"
                    >
                      <img src={page.previewUrl} alt={`Página ${index + 1}`} className="w-full h-44 object-cover" />
                    </button>
                    <div className="flex items-center justify-between">
                      <span className="font-pixel text-[11px] uppercase text-[var(--mn-yellow)]">
                        Pág {index + 1}
                      </span>
                      <GripVertical size={14} className="text-[var(--mn-mute)]" aria-hidden="true" />
                    </div>
                    <div className="flex items-center justify-between gap-1">
                      <button
                        type="button"
                        onClick={() => movePage(index, -1)}
                        disabled={index === 0}
                        className="p-1.5 border border-[var(--mn-line)] text-[var(--mn-paper)] disabled:opacity-40 hover:border-[var(--mn-yellow)]"
                        title="Mover para cima"
                        aria-label={`Mover a página ${index + 1} para cima`}
                      >
                        <ChevronLeft size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => movePage(index, 1)}
                        disabled={index === pages.length - 1}
                        className="p-1.5 border border-[var(--mn-line)] text-[var(--mn-paper)] disabled:opacity-40 hover:border-[var(--mn-yellow)]"
                        title="Mover para baixo"
                        aria-label={`Mover a página ${index + 1} para baixo`}
                      >
                        <ChevronRight size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => removePage(page.key)}
                        className="p-1.5 border border-[var(--mn-line)] text-[var(--mn-red)] hover:border-[var(--mn-red)]"
                        title="Remover página"
                        aria-label={`Remover a página ${index + 1}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
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
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="ghost" onClick={() => coverInputRef.current?.click()}>
                {coverFile ? 'TROCAR ARQUIVO' : 'ESCOLHER CAPA DO CAPÍTULO'}
              </Button>
              {coverPreview && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setChapterCoverCropOpen(true)}
                  title="Reenquadra a capa atual arrastando, sem subir um arquivo novo"
                >
                  <Crop size={14} /> AJUSTAR CAPA
                </Button>
              )}
            </div>
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
              <dd className="text-[var(--mn-paper)]">{isProse ? 'Light novel (prosa)' : 'Mangá (páginas)'}</dd>
            </div>
            <div className="flex justify-between border-b border-[var(--mn-line)] py-1">
              <dt className="text-[var(--mn-mute)]">Conteúdo</dt>
              <dd className="text-[var(--mn-paper)]">
                {isProse ? `${prose.trim().length} caracteres` : `${pages.length} página(s)`}
              </dd>
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
      )}

      {/* ETAPA 5 — Publicar */}
      {step === 5 && (
        <section className="border-2 border-[var(--mn-yellow)] bg-[var(--mn-ink-2)] p-5 space-y-4">
          <h3 className="font-display text-xl text-[var(--mn-paper)] uppercase">Publicar capítulo</h3>
          <p className="font-body text-xs text-[var(--mn-mute)]">
            O capítulo entra na obra <strong className="text-[var(--mn-paper)]">{workTitle}</strong> e fica
            disponível no catálogo
            {releaseDate ? ' na data escolhida.' : ' imediatamente.'}
          </p>
          <Button onClick={publish} disabled={busy} variant="primary" className="!px-6">
            {busy ? 'PUBLICANDO...' : releaseDate ? 'AGENDAR CAPÍTULO' : 'PUBLICAR CAPÍTULO'}
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

      {/* Recorte da capa do capitulo (arrastar + zoom) */}
      {chapterCoverCropOpen && coverPreview && (
        <ImageCropper
          sourceUrl={coverPreview}
          outputWidth={900}
          outputHeight={1200}
          confirmLabel="USAR ESTA CAPA"
          busy={busy}
          error={error}
          onCancel={() => setChapterCoverCropOpen(false)}
          onConfirm={async (blob) => {
            const file = new File([blob], 'chapter-cover.jpg', { type: 'image/jpeg' });
            const stored = await storageApi.uploadFile(file);
            setCoverFile(null);
            setCoverUrl(stored.url);
            setCoverPreview(stored.url);
            setChapterCoverCropOpen(false);
          }}
        />
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

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Eye,
  Image as ImageIcon,
  ImagePlus,
  Loader2,
  Minus,
  Plus,
  Save,
  Trash2,
  Upload,
} from 'lucide-react';
import { workApi } from '../../api/workApi';
import { storageApi } from '../../api/storageApi';
import { Button } from '../ui/Button';
import { Field } from '../ui/Field';
import { ImageCropper } from '../common/ImageCropper';
import { toBackendLocalDateTime } from '../../utils/datetime';
import {
  ChapterBlocksDto,
  ChapterType,
  PROSE_EDITORIAL_POLICY,
  ProseBlock,
  countVisibleProseCharacters,
  validateChapterBlocks,
} from '../../utils/proseEditorialPolicy';

/**
 * Publicação de capítulo de LIGHT NOVEL — fluxo próprio, separado do mangá.
 *
 * <p>O capítulo é um **documento de blocos ordenados** (texto, ilustração intercalada e
 * separador de cena). O autor escreve e insere a ilustração no ponto exato em que ela deve
 * aparecer na leitura; não existe "galeria" separada do texto.</p>
 *
 * <p>Etapas: 1. Detalhes · 2. Escrever · 3. Revisar · 4. Publicar.</p>
 *
 * <p>A validação autoritativa é do backend; aqui só espelhamos as regras para dar feedback
 * imediato (contador, faixa recomendada, limite de 6 ilustrações).</p>
 */

const STEPS = [
  { id: 1, label: 'Detalhes' },
  { id: 2, label: 'Escrever' },
  { id: 3, label: 'Revisar' },
  { id: 4, label: 'Publicar' },
] as const;

const CHAPTER_TYPE_LABEL: Record<ChapterType, string> = {
  REGULAR: 'Capítulo regular',
  PROLOGUE: 'Prólogo (capítulo 0)',
  SPECIAL: 'Conteúdo especial',
};

export interface ChapterDraft {
  /** Número do capítulo (edição). */
  chapterNumber?: number;
  title?: string;
  /** Páginas já publicadas (URLs do storage) — usado pelo fluxo de mangá. */
  pages?: string[];
  coverUrl?: string | null;
  releaseDate?: string | null;
  /** Texto plano legado (capítulos em prosa anteriores aos blocos). */
  content?: string | null;
  /** Blocos versionados (fonte da verdade do capítulo de light novel). */
  blocksJson?: string | null;
  chapterType?: ChapterType | null;
}

/* ------------------------------------------------------------------ */
/* Blocos no editor (estado local, com chave estável para animação)    */
/* ------------------------------------------------------------------ */

let blockSeq = 0;
function nextKey() {
  blockSeq += 1;
  return `lnb-${Date.now().toString(36)}-${blockSeq}`;
}

interface TextEditorBlock {
  key: string;
  type: 'text';
  text: string;
}

interface IllustrationEditorBlock {
  key: string;
  type: 'illustration';
  /** Nome do arquivo no storage (`<uuid>.jpg|png|webp`) — vira `fileId` no contrato. */
  fileId: string;
  altText: string;
  width: number;
  previewUrl?: string;
  fileName?: string;
  uploading?: boolean;
}

interface SeparatorEditorBlock {
  key: string;
  type: 'separator';
  style: 'scene' | 'time' | 'pov' | 'line';
}

type EditorBlock = TextEditorBlock | IllustrationEditorBlock | SeparatorEditorBlock;

function newTextBlock(): TextEditorBlock {
  return { key: nextKey(), type: 'text', text: '' };
}

function newIllustrationBlock(): IllustrationEditorBlock {
  return { key: nextKey(), type: 'illustration', fileId: '', altText: '', width: 100 };
}

function newSeparatorBlock(): SeparatorEditorBlock {
  return { key: nextKey(), type: 'separator', style: 'scene' };
}

/** Imagem do storage: aceita nome puro (`abc.png`) ou URL já montada. */
function illustrationSrc(fileId: string): string {
  if (!fileId) return '';
  if (fileId.startsWith('http') || fileId.startsWith('/')) return fileId;
  return `/api/storage/${fileId}`;
}

function toProseBlock(block: EditorBlock): ProseBlock {
  if (block.type === 'text') {
    return { type: 'text', content: { text: block.text } };
  }
  if (block.type === 'illustration') {
    return {
      type: 'illustration',
      content: {
        fileId: block.fileId,
        altText: block.altText.trim() || undefined,
        width: block.width,
      },
    };
  }
  return { type: 'separator', content: { style: block.style } };
}

function fromProseBlock(block: ProseBlock): EditorBlock {
  if (block.type === 'text') {
    return { key: nextKey(), type: 'text', text: block.content?.text ?? '' };
  }
  if (block.type === 'illustration') {
    const fileId = block.content?.fileId ?? '';
    return {
      key: nextKey(),
      type: 'illustration',
      fileId,
      altText: block.content?.altText ?? '',
      width: block.content?.width ?? 100,
      previewUrl: illustrationSrc(fileId),
    };
  }
  const style = (block.content?.style ?? 'scene') as SeparatorEditorBlock['style'];
  return { key: nextKey(), type: 'separator', style };
}

function initialBlocks(draft?: ChapterDraft | null): EditorBlock[] {
  if (draft?.blocksJson) {
    try {
      const parsed = JSON.parse(draft.blocksJson) as ChapterBlocksDto;
      if (Array.isArray(parsed?.blocks) && parsed.blocks.length > 0) {
        return parsed.blocks.map(fromProseBlock);
      }
    } catch {
      // JSON corrompido cai no fallback abaixo (texto legado)
    }
  }
  if (draft?.content && draft.content.trim()) {
    return draft.content
      .split(/\n{2,}/)
      .filter((paragraph) => paragraph.trim().length > 0)
      .map((paragraph) => ({ key: nextKey(), type: 'text' as const, text: paragraph }));
  }
  return [newTextBlock()];
}

const SEPARATOR_LABEL: Record<SeparatorEditorBlock['style'], { label: string; glyph: string }> = {
  scene: { label: 'Quebra de cena', glyph: '— — —' },
  time: { label: 'Passagem de tempo', glyph: '~ ~ ~' },
  pov: { label: 'Mudança de POV', glyph: '• • •' },
  line: { label: 'Linha simples', glyph: '—' },
};

/* ------------------------------------------------------------------ */

export function LightNovelChapterWizard({
  workId,
  workTitle,
  nextChapterNumber,
  draft,
  existingChapterNumbers = [],
  onPublished,
}: {
  workId: string;
  workTitle: string;
  nextChapterNumber: number;
  draft?: ChapterDraft | null;
  /** Números já usados na obra (para impedir um segundo capítulo 0). */
  existingChapterNumbers?: number[];
  /** Chamado depois de publicar/editar, para o painel recarregar a lista. */
  onPublished?: () => void;
}) {
  const isEditing = draft?.chapterNumber !== undefined && draft?.chapterNumber !== null;
  const editingNumber = draft?.chapterNumber;

  const [step, setStep] = useState(1);
  const [chapterType, setChapterType] = useState<ChapterType>(draft?.chapterType ?? 'REGULAR');
  const [chapterTitle, setChapterTitle] = useState(
    draft?.title ?? (nextChapterNumber === 1 ? 'Capítulo 1' : `Capítulo ${nextChapterNumber}`)
  );
  const [blocks, setBlocks] = useState<EditorBlock[]>(() => initialBlocks(draft));
  const [releaseDate, setReleaseDate] = useState(
    draft?.releaseDate
      ? draft.releaseDate.slice(0, 16)
      : toBackendLocalDateTime(new Date()).slice(0, 16)
  );

  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(draft?.coverUrl ?? null);
  const [coverPreview, setCoverPreview] = useState<string | null>(draft?.coverUrl ?? null);
  const [coverCropOpen, setCoverCropOpen] = useState(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [recoverable, setRecoverable] = useState<{
    title: string;
    chapterType: ChapterType;
    blocks: EditorBlock[];
    savedAt: string;
  } | null>(null);

  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [fileDropActive, setFileDropActive] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const blockInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  const draftKey = `mn:ln-draft:${workId}:${draft?.chapterNumber ?? 'novo'}`;
  const prologueTaken = existingChapterNumbers.includes(0) && editingNumber !== 0;

  /** Data de lançamento efetiva: campo vazio publica agora. */
  const scheduledDate = () => (releaseDate ? new Date(releaseDate) : new Date());
  const isScheduled = Boolean(releaseDate) && scheduledDate().getTime() > Date.now();

  /* -------------------------- validação -------------------------- */

  const blocksDto: ChapterBlocksDto = useMemo(
    () => ({ version: 1, blocks: blocks.map(toProseBlock) }),
    [blocks]
  );

  const totalChars = useMemo(
    () =>
      blocks.reduce(
        (sum, block) => (block.type === 'text' ? sum + countVisibleProseCharacters(block.text) : sum),
        0
      ),
    [blocks]
  );

  const illustrationCount = blocks.filter((block) => block.type === 'illustration').length;
  const textBlockCount = blocks.filter((block) => block.type === 'text').length;
  const uploading = blocks.some((block) => block.type === 'illustration' && block.uploading);

  const structureErrors = useMemo(() => {
    const messages: string[] = [];
    blocks.forEach((block, index) => {
      if (block.type === 'illustration') {
        if (!block.fileId && !block.uploading) {
          messages.push(`Ilustração #${index + 1}: envie o arquivo antes de publicar.`);
        }
      }
    });
    if (illustrationCount > 6) {
      messages.push(`O capítulo tem ${illustrationCount} ilustrações; o limite é 6.`);
    }
    if (uploading) {
      messages.push('Aguarde o envio das ilustrações terminar.');
    }
    return messages;
  }, [blocks, illustrationCount, uploading]);

  const editorial = useMemo(
    () => validateChapterBlocks(blocksDto, chapterType),
    [blocksDto, chapterType]
  );

  const titleError =
    chapterTitle.trim().length === 0
      ? 'Informe o título do capítulo.'
      : chapterTitle.trim().length > 120
        ? 'Use no máximo 120 caracteres no título.'
        : null;

  const typeError =
    chapterType === 'PROLOGUE' && prologueTaken
      ? 'Esta obra já possui um capítulo 0. Edite o prólogo existente.'
      : null;

  const allErrors = [
    ...structureErrors,
    ...editorial.errors,
    ...(titleError ? [titleError] : []),
    ...(typeError ? [typeError] : []),
  ];

  const stepOneReady = !titleError && !typeError;
  const stepTwoReady =
    !uploading &&
    blockHasContent(blocks) &&
    !blocks.some((block) => block.type === 'illustration' && !block.fileId);
  const canPublish = allErrors.length === 0 && stepOneReady && stepTwoReady;

  const minChars =
    chapterType === 'REGULAR' ? PROSE_EDITORIAL_POLICY.minimum : PROSE_EDITORIAL_POLICY.specialMinimum;

  const counterTone =
    totalChars === 0
      ? 'text-[var(--mn-mute)]'
      : totalChars > PROSE_EDITORIAL_POLICY.maximum
        ? 'text-[var(--mn-red)]'
        : totalChars > PROSE_EDITORIAL_POLICY.recommendedMaximum ||
            (chapterType === 'REGULAR' && totalChars < PROSE_EDITORIAL_POLICY.shortWarningBelow)
          ? 'text-[var(--mn-yellow)]'
          : totalChars >= (chapterType === 'REGULAR' ? PROSE_EDITORIAL_POLICY.recommendedMinimum : minChars)
            ? 'text-[var(--mn-teal)]'
            : 'text-[var(--mn-paper)]';

  const bandPercent = Math.min(100, (totalChars / PROSE_EDITORIAL_POLICY.maximum) * 100);
  const recommendedMinPercent = (PROSE_EDITORIAL_POLICY.recommendedMinimum / PROSE_EDITORIAL_POLICY.maximum) * 100;
  const recommendedMaxPercent = (PROSE_EDITORIAL_POLICY.recommendedMaximum / PROSE_EDITORIAL_POLICY.maximum) * 100;

  const maxStep = useMemo(() => {
    if (!stepOneReady) return 1;
    if (!stepTwoReady) return 2;
    return 4;
  }, [stepOneReady, stepTwoReady]);

  /* -------------------------- autosave -------------------------- */

  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        title?: string;
        chapterType?: ChapterType;
        blocks?: EditorBlock[];
        savedAt?: string;
      };
      if (!parsed?.blocks || parsed.blocks.length === 0) return;
      const sameAsCurrent = JSON.stringify(parsed.blocks) === JSON.stringify(blocks);
      if (sameAsCurrent && parsed.title === chapterTitle) return;
      setRecoverable({
        title: parsed.title ?? chapterTitle,
        chapterType: parsed.chapterType ?? chapterType,
        blocks: parsed.blocks,
        savedAt: parsed.savedAt ?? '',
      });
    } catch {
      // rascunho local inválido é ignorado
    }
    // Só na montagem: recuperar o rascunho da sessão anterior deste capítulo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey]);

  const firstAutosave = useRef(true);
  useEffect(() => {
    if (firstAutosave.current) {
      firstAutosave.current = false;
      return;
    }
    setDirty(true);
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem(
          draftKey,
          JSON.stringify({ title: chapterTitle, chapterType, blocks, savedAt: new Date().toISOString() })
        );
        setSavedAt(new Date());
      } catch {
        // storage cheio/indisponível não pode quebrar a escrita
      }
    }, 900);
    return () => window.clearTimeout(timer);
  }, [draftKey, chapterTitle, chapterType, blocks, releaseDate]);

  useEffect(() => {
    if (!dirty || success) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty, success]);

  // Auto-altura dos textareas (o autor vê o texto inteiro, sem scroll interno).
  useEffect(() => {
    for (const block of blocks) {
      if (block.type !== 'text') continue;
      const el = textareaRefs.current[block.key];
      if (!el) continue;
      el.style.height = 'auto';
      el.style.height = `${Math.max(el.scrollHeight, 96)}px`;
    }
  }, [blocks, step]);

  /* -------------------------- ações de bloco -------------------------- */

  const updateText = useCallback((key: string, text: string) => {
    setBlocks((prev) => prev.map((block) => (block.key === key && block.type === 'text' ? { ...block, text } : block)));
  }, []);

  const updateIllustration = useCallback((key: string, patch: Partial<IllustrationEditorBlock>) => {
    setBlocks((prev) =>
      prev.map((block) => (block.key === key && block.type === 'illustration' ? { ...block, ...patch } : block))
    );
  }, []);

  const updateSeparator = useCallback((key: string, style: SeparatorEditorBlock['style']) => {
    setBlocks((prev) =>
      prev.map((block) => (block.key === key && block.type === 'separator' ? { ...block, style } : block))
    );
  }, []);

  const insertAt = useCallback((index: number, block: EditorBlock) => {
    setBlocks((prev) => {
      const next = [...prev];
      next.splice(index, 0, block);
      return next;
    });
  }, []);

  const appendBlock = useCallback((block: EditorBlock) => {
    setBlocks((prev) => [...prev, block]);
  }, []);

  const moveBlock = useCallback((index: number, direction: -1 | 1) => {
    setBlocks((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }, []);

  const removeBlock = useCallback((key: string) => {
    setBlocks((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((block) => block.key !== key);
    });
  }, []);

  const duplicateBlock = useCallback((key: string) => {
    setBlocks((prev) => {
      const index = prev.findIndex((block) => block.key === key);
      if (index < 0) return prev;
      const source = prev[index];
      const copy: EditorBlock =
        source.type === 'text'
          ? { ...source, key: nextKey() }
          : source.type === 'illustration'
            ? { ...source, key: nextKey() }
            : { ...source, key: nextKey() };
      const next = [...prev];
      next.splice(index + 1, 0, copy);
      return next;
    });
  }, []);

  const uploadIllustration = useCallback(
    async (key: string, file: File) => {
      if (!file.type.startsWith('image/')) {
        setError('Envie uma imagem JPG, PNG ou WebP.');
        return;
      }
      if (file.size > 8 * 1024 * 1024) {
        setError('A ilustração excede 8 MB. Otimize a imagem antes de enviar.');
        return;
      }
      setError(null);
      updateIllustration(key, { uploading: true, fileName: file.name });
      try {
        const stored = await storageApi.uploadFile(file);
        updateIllustration(key, {
          uploading: false,
          fileId: stored.filename,
          previewUrl: stored.url,
        });
      } catch (err: any) {
        updateIllustration(key, { uploading: false, fileName: undefined });
        setError(err?.message || 'Não foi possível enviar a ilustração.');
      }
    },
    [updateIllustration]
  );

  const handleDragStart = (index: number) => setDragIndex(index);
  const handleDrop = (index: number) => {
    if (dragIndex === null || dragIndex === index) {
      setDragIndex(null);
      setOverIndex(null);
      return;
    }
    setBlocks((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(index, 0, moved);
      return next;
    });
    setDragIndex(null);
    setOverIndex(null);
  };

  /* -------------------------- navegação -------------------------- */

  const goTo = (target: number) => {
    setStep(Math.min(Math.max(1, target), Math.min(4, maxStep)));
    setError(null);
  };

  /* -------------------------- publicação -------------------------- */

  const publish = async () => {
    if (!canPublish) {
      setError('Corrija os itens destacados antes de publicar.');
      return;
    }
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      let finalCover = coverUrl;
      if (!finalCover && coverFile) {
        const stored = await storageApi.uploadFile(coverFile);
        finalCover = stored.url;
      }

      const payload = {
        title: chapterTitle.trim(),
        coverUrl: finalCover ?? undefined,
        blocksJson: JSON.stringify(blocksDto),
        chapterType,
        format: 'PROSE' as const,
        publicReleaseAt: toBackendLocalDateTime(scheduledDate()),
      };

      if (isEditing && editingNumber !== undefined) {
        await workApi.updateChapter(workId, editingNumber, payload);
        setSuccess(`Alterações publicadas no capítulo #${editingNumber} de “${workTitle}”.`);
      } else {
        const chapterNumber = chapterType === 'PROLOGUE' ? 0 : nextChapterNumber;
        await workApi.createChapter(workId, { ...payload, chapterNumber });
        setSuccess(`Capítulo publicado em “${workTitle}”.`);
        setBlocks([newTextBlock()]);
        setChapterType('REGULAR');
        setChapterTitle(`Capítulo ${nextChapterNumber + 1}`);
      }

      try {
        localStorage.removeItem(draftKey);
      } catch {
        // sem storage, sem problema
      }
      setDirty(false);
      setSavedAt(null);
      onPublished?.();
    } catch (err: any) {
      setError(err?.message || 'Não foi possível publicar o capítulo. Verifique os dados e tente novamente.');
    } finally {
      setBusy(false);
    }
  };

  /* -------------------------- preview -------------------------- */

  const previewBlocks = blocksDto.blocks.filter(
    (block) => block.type !== 'illustration' || Boolean(block.content.fileId)
  );

  /* -------------------------- render -------------------------- */

  return (
    <div className="space-y-6">
      {recoverable && (
        <div className="flex flex-wrap items-center gap-3 border-2 border-[var(--mn-teal)] bg-[var(--mn-ink-2)] p-3">
          <Save size={15} className="text-[var(--mn-teal)]" />
          <p className="font-body text-sm text-[var(--mn-paper)]">
            Rascunho salvo neste navegador
            {recoverable.savedAt && ` em ${new Date(recoverable.savedAt).toLocaleString('pt-BR')}`}.
          </p>
          <div className="ml-auto flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setBlocks(recoverable.blocks);
                setChapterTitle(recoverable.title);
                setChapterType(recoverable.chapterType);
                setRecoverable(null);
              }}
            >
              RESTAURAR
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                try {
                  localStorage.removeItem(draftKey);
                } catch {
                  // ignora
                }
                setRecoverable(null);
              }}
            >
              DESCARTAR
            </Button>
          </div>
        </div>
      )}

      {isEditing ? (
        <p className="flex flex-wrap items-center gap-2 border-2 border-[var(--mn-teal)] bg-[var(--mn-teal)]/15 px-3 py-2 font-pixel text-[11px] uppercase text-[var(--mn-teal)]">
          <BookOpen size={13} /> MODO EDIÇÃO · capítulo {editingNumber} de “{workTitle}”
        </p>
      ) : (
        <p className="font-pixel text-[11px] uppercase text-[var(--mn-mute)]">
          Light novel em <span className="text-[var(--mn-yellow)]">{workTitle}</span> · próximo capítulo{' '}
          {nextChapterNumber} · texto e ilustrações no mesmo documento
        </p>
      )}

      {/* Checklist de etapas */}
      <nav aria-label="Etapas de publicação do capítulo" className="border-2 border-[var(--mn-line)] bg-[var(--mn-ink-2)] p-3">
        <ol className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {STEPS.map((item) => {
            const active = step === item.id;
            const locked = item.id > maxStep;
            const done = item.id < step;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => goTo(item.id)}
                  disabled={locked}
                  aria-current={active ? 'step' : undefined}
                  className={`w-full flex items-center gap-2 px-3 py-2 border-2 font-pixel text-[11px] uppercase transition-colors text-left ${
                    active
                      ? 'border-[var(--mn-yellow)] bg-[var(--mn-yellow)] text-[var(--mn-ink)]'
                      : done
                        ? 'border-[var(--mn-teal)] text-[var(--mn-teal)]'
                        : locked
                          ? 'border-[var(--mn-line)] text-[var(--mn-mute)] opacity-60 cursor-not-allowed'
                          : 'border-[var(--mn-line)] text-[var(--mn-paper)] hover:border-[var(--mn-yellow)]'
                  }`}
                >
                  {done ? <Check size={12} /> : <span>{item.id}.</span>}
                  {item.label}
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      {error && (
        <p role="alert" className="border-2 border-[var(--mn-red)] bg-[var(--mn-ink-2)] p-3 font-body text-sm text-[var(--mn-paper)]">
          {error}
        </p>
      )}
      {success && (
        <p className="flex items-center gap-2 border-2 border-[var(--mn-teal)] bg-[var(--mn-teal)]/15 p-3 font-body text-sm text-[var(--mn-teal)]">
          <Check size={15} /> {success}
        </p>
      )}

      {/* ETAPA 1 · DETALHES */}
      {step === 1 && (
        <section className="border-2 border-[var(--mn-yellow)] bg-[var(--mn-ink-2)] p-5 space-y-5">
          <div>
            <h3 className="font-display text-xl text-[var(--mn-paper)] uppercase">Detalhes do capítulo</h3>
            <p className="font-body text-xs text-[var(--mn-mute)] mt-1">
              O tipo define os limites editoriais. O capítulo 0 é opcional e único por obra.
            </p>
          </div>

          <div className="space-y-2">
            <label className="font-body text-sm font-semibold text-[var(--mn-paper)] block">TIPO DE CAPÍTULO</label>
            <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Tipo de capítulo">
              {(Object.keys(CHAPTER_TYPE_LABEL) as ChapterType[]).map((type) => {
                const disabled = isEditing
                  ? type !== chapterType
                  : type === 'PROLOGUE' && prologueTaken;
                return (
                  <button
                    key={type}
                    type="button"
                    role="radio"
                    aria-checked={chapterType === type}
                    disabled={disabled}
                    onClick={() => {
                      setChapterType(type);
                      setError(null);
                    }}
                    className={`text-left px-3 py-3 border-2 transition-colors ${
                      chapterType === type
                        ? 'border-[var(--mn-yellow)] bg-[var(--mn-yellow)]/10'
                        : 'border-[var(--mn-line)] hover:border-[var(--mn-yellow)]'
                    } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    <span className="font-pixel text-[11px] uppercase text-[var(--mn-paper)] block">
                      {CHAPTER_TYPE_LABEL[type]}
                    </span>
                    <span className="font-body text-xs text-[var(--mn-mute)] block mt-1">
                      {type === 'REGULAR' && '1.000 a 30.000 caracteres'}
                      {type === 'PROLOGUE' && 'Mínimo 300 · apenas capítulo 0'}
                      {type === 'SPECIAL' && 'Extra, interlúdio ou posfácio · mínimo 300'}
                    </span>
                  </button>
                );
              })}
            </div>
            {isEditing && (
              <p className="font-body text-xs text-[var(--mn-mute)]">
                O tipo não muda na edição — para trocar, exclua e recrie o capítulo.
              </p>
            )}
            {typeError && (
              <p className="font-body text-xs text-[var(--mn-red)] flex items-center gap-1">
                <AlertTriangle size={13} /> {typeError}
              </p>
            )}
          </div>

          <Field
            label="TÍTULO DO CAPÍTULO"
            value={chapterTitle}
            maxLength={120}
            onChange={(event) => setChapterTitle(event.target.value)}
            error={titleError ?? undefined}
            helperText={`${chapterTitle.trim().length}/120 caracteres`}
            placeholder={chapterType === 'PROLOGUE' ? 'Prólogo — o começo de tudo' : 'O encontro na estação'}
          />
        </section>
      )}

      {/* ETAPA 2 · ESCREVER */}
      {step === 2 && (
        <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px] items-start pb-16 lg:pb-0">
          <div className="border-2 border-[var(--mn-yellow)] bg-[var(--mn-ink-2)]">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-2 border-b-2 border-[var(--mn-line)] p-3">
              <button
                type="button"
                onClick={() => appendBlock(newTextBlock())}
                className="flex items-center gap-1.5 px-3 py-1.5 border-2 border-[var(--mn-teal)] bg-[var(--mn-teal)]/10 font-pixel text-[11px] uppercase text-[var(--mn-teal)] hover:bg-[var(--mn-teal)]/20"
              >
                <Plus size={13} /> Texto
              </button>
              <button
                type="button"
                onClick={() => appendBlock(newIllustrationBlock())}
                disabled={illustrationCount >= 6}
                title={illustrationCount >= 6 ? 'Limite de 6 ilustrações por capítulo' : 'Inserir ilustração'}
                className="flex items-center gap-1.5 px-3 py-1.5 border-2 border-[var(--mn-yellow)] bg-[var(--mn-yellow)]/10 font-pixel text-[11px] uppercase text-[var(--mn-yellow)] hover:bg-[var(--mn-yellow)]/20 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ImagePlus size={13} /> Ilustração
              </button>
              <button
                type="button"
                onClick={() => appendBlock(newSeparatorBlock())}
                className="flex items-center gap-1.5 px-3 py-1.5 border-2 border-[var(--mn-line)] bg-[var(--mn-ink)] font-pixel text-[11px] uppercase text-[var(--mn-paper)] hover:border-[var(--mn-mute)]"
              >
                <Minus size={13} /> Separador
              </button>

              <span className="flex-1" />

              <button
                type="button"
                onClick={() => setShowPreview((open) => !open)}
                className="flex items-center gap-1.5 px-3 py-1.5 border-2 border-[var(--mn-line)] bg-[var(--mn-ink)] font-pixel text-[11px] uppercase text-[var(--mn-paper)] hover:border-[var(--mn-teal)]"
                aria-pressed={showPreview}
              >
                <Eye size={13} /> {showPreview ? 'Ocultar prévia' : 'Prévia'}
              </button>
            </div>

            {/* Blocos */}
            <div
              className={`p-3 sm:p-4 space-y-3 transition-colors ${
                fileDropActive ? 'bg-[var(--mn-yellow)]/10 outline outline-2 outline-dashed outline-[var(--mn-yellow)]' : ''
              }`}
              onDragOver={(event) => {
                if (!event.dataTransfer.types.includes('Files')) return;
                event.preventDefault();
                setFileDropActive(true);
              }}
              onDragLeave={(event) => {
                if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
                setFileDropActive(false);
              }}
              onDrop={(event) => {
                const file = event.dataTransfer.files?.[0];
                if (!file || !file.type.startsWith('image/')) return;
                event.preventDefault();
                setFileDropActive(false);
                if (illustrationCount >= 6) {
                  setError('Limite de 6 ilustrações por capítulo. Remova uma para inserir outra.');
                  return;
                }
                const block = newIllustrationBlock();
                appendBlock(block);
                void uploadIllustration(block.key, file);
              }}
            >
              {fileDropActive && (
                <p className="border-2 border-dashed border-[var(--mn-yellow)] px-3 py-2 font-pixel text-[10px] uppercase text-[var(--mn-yellow)]">
                  Solte a imagem para inseri-la no fim do capítulo
                </p>
              )}
              {blocks.map((block, index) => (
                <div key={block.key}>
                  <div
                    draggable
                    onDragStart={() => handleDragStart(index)}
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
                      handleDrop(index);
                    }}
                    className={`border-2 transition-colors ${
                      overIndex === index && dragIndex !== null && dragIndex !== index
                        ? 'border-[var(--mn-yellow)] bg-[var(--mn-yellow)]/5'
                        : 'border-[var(--mn-line)] bg-[var(--mn-ink)]'
                    }`}
                  >
                    <div className="flex items-center gap-2 border-b border-[var(--mn-line)] px-2 py-1.5">
                      <span className="cursor-grab active:cursor-grabbing text-[var(--mn-mute)]" aria-hidden="true">
                        <Grip />
                      </span>
                      <span className="font-pixel text-[10px] uppercase text-[var(--mn-mute)]">
                        {block.type === 'text' && `§ Texto ${index + 1}`}
                        {block.type === 'illustration' && `▣ Ilustração ${index + 1}`}
                        {block.type === 'separator' && `— Separador ${index + 1}`}
                      </span>
                      <span className="flex-1" />
                      <button
                        type="button"
                        onClick={() => moveBlock(index, -1)}
                        disabled={index === 0}
                        aria-label={`Mover bloco ${index + 1} para cima`}
                        title="Mover para cima"
                        className="p-1 text-[var(--mn-mute)] hover:text-[var(--mn-yellow)] disabled:opacity-30"
                      >
                        <ArrowUp size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveBlock(index, 1)}
                        disabled={index === blocks.length - 1}
                        aria-label={`Mover bloco ${index + 1} para baixo`}
                        title="Mover para baixo"
                        className="p-1 text-[var(--mn-mute)] hover:text-[var(--mn-yellow)] disabled:opacity-30"
                      >
                        <ArrowDown size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => duplicateBlock(block.key)}
                        aria-label={`Duplicar bloco ${index + 1}`}
                        title="Duplicar bloco"
                        className="p-1 text-[var(--mn-mute)] hover:text-[var(--mn-teal)]"
                      >
                        <Copy size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeBlock(block.key)}
                        disabled={blocks.length <= 1}
                        aria-label={`Remover bloco ${index + 1}`}
                        title="Remover bloco"
                        className="p-1 text-[var(--mn-red)]/70 hover:text-[var(--mn-red)] disabled:opacity-30"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    <div className="p-3">
                      {block.type === 'text' && (
                        <div className="space-y-1">
                          <textarea
                            ref={(el) => {
                              textareaRefs.current[block.key] = el;
                            }}
                            value={block.text}
                            onChange={(event) => updateText(block.key, event.target.value)}
                            rows={3}
                            placeholder="Escreva o parágrafo. Uma linha em branco separa parágrafos na leitura."
                            className="w-full bg-transparent text-[var(--mn-paper)] font-body text-base leading-[1.8] outline-none resize-none overflow-hidden placeholder:text-[var(--mn-mute)]/60"
                          />
                          <p className="font-body text-[11px] text-[var(--mn-mute)] tabular-nums">
                            {countVisibleProseCharacters(block.text).toLocaleString('pt-BR')} caracteres visíveis
                          </p>
                        </div>
                      )}

                      {block.type === 'illustration' && (
                        <div className="grid gap-3 sm:grid-cols-[160px_minmax(0,1fr)]">
                          <div className="border border-dashed border-[var(--mn-line)] bg-[var(--mn-ink-2)] flex items-center justify-center min-h-[110px] overflow-hidden">
                            {block.uploading ? (
                              <span className="flex items-center gap-2 font-pixel text-[10px] uppercase text-[var(--mn-mute)]">
                                <Loader2 size={14} className="animate-spin" /> enviando
                              </span>
                            ) : block.previewUrl ? (
                              <img src={block.previewUrl} alt="" className="max-h-[150px] w-auto" />
                            ) : (
                              <span className="text-[var(--mn-mute)] flex flex-col items-center gap-1 p-2 text-center">
                                <ImageIcon size={20} />
                                <span className="font-pixel text-[10px] uppercase">sem arquivo</span>
                              </span>
                            )}
                          </div>

                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <input
                                ref={(el) => {
                                  blockInputRefs.current[block.key] = el;
                                }}
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                className="hidden"
                                onChange={(event) => {
                                  const file = event.target.files?.[0];
                                  event.target.value = '';
                                  if (file) void uploadIllustration(block.key, file);
                                }}
                              />
                              <Button
                                type="button"
                                variant="secondary"
                                className="!min-h-[32px] !px-3 !text-[11px]"
                                disabled={block.uploading}
                                onClick={() => blockInputRefs.current[block.key]?.click()}
                              >
                                <Upload size={12} /> {block.fileId ? 'Trocar imagem' : 'Enviar imagem'}
                              </Button>
                              {block.previewUrl && (
                                <button
                                  type="button"
                                  onClick={() => updateIllustration(block.key, { fileId: '', previewUrl: undefined })}
                                  className="font-pixel text-[10px] uppercase text-[var(--mn-red)] hover:underline"
                                >
                                  remover arquivo
                                </button>
                              )}
                            </div>

                            <label className="block">
                              <span className="font-body text-[11px] text-[var(--mn-mute)]">
                                Texto alternativo (obrigatório para imagens com informação)
                              </span>
                              <input
                                value={block.altText}
                                onChange={(event) => updateIllustration(block.key, { altText: event.target.value })}
                                maxLength={200}
                                placeholder="Descreva a cena para quem não vê a imagem"
                                className="mt-1 w-full px-2 py-1.5 bg-[var(--mn-ink-2)] border border-[var(--mn-line)] font-body text-sm text-[var(--mn-paper)] outline-none focus:border-[var(--mn-paper)]"
                              />
                            </label>

                            <label className="block sm:max-w-[220px]">
                              <span className="font-body text-[11px] text-[var(--mn-mute)]">Largura na leitura</span>
                              <input
                                type="range"
                                min={30}
                                max={100}
                                step={10}
                                value={block.width}
                                onChange={(event) => updateIllustration(block.key, { width: Number(event.target.value) })}
                                className="w-full accent-[var(--mn-yellow)]"
                              />
                              <span className="font-body text-[11px] text-[var(--mn-mute)] tabular-nums">{block.width}%</span>
                            </label>
                          </div>
                        </div>
                      )}

                      {block.type === 'separator' && (
                        <div className="flex flex-wrap items-center gap-3">
                          <select
                            value={block.style}
                            onChange={(event) =>
                              updateSeparator(block.key, event.target.value as SeparatorEditorBlock['style'])
                            }
                            className="px-2 py-1.5 bg-[var(--mn-ink-2)] border-2 border-[var(--mn-line)] font-body text-sm text-[var(--mn-paper)] outline-none focus:border-[var(--mn-paper)]"
                          >
                            {(Object.keys(SEPARATOR_LABEL) as SeparatorEditorBlock['style'][]).map((style) => (
                              <option key={style} value={style}>
                                {SEPARATOR_LABEL[style].label}
                              </option>
                            ))}
                          </select>
                          <span className="font-display text-[var(--mn-mute)]">{SEPARATOR_LABEL[block.style].glyph}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Inserir bloco logo abaixo deste */}
                  <div className="flex items-center justify-center py-1 opacity-40 hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => insertAt(index + 1, newTextBlock())}
                      className="font-pixel text-[10px] uppercase text-[var(--mn-mute)] hover:text-[var(--mn-teal)]"
                      title="Inserir um parágrafo aqui"
                    >
                      + parágrafo aqui
                    </button>
                  </div>
                </div>
              ))}

              {showPreview && <ProsePreview blocks={previewBlocks} />}
            </div>
          </div>

          {/* Painel de validação */}
          <aside className="lg:sticky lg:top-4 space-y-3 border-2 border-[var(--mn-line)] bg-[var(--mn-ink-2)] p-4">
            <div>
              <p className="font-pixel text-[10px] uppercase text-[var(--mn-mute)]">Caracteres visíveis</p>
              <p className={`font-display text-3xl tabular-nums ${counterTone}`}>
                {totalChars.toLocaleString('pt-BR')}
                <span className="font-body text-sm text-[var(--mn-mute)]"> / 30.000</span>
              </p>
              <div className="relative h-2 bg-[var(--mn-ink)] border border-[var(--mn-line)] mt-2">
                <div
                  className={`h-full transition-all ${
                    totalChars > PROSE_EDITORIAL_POLICY.maximum ? 'bg-[var(--mn-red)]' : 'bg-[var(--mn-yellow)]'
                  }`}
                  style={{ width: `${bandPercent}%` }}
                />
                <span
                  className="absolute top-0 bottom-0 w-px bg-[var(--mn-teal)]"
                  style={{ left: `${recommendedMinPercent}%` }}
                  aria-hidden="true"
                />
                <span
                  className="absolute top-0 bottom-0 w-px bg-[var(--mn-teal)]"
                  style={{ left: `${recommendedMaxPercent}%` }}
                  aria-hidden="true"
                />
              </div>
              <p className="font-body text-[11px] text-[var(--mn-mute)] mt-1">
                Faixa recomendada: 6.000 a 18.000 (marcas verdes).
              </p>
            </div>

            <div className="border-t border-[var(--mn-line)] pt-2 space-y-1">
              <p className="font-body text-xs text-[var(--mn-paper)] flex justify-between">
                <span>Ilustrações</span>
                <span className={`tabular-nums ${illustrationCount > 6 ? 'text-[var(--mn-red)]' : 'text-[var(--mn-paper)]'}`}>
                  {illustrationCount} / 6
                </span>
              </p>
              <p className="font-body text-xs text-[var(--mn-mute)] flex justify-between">
                <span>Blocos de texto</span>
                <span className="tabular-nums">{textBlockCount}</span>
              </p>
              <p className="font-body text-xs text-[var(--mn-mute)] flex justify-between">
                <span>Tipo</span>
                <span>{CHAPTER_TYPE_LABEL[chapterType]}</span>
              </p>
            </div>

            <div className="border-t border-[var(--mn-line)] pt-2 space-y-1" aria-live="polite">
              {totalChars > 0 && totalChars < minChars && (
                <p className="font-body text-[11px] text-[var(--mn-red)]">
                  Faltam {(minChars - totalChars).toLocaleString('pt-BR')} caracteres para o mínimo.
                </p>
              )}
              {chapterType === 'REGULAR' && totalChars >= minChars && totalChars < PROSE_EDITORIAL_POLICY.shortWarningBelow && (
                <p className="font-body text-[11px] text-[var(--mn-yellow)]">
                  Capítulo curto (abaixo de 3.000). Publicação permitida.
                </p>
              )}
              {totalChars > PROSE_EDITORIAL_POLICY.recommendedMaximum && totalChars <= PROSE_EDITORIAL_POLICY.maximum && (
                <p className="font-body text-[11px] text-[var(--mn-yellow)]">
                  Acima da faixa recomendada: revise o ritmo ou divida o capítulo.
                </p>
              )}
              {totalChars > PROSE_EDITORIAL_POLICY.maximum && (
                <p className="font-body text-[11px] text-[var(--mn-red)]">
                  Excedeu 30.000: remova {(totalChars - PROSE_EDITORIAL_POLICY.maximum).toLocaleString('pt-BR')} caracteres.
                </p>
              )}
              {allErrors.length > 0 && (
                <ul className="space-y-1 mt-1">
                  {allErrors.slice(0, 6).map((message) => (
                    <li key={message} className="font-body text-[11px] text-[var(--mn-red)] flex gap-1">
                      <AlertTriangle size={12} className="shrink-0 mt-0.5" /> {message}
                    </li>
                  ))}
                </ul>
              )}
              {allErrors.length === 0 && totalChars > 0 && (
                <p className="font-body text-[11px] text-[var(--mn-teal)] flex items-center gap-1">
                  <Check size={12} /> Pronto para revisar
                </p>
              )}
            </div>

            <p className="font-body text-[10px] text-[var(--mn-mute)] border-t border-[var(--mn-line)] pt-2">
              {savedAt ? `Salvo localmente às ${savedAt.toLocaleTimeString('pt-BR')}` : 'Salvamento local automático'}
            </p>
          </aside>
        </section>
      )}

      {/* Barra compacta fixa no celular: contagem, prévia e avanço sempre à mão */}
      {step === 2 && (
        <div className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-2 border-t-2 border-[var(--mn-yellow)] bg-[var(--mn-ink)] px-3 py-2 lg:hidden">
          <span className="font-pixel text-[10px] uppercase text-[var(--mn-mute)] tabular-nums">
            {totalChars.toLocaleString('pt-BR')} car · {illustrationCount}/6 ilus
          </span>
          <span className="flex-1" />
          <Button
            type="button"
            variant="secondary"
            className="!min-h-[36px] !px-3 !text-[11px]"
            onClick={() => setShowPreview((open) => !open)}
            aria-pressed={showPreview}
          >
            <Eye size={12} /> PRÉVIA
          </Button>
          <Button
            type="button"
            className="!min-h-[36px] !px-3 !text-[11px]"
            onClick={() => goTo(3)}
            disabled={step >= Math.min(4, maxStep)}
          >
            CONTINUAR
          </Button>
        </div>
      )}

      {/* ETAPA 3 · REVISAR */}
      {step === 3 && (
        <section className="space-y-5">
          <div className="border-2 border-[var(--mn-line)] bg-[var(--mn-ink-2)] p-5 space-y-4">
            <h3 className="font-display text-xl text-[var(--mn-paper)] uppercase">Revise como o leitor verá</h3>
            <div className="flex flex-wrap items-center gap-3 font-body text-xs text-[var(--mn-mute)]">
              <span>
                {CHAPTER_TYPE_LABEL[chapterType]} · {totalChars.toLocaleString('pt-BR')} caracteres visíveis
              </span>
              <span>·</span>
              <span>{illustrationCount} ilustração(ões)</span>
            </div>
          </div>

          <ProsePreview blocks={previewBlocks} framed />

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Capa do capítulo */}
            <div className="border-2 border-[var(--mn-line)] bg-[var(--mn-ink-2)] p-4 space-y-3">
              <p className="font-pixel text-[11px] uppercase text-[var(--mn-paper)]">Capa do capítulo (opcional)</p>
              <div className="flex items-center gap-3">
                <div className="w-16 h-24 border border-[var(--mn-line)] bg-[var(--mn-ink)] flex items-center justify-center overflow-hidden">
                  {coverPreview ? (
                    <img src={coverPreview} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon size={18} className="text-[var(--mn-mute)]" />
                  )}
                </div>
                <div className="space-y-2">
                  <input
                    ref={coverInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.target.value = '';
                      if (!file) return;
                      setCoverFile(file);
                      setCoverPreview(URL.createObjectURL(file));
                      setCoverCropOpen(true);
                    }}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    className="!min-h-[32px] !px-3 !text-[11px]"
                    onClick={() => coverInputRef.current?.click()}
                  >
                    <Upload size={12} /> {coverPreview ? 'Trocar' : 'Enviar capa'}
                  </Button>
                  {coverPreview && (
                    <button
                      type="button"
                      onClick={() => {
                        setCoverFile(null);
                        setCoverUrl(null);
                        setCoverPreview(null);
                      }}
                      className="block font-pixel text-[10px] uppercase text-[var(--mn-red)] hover:underline"
                    >
                      remover
                    </button>
                  )}
                </div>
              </div>
              <p className="font-body text-xs text-[var(--mn-mute)]">
                Sem capa própria, o capítulo usa a capa da obra.
              </p>
            </div>

            {/* Publicação: o agendamento só existe na criação — editar não move a data original. */}
            {isEditing ? (
              <div className="border-2 border-[var(--mn-line)] bg-[var(--mn-ink-2)] p-4 space-y-2">
                <p className="font-pixel text-[11px] uppercase text-[var(--mn-paper)]">Data de lançamento</p>
                <p className="font-body text-sm text-[var(--mn-paper)]">
                  {draft?.releaseDate
                    ? new Date(draft.releaseDate).toLocaleString('pt-BR')
                    : 'Mantida como está'}
                </p>
                <p className="font-body text-xs text-[var(--mn-mute)]">
                  A data original e o acesso antecipado do capítulo não mudam na edição.
                </p>
              </div>
            ) : (
              <div className="border-2 border-[var(--mn-line)] bg-[var(--mn-ink-2)] p-4 space-y-3">
                <p className="font-pixel text-[11px] uppercase text-[var(--mn-paper)]">Quando publicar</p>
                <label className="block">
                  <span className="font-body text-xs text-[var(--mn-mute)]">Data e hora (vazio = agora)</span>
                  <input
                    type="datetime-local"
                    value={releaseDate}
                    onChange={(event) => setReleaseDate(event.target.value)}
                    className="mt-1 w-full px-3 py-2 bg-[var(--mn-ink)] border-2 border-[var(--mn-line)] font-body text-sm text-[var(--mn-paper)] outline-none focus:border-[var(--mn-paper)]"
                  />
                </label>
                <p className="font-body text-xs text-[var(--mn-mute)]">
                  {isScheduled
                    ? `Fica agendado para ${scheduledDate().toLocaleString('pt-BR')}.`
                    : 'Publica imediatamente.'}
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ETAPA 4 · PUBLICAR */}
      {step === 4 && (
        <section className="border-2 border-[var(--mn-yellow)] bg-[var(--mn-ink-2)] p-5 space-y-4">
          <h3 className="font-display text-xl text-[var(--mn-paper)] uppercase">
            {isEditing ? 'Publicar alterações' : 'Publicar capítulo'}
          </h3>
          <dl className="grid gap-2 sm:grid-cols-2 font-body text-sm">
            <div className="border border-[var(--mn-line)] px-3 py-2">
              <dt className="font-pixel text-[10px] uppercase text-[var(--mn-mute)]">Obra</dt>
              <dd className="text-[var(--mn-paper)]">{workTitle}</dd>
            </div>
            <div className="border border-[var(--mn-line)] px-3 py-2">
              <dt className="font-pixel text-[10px] uppercase text-[var(--mn-mute)]">Capítulo</dt>
              <dd className="text-[var(--mn-paper)]">
                {isEditing ? `#${editingNumber}` : `#${chapterType === 'PROLOGUE' ? 0 : nextChapterNumber}`} ·{' '}
                {chapterTitle.trim() || '(sem título)'}
              </dd>
            </div>
            <div className="border border-[var(--mn-line)] px-3 py-2">
              <dt className="font-pixel text-[10px] uppercase text-[var(--mn-mute)]">Conteúdo</dt>
              <dd className="text-[var(--mn-paper)]">
                {totalChars.toLocaleString('pt-BR')} caracteres · {illustrationCount} ilustração(ões)
              </dd>
            </div>
            <div className="border border-[var(--mn-line)] px-3 py-2">
              <dt className="font-pixel text-[10px] uppercase text-[var(--mn-mute)]">Publicação</dt>
              <dd className="text-[var(--mn-paper)]">
                {isScheduled ? scheduledDate().toLocaleString('pt-BR') : 'Imediata'}
              </dd>
            </div>
          </dl>

          {isEditing && (
            <p className="border-2 border-[var(--mn-teal)]/40 bg-[var(--mn-teal)]/10 p-3 font-body text-xs text-[var(--mn-paper)]">
              A edição mantém o mesmo capítulo, os comentários, as visualizações e a data original de lançamento.
              Nenhuma notificação de lançamento é disparada de novo.
            </p>
          )}

          {allErrors.length > 0 && (
            <div className="border-2 border-[var(--mn-red)] bg-[var(--mn-ink)] p-3 space-y-1" role="alert">
              <p className="font-pixel text-[11px] uppercase text-[var(--mn-red)]">O capítulo ainda não pode ser publicado</p>
              <ul className="space-y-1">
                {allErrors.map((message) => (
                  <li key={message} className="font-body text-xs text-[var(--mn-red)] flex gap-1">
                    <AlertTriangle size={12} className="shrink-0 mt-0.5" /> {message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Button onClick={publish} disabled={busy || !canPublish} className="!px-6">
            {busy ? 'PUBLICANDO...' : isEditing ? 'PUBLICAR ALTERAÇÕES' : 'PUBLICAR CAPÍTULO'}
          </Button>
        </section>
      )}

      {/* Navegação */}
      <div className="flex items-center justify-between gap-3">
        <Button type="button" variant="ghost" onClick={() => goTo(step - 1)} disabled={step <= 1}>
          <ChevronLeft size={14} /> VOLTAR
        </Button>
        <span className="font-pixel text-[11px] uppercase text-[var(--mn-mute)]">Etapa {step} de 4</span>
        <Button
          type="button"
          variant="secondary"
          onClick={() => goTo(step + 1)}
          disabled={step >= Math.min(4, maxStep)}
        >
          AVANÇAR <ChevronRight size={14} />
        </Button>
      </div>

      {coverCropOpen && coverPreview && (
        <ImageCropper
          file={coverFile}
          sourceUrl={coverFile ? null : coverPreview}
          outputWidth={900}
          outputHeight={1200}
          confirmLabel="USAR ESTA CAPA"
          busy={busy}
          error={error}
          onCancel={() => setCoverCropOpen(false)}
          onConfirm={(blob) => {
            const file = new File([blob], 'chapter-cover.jpg', { type: 'image/jpeg' });
            setCoverFile(file);
            setCoverPreview(URL.createObjectURL(file));
            setCoverCropOpen(false);
          }}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Preview compartilhado (etapa Escrever e Revisar)                    */
/* ------------------------------------------------------------------ */

function ProsePreview({ blocks, framed = false }: { blocks: ProseBlock[]; framed?: boolean }) {
  return (
    <div className={framed ? 'border-2 border-[var(--mn-line)] bg-[#0B0B0C] p-4 sm:p-8' : 'border-2 border-dashed border-[var(--mn-line)] p-3 mt-2'}>
      <p className="font-pixel text-[10px] uppercase text-[var(--mn-mute)] mb-3">Prévia da leitura (scroll)</p>
      <article className="max-w-[680px] mx-auto font-body text-base leading-[1.9] text-[var(--mn-paper)]">
        {blocks.length === 0 && (
          <p className="text-[var(--mn-mute)] text-sm">Nada para pré-visualizar ainda.</p>
        )}
        {blocks.map((block, index) => {
          if (block.type === 'text') {
            return (
              <p key={`p-${index}`} className="whitespace-pre-wrap mb-5">
                {block.content.text.replace(/<[^>]*>/gs, '')}
              </p>
            );
          }
          if (block.type === 'illustration') {
            return (
              <figure key={`i-${index}`} className="my-6 text-center">
                <img
                  src={illustrationSrc(block.content.fileId)}
                  alt={block.content.altText || ''}
                  style={{ width: `${block.content.width ?? 100}%`, maxWidth: '100%' }}
                  className="mx-auto border border-[var(--mn-line)]"
                  loading="lazy"
                />
                {block.content.altText && (
                  <figcaption className="font-body text-xs text-[var(--mn-mute)] mt-1">
                    {block.content.altText}
                  </figcaption>
                )}
              </figure>
            );
          }
          return (
            <div key={`s-${index}`} className="my-6 text-center font-display text-[var(--mn-mute)]">
              {SEPARATOR_LABEL[(block.content?.style ?? 'scene') as SeparatorEditorBlock['style']]?.glyph ?? '— — —'}
            </div>
          );
        })}
      </article>
    </div>
  );
}

/** Handle de arrasto (SVG inline evita depender de ícone não importado). */
function Grip() {
  return (
    <svg width="10" height="16" viewBox="0 0 10 16" aria-hidden="true" focusable="false">
      <circle cx="2.5" cy="3" r="1.2" fill="currentColor" />
      <circle cx="7.5" cy="3" r="1.2" fill="currentColor" />
      <circle cx="2.5" cy="8" r="1.2" fill="currentColor" />
      <circle cx="7.5" cy="8" r="1.2" fill="currentColor" />
      <circle cx="2.5" cy="13" r="1.2" fill="currentColor" />
      <circle cx="7.5" cy="13" r="1.2" fill="currentColor" />
    </svg>
  );
}

function blockHasContent(blocks: EditorBlock[]): boolean {
  return blocks.some((block) => block.type === 'text' && block.text.trim().length > 0);
}

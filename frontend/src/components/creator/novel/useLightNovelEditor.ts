import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChapterDraft,
  EditorBlock,
  initialBlocks,
  newIllustrationBlock,
  newTextBlock,
  toProseBlock,
} from './novelEditorTypes';
import {
  ChapterBlocksDto,
  ChapterType,
  countVisibleProseCharacters,
  validateChapterBlocks,
} from '../../../utils/proseEditorialPolicy';
import { storageApi } from '../../../api/storageApi';
import { workApi } from '../../../api/workApi';
import { toBackendLocalDateTime } from '../../../utils/datetime';

export interface UseLightNovelEditorProps {
  workId: string;
  nextChapterNumber: number;
  draft?: ChapterDraft | null;
  editingNumber?: number | null;
  existingChapterNumbers?: number[];
  onSaved?: () => void;
}

function sanitizeRestoredBlocks(rawBlocks: unknown[]): EditorBlock[] {
  const result: EditorBlock[] = [];
  for (const item of rawBlocks) {
    if (!item || typeof item !== 'object') continue;
    const b = item as Record<string, unknown>;
    const key = typeof b.key === 'string' && b.key ? b.key : Math.random().toString(36).slice(2, 9);
    if (b.type === 'text') {
      result.push({
        key,
        type: 'text',
        text: typeof b.text === 'string' ? b.text : '',
      });
    } else if (b.type === 'illustration') {
      result.push({
        key,
        type: 'illustration',
        fileId: typeof b.fileId === 'string' ? b.fileId : '',
        altText: typeof b.altText === 'string' ? b.altText : '',
        width: typeof b.width === 'number' ? b.width : 100,
        previewUrl: typeof b.previewUrl === 'string' ? b.previewUrl : '',
      });
    } else if (b.type === 'separator') {
      const style = b.style === 'time' || b.style === 'pov' || b.style === 'line' ? b.style : 'scene';
      result.push({
        key,
        type: 'separator',
        style,
      });
    }
  }
  return result;
}

export function useLightNovelEditor({
  workId,
  nextChapterNumber,
  draft,
  editingNumber,
  existingChapterNumbers = [],
  onSaved,
}: UseLightNovelEditorProps) {
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

  const scheduledDate = () => (releaseDate ? new Date(releaseDate) : new Date());
  const isScheduled = Boolean(releaseDate) && scheduledDate().getTime() > Date.now();

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

  // Autosave
  useEffect(() => {
    if (!dirty) return;
    const handle = window.setTimeout(() => {
      try {
        const payload = {
          title: chapterTitle,
          chapterType,
          blocks,
          releaseDate,
          coverUrl,
          savedAt: new Date().toISOString(),
        };
        localStorage.setItem(draftKey, JSON.stringify(payload));
        setSavedAt(new Date());
      } catch {
        // quota
      }
    }, 1200);
    return () => clearTimeout(handle);
  }, [dirty, chapterTitle, chapterType, blocks, releaseDate, coverUrl, draftKey]);

  // Checa rascunho recuperável
  useEffect(() => {
    try {
      const stored = localStorage.getItem(draftKey);
      if (!stored) return;
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed?.blocks) && parsed.blocks.length > 0) {
        const sanitized = sanitizeRestoredBlocks(parsed.blocks);
        if (sanitized.length > 0) {
          setRecoverable({
            title: typeof parsed.title === 'string' ? parsed.title : '',
            chapterType: parsed.chapterType === 'PROLOGUE' || parsed.chapterType === 'SPECIAL' ? parsed.chapterType : 'REGULAR',
            blocks: sanitized,
            savedAt: typeof parsed.savedAt === 'string' ? parsed.savedAt : '',
          });
        }
      }
    } catch {
      // ignore
    }
  }, [draftKey]);

  const restoreDraft = useCallback(() => {
    if (!recoverable) return;
    setChapterTitle(recoverable.title);
    setChapterType(recoverable.chapterType);
    setBlocks(recoverable.blocks);
    setDirty(true);
    setRecoverable(null);
  }, [recoverable]);

  const discardStoredDraft = useCallback(() => {
    try {
      localStorage.removeItem(draftKey);
    } catch {
      // ignore
    }
    setRecoverable(null);
  }, [draftKey]);

  const markDirty = useCallback(() => setDirty(true), []);

  const updateBlock = useCallback((key: string, updater: (b: EditorBlock) => EditorBlock) => {
    setBlocks((prev) => prev.map((b) => (b.key === key ? updater(b) : b)));
    setDirty(true);
  }, []);

  const addBlockAt = useCallback((index: number, block: EditorBlock) => {
    setBlocks((prev) => {
      const next = [...prev];
      next.splice(index + 1, 0, block);
      return next;
    });
    setDirty(true);
    setTimeout(() => {
      if (block.type === 'text') {
        const el = textareaRefs.current[block.key];
        el?.focus();
      }
    }, 50);
  }, []);

  const removeBlock = useCallback((key: string) => {
    setBlocks((prev) => {
      if (prev.length <= 1) {
        return [newTextBlock()];
      }
      return prev.filter((b) => b.key !== key);
    });
    setDirty(true);
  }, []);

  const moveBlock = useCallback((from: number, to: number) => {
    setBlocks((prev) => {
      if (to < 0 || to >= prev.length || from === to) return prev;
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
    setDirty(true);
  }, []);

  const handleIllustrationUpload = useCallback(
    async (file: File, targetKey?: string, insertIndex?: number) => {
      setError(null);
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        setError('Formato não suportado. Envie apenas imagens nos formatos JPEG, PNG ou WebP.');
        return;
      }
      if (file.size > 15 * 1024 * 1024) {
        setError('A imagem excede o limite de 15 MB.');
        return;
      }

      const localPreview = URL.createObjectURL(file);
      let blockKey = targetKey;

      if (!blockKey) {
        const placeholder = newIllustrationBlock('', localPreview, file.name);
        placeholder.uploading = true;
        blockKey = placeholder.key;
        if (typeof insertIndex === 'number') {
          addBlockAt(insertIndex, placeholder);
        } else {
          setBlocks((prev) => [...prev, placeholder]);
          setDirty(true);
        }
      } else {
        updateBlock(blockKey, (b) =>
          b.type === 'illustration'
            ? { ...b, previewUrl: localPreview, uploading: true, fileName: file.name }
            : b
        );
      }

      try {
        const uploaded = await storageApi.uploadFile(file);
        updateBlock(blockKey, (b) =>
          b.type === 'illustration'
            ? {
                ...b,
                fileId: uploaded.filename,
                previewUrl: uploaded.url,
                uploading: false,
              }
            : b
        );
      } catch (err) {
        updateBlock(blockKey, (b) =>
          b.type === 'illustration' ? { ...b, uploading: false } : b
        );
        setError(err instanceof Error ? err.message : 'Falha ao enviar a ilustração.');
      }
    },
    [addBlockAt, updateBlock]
  );

  const handlePublish = useCallback(async () => {
    setError(null);
    setSuccess(null);

    if (titleError) {
      setError(titleError);
      setStep(1);
      return;
    }
    if (typeError) {
      setError(typeError);
      setStep(1);
      return;
    }
    if (structureErrors.length > 0) {
      setError(structureErrors[0]);
      setStep(2);
      return;
    }
    if (!editorial.valid) {
      setError(editorial.errors[0] ?? 'O capítulo não cumpre a política editorial.');
      setStep(2);
      return;
    }

    setBusy(true);
    try {
      let finalCover = coverUrl;
      if (coverFile) {
        const uploaded = await storageApi.uploadFile(coverFile);
        finalCover = uploaded.url;
        setCoverUrl(uploaded.url);
      }

      const blocksPayload = JSON.stringify(blocksDto);
      const isEditing = editingNumber !== null && editingNumber !== undefined;
      const effectiveReleaseAt = releaseDate ? releaseDate : toBackendLocalDateTime();

      if (isEditing) {
        await workApi.updateChapter(workId, editingNumber, {
          title: chapterTitle.trim(),
          coverUrl: finalCover ?? undefined,
          content: blocksPayload,
          format: 'PROSE',
          publicReleaseAt: effectiveReleaseAt,
          chapterType,
        });
        setSuccess('Capítulo atualizado com sucesso!');
      } else {
        const assignedNumber = chapterType === 'PROLOGUE' ? 0 : nextChapterNumber;
        await workApi.createChapter(workId, {
          chapterNumber: assignedNumber,
          title: chapterTitle.trim(),
          coverUrl: finalCover ?? undefined,
          content: blocksPayload,
          format: 'PROSE',
          publicReleaseAt: effectiveReleaseAt,
          chapterType,
        });
        setSuccess(
          chapterType === 'PROLOGUE'
            ? 'Prólogo publicado com sucesso!'
            : `Capítulo ${assignedNumber} publicado com sucesso!`
        );
      }

      try {
        localStorage.removeItem(draftKey);
      } catch {
        // ignore
      }
      setDirty(false);
      onSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar o capítulo.');
    } finally {
      setBusy(false);
    }
  }, [
    titleError,
    typeError,
    structureErrors,
    editorial,
    coverUrl,
    coverFile,
    blocksDto,
    editingNumber,
    workId,
    chapterTitle,
    releaseDate,
    chapterType,
    nextChapterNumber,
    draftKey,
    onSaved,
  ]);

  return {
    step,
    setStep,
    chapterType,
    setChapterType,
    chapterTitle,
    setChapterTitle,
    blocks,
    releaseDate,
    setReleaseDate,
    coverFile,
    setCoverFile,
    coverUrl,
    setCoverUrl,
    coverPreview,
    setCoverPreview,
    coverCropOpen,
    setCoverCropOpen,
    busy,
    error,
    setError,
    success,
    dirty,
    savedAt,
    recoverable,
    dragIndex,
    setDragIndex,
    overIndex,
    setOverIndex,
    fileDropActive,
    setFileDropActive,
    showPreview,
    setShowPreview,
    coverInputRef,
    blockInputRefs,
    textareaRefs,
    prologueTaken,
    isScheduled,
    scheduledDate,
    blocksDto,
    totalChars,
    illustrationCount,
    textBlockCount,
    uploading,
    structureErrors,
    editorial,
    titleError,
    typeError,
    restoreDraft,
    discardStoredDraft,
    markDirty,
    updateBlock,
    addBlockAt,
    removeBlock,
    moveBlock,
    handleIllustrationUpload,
    handlePublish,
  };
}

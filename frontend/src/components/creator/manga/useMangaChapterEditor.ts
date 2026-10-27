import { useEffect, useMemo, useRef, useState } from 'react';
import { PageItem, ChecklistItem } from './mangaEditorTypes';
import { toBackendLocalDateTime } from '../../../utils/datetime';
import { storageApi } from '../../../api/storageApi';
import { workApi } from '../../../api/workApi';
import type { ChapterDraft } from '../LightNovelChapterWizard';

export interface UseMangaChapterEditorProps {
  workId: string;
  workTitle: string;
  nextChapterNumber: number;
  draft?: ChapterDraft | null;
  onPublished?: () => void;
}

export function useMangaChapterEditor({
  workId,
  workTitle,
  nextChapterNumber,
  draft,
  onPublished,
}: UseMangaChapterEditorProps) {
  const isEditing = Boolean(draft);

  const [step, setStep] = useState<number>(1);
  const [pages, setPages] = useState<PageItem[]>(() =>
    (draft?.pages ?? []).map((url, index) => ({
      key: `existente-${index}-${url}`,
      url,
      previewUrl: url,
    }))
  );
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState<PageItem | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(draft?.coverUrl ?? null);
  const [coverPreview, setCoverPreview] = useState<string | null>(draft?.coverUrl ?? null);
  const [chapterTitle, setChapterTitle] = useState(`Capítulo ${nextChapterNumber}`);
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

  const uploadReady = pages.length > 0;
  const organizeReady = uploadReady;
  const coverReady = true;
  const reviewReady = chapterTitle.trim().length > 0 && uploadReady;

  const checklist: ChecklistItem[] = useMemo(
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
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    const selected = Array.from(files).filter((file) => allowed.includes(file.type));
    if (selected.length === 0) {
      setError('Selecione arquivos de imagem válidos (JPG, PNG ou WebP).');
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

  const reorderByDrag = (from: number, to: number) => {
    setPages((current) => {
      if (from === to || from < 0 || to < 0 || from >= current.length || to >= current.length) return current;
      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

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
      setError('Envie pelo menos uma página do capítulo.');
      return;
    }
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const uploaded: string[] = [];
      for (const page of pages) {
        if (page.url) {
          uploaded.push(page.url);
          continue;
        }
        if (!page.file) continue;
        const stored = await storageApi.uploadFile(page.file);
        uploaded.push(stored.url);
      }

      let chapterCoverUrl: string | undefined = coverUrl ?? undefined;
      if (!chapterCoverUrl && coverFile) {
        const storedCover = await storageApi.uploadFile(coverFile);
        chapterCoverUrl = storedCover.url;
      }

      const chapterNumber = draft?.chapterNumber ?? nextChapterNumber;
      if (isEditing) {
        await workApi.updateChapter(workId, chapterNumber, {
          title: chapterTitle.trim(),
          coverUrl: chapterCoverUrl,
          pages: uploaded,
          format: 'IMAGE_PAGES',
          publicReleaseAt: releaseDate ? toBackendLocalDateTime(new Date(releaseDate)) : toBackendLocalDateTime(new Date()),
        });
      } else {
        await workApi.createChapter(workId, {
          chapterNumber,
          title: chapterTitle.trim(),
          coverUrl: chapterCoverUrl,
          pages: uploaded,
          format: 'IMAGE_PAGES',
          publicReleaseAt: releaseDate ? toBackendLocalDateTime(new Date(releaseDate)) : toBackendLocalDateTime(new Date()),
        });
      }

      setSuccess(
        releaseDate
          ? `Capítulo agendado para ${new Date(releaseDate).toLocaleDateString('pt-BR')} em "${workTitle}".`
          : `Capítulo publicado em "${workTitle}".`
      );
      setPages([]);
      onPublished?.();
    } catch (err: any) {
      setError(err?.message || 'Não foi possível publicar o capítulo. Verifique os dados e tente novamente.');
    } finally {
      setBusy(false);
    }
  };

  return {
    isEditing,
    step,
    goToStep,
    checklist,
    maxStep,
    pages,
    dragging,
    setDragging,
    preview,
    setPreview,
    coverFile,
    coverUrl,
    setCoverUrl,
    coverPreview,
    setCoverPreview,
    chapterTitle,
    setChapterTitle,
    releaseDate,
    setReleaseDate,
    chapterCoverCropOpen,
    setChapterCoverCropOpen,
    busy,
    error,
    setError,
    success,
    jumpTo,
    setJumpTo,
    dragIndex,
    setDragIndex,
    overIndex,
    setOverIndex,
    pagesInputRef,
    coverInputRef,
    pageRefs,
    addPages,
    removePage,
    movePage,
    reorderByDrag,
    jumpToPage,
    pickCover,
    publish,
  };
}

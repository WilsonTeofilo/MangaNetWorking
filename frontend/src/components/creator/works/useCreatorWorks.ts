import { useEffect, useMemo, useState, useCallback } from 'react';
import { workApi, CreatorWorkSummaryDto } from '../../../api/workApi';
import { storageApi } from '../../../api/storageApi';

export const GENRES = [
  'ACAO',
  'AVENTURA',
  'ROMANCE',
  'FANTASIA',
  'SCI_FI',
  'SHONEN',
  'DRAMA',
  'TERROR',
] as const;

export type Genre = (typeof GENRES)[number];

export function useCreatorWorks() {
  const [works, setWorks] = useState<CreatorWorkSummaryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [synopsis, setSynopsis] = useState('');
  const [genres, setGenres] = useState<string[]>(['ACAO']);
  const [format, setFormat] = useState<'MANGA' | 'LIGHT_NOVEL'>('MANGA');
  const [cover, setCover] = useState<{ url: string; previewUrl: string } | null>(null);
  const [banner, setBanner] = useState<{ url: string; previewUrl: string } | null>(null);
  const [status, setStatus] = useState<'ongoing' | 'draft' | 'completed'>('ongoing');
  const [declared, setDeclared] = useState(false);
  const [saving, setSaving] = useState(false);

  /** Busca por título (filtragem local, normalizada e sem acento). */
  const [query, setQuery] = useState('');
  /** O formulário de lançamento/edição só aparece quando pedido. */
  const [formOpen, setFormOpen] = useState(false);

  /** Origem do recorte em andamento: capa ou banner. */
  const [cropTarget, setCropTarget] = useState<'cover' | 'banner' | null>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  /** URL da imagem atual, usada como origem do recorte (reajustar). */
  const [cropUrl, setCropUrl] = useState<string | null>(null);

  const loadWorks = useCallback(async () => {
    setLoading(true);
    try {
      const payload = await workApi.listMyWorks();
      setWorks(payload);
      if (payload.length === 0) {
        setFormOpen(true);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar suas obras.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    workApi
      .listMyWorks()
      .then((payload) => {
        if (active) {
          setWorks(payload);
          if (payload.length === 0) setFormOpen(true);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setError(err instanceof Error ? err.message : 'Não foi possível carregar suas obras.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const resetForm = useCallback(() => {
    setEditingId(null);
    setTitle('');
    setSynopsis('');
    setGenres(['ACAO']);
    setFormat('MANGA');
    setCover(null);
    setBanner(null);
    setStatus('ongoing');
    setDeclared(false);
  }, []);

  const startEditing = useCallback((work: CreatorWorkSummaryDto) => {
    setFormOpen(true);
    setEditingId(work.id);
    setTitle(work.title);
    setSynopsis(work.synopsis ?? '');
    setGenres(work.genres ?? []);
    setCover(work.coverUrl ? { url: work.coverUrl, previewUrl: work.coverUrl } : null);
    setBanner(work.bannerUrl ? { url: work.bannerUrl, previewUrl: work.bannerUrl } : null);
    setStatus((work.status as 'ongoing' | 'draft' | 'completed') || 'ongoing');
    setMessage(null);
    setError(null);
  }, []);

  const toggleGenre = useCallback((genre: string) => {
    setGenres((current) =>
      current.includes(genre) ? current.filter((item) => item !== genre) : [...current, genre]
    );
  }, []);

  const uploadCover = useCallback(async (file: File) => {
    const stored = await storageApi.uploadFile(file);
    setCover({ url: stored.url, previewUrl: stored.url });
  }, []);

  const uploadBanner = useCallback(async (file: File) => {
    const stored = await storageApi.uploadFile(file);
    setBanner({ url: stored.url, previewUrl: stored.url });
  }, []);

  const startCropFromFile = useCallback((target: 'cover' | 'banner', file: File) => {
    setCropTarget(target);
    setCropFile(file);
    setCropUrl(null);
  }, []);

  const startCropFromUrl = useCallback((target: 'cover' | 'banner', url: string) => {
    setCropTarget(target);
    setCropFile(null);
    setCropUrl(url);
  }, []);

  const cancelCrop = useCallback(() => {
    setCropFile(null);
    setCropUrl(null);
    setCropTarget(null);
  }, []);

  const confirmCrop = useCallback(
    async (blob: Blob) => {
      if (!cropTarget) return;
      const file = new File([blob], cropTarget === 'banner' ? 'banner.jpg' : 'cover.jpg', {
        type: 'image/jpeg',
      });
      setSaving(true);
      try {
        if (cropTarget === 'banner') {
          await uploadBanner(file);
        } else {
          await uploadCover(file);
        }
        cancelCrop();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Não foi possível processar a imagem.');
      } finally {
        setSaving(false);
      }
    },
    [cropTarget, uploadBanner, uploadCover, cancelCrop]
  );

  const save = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      if (!title.trim() || !synopsis.trim()) {
        setError('Título e sinopse são obrigatórios.');
        return;
      }
      if (!cover) {
        setError('Envie a capa da obra.');
        return;
      }
      if (!declared) {
        setError('A declaração de autoria original é obrigatória.');
        return;
      }
      setSaving(true);
      setError(null);
      setMessage(null);
      try {
        if (editingId) {
          await workApi.updateWork(editingId, {
            title: title.trim(),
            synopsis: synopsis.trim(),
            coverUrl: cover.url,
            bannerUrl: banner?.url,
            genres,
            format,
            status,
          });
          setMessage('Obra atualizada.');
        } else {
          await workApi.createWork({
            title: title.trim(),
            synopsis: synopsis.trim(),
            coverUrl: cover.url,
            bannerUrl: banner?.url,
            genres,
            originalAuthorDeclaration: true,
            format,
          });
          setMessage('Obra publicada no catálogo.');
        }
        resetForm();
        setFormOpen(works.length === 0);
        await loadWorks();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Não foi possível salvar a obra.');
      } finally {
        setSaving(false);
      }
    },
    [title, synopsis, cover, declared, editingId, banner, genres, format, status, works.length, resetForm, loadWorks]
  );

  const remove = useCallback(
    async (work: CreatorWorkSummaryDto) => {
      if (!window.confirm(`Remover a obra "${work.title}"? Os capítulos publicados saem do catálogo.`)) return;
      try {
        await workApi.deleteWork(work.id);
        setMessage('Obra removida.');
        await loadWorks();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Não foi possível remover a obra.');
      }
    },
    [loadWorks]
  );

  /** Normaliza o texto da busca: minúsculas e sem acento. */
  const normalizeText = (value: string): string => {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  };

  const filteredWorks = useMemo(() => {
    const term = normalizeText(query.trim());
    if (!term) return works;
    return works.filter((work) => normalizeText(work.title).includes(term));
  }, [works, query]);

  return {
    works,
    loading,
    error,
    message,
    setError,
    setMessage,
    query,
    setQuery,
    filteredWorks,
    editingId,
    title,
    setTitle,
    synopsis,
    setSynopsis,
    genres,
    setGenres,
    toggleGenre,
    format,
    setFormat,
    cover,
    setCover,
    banner,
    setBanner,
    status,
    setStatus,
    declared,
    setDeclared,
    saving,
    formOpen,
    setFormOpen,
    cropTarget,
    setCropTarget,
    cropFile,
    setCropFile,
    cropUrl,
    setCropUrl,
    loadWorks,
    startEditing,
    resetForm,
    save,
    remove,
    uploadCover,
    uploadBanner,
    startCropFromFile,
    startCropFromUrl,
    cancelCrop,
    confirmCrop,
  };
}

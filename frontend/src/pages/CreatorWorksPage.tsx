import { useEffect, useMemo, useState } from 'react';
import { BookMarked, Crop, Pencil, Plus, Search, Trash2, Upload } from 'lucide-react';
import { workApi, CreatorWorkSummaryDto } from '../api/workApi';
import { storageApi } from '../api/storageApi';
import { ImageCropper } from '../components/common/ImageCropper';
import { Button } from '../components/ui/Button';
import { Field } from '../components/ui/Field';

const GENRES = ['ACAO', 'AVENTURA', 'ROMANCE', 'FANTASIA', 'SCI_FI', 'SHONEN', 'DRAMA', 'TERROR'];

/**
 * "Minhas obras" — lançar e configurar a OBRA.
 *
 * <p>Responsabilidade única (como no MangaTeofilo: `ObrasList` + `ObrasEditor`): a obra é
 * criada e configurada aqui — capa, banner, categorias, título, sinopse e estado. Nada de
 * páginas de capítulo: isso vive na tela "Capítulos", que começa escolhendo a obra.</p>
 */
export function CreatorWorksPage() {
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
  /** Busca por titulo (filtragem local, normalizada e sem acento). */
  const [query, setQuery] = useState('');
  /** O formulario de lancamento/edicao so aparece quando pedido. */
  const [formOpen, setFormOpen] = useState(false);
  /** Origem do recorte em andamento: capa ou banner. */
  const [cropTarget, setCropTarget] = useState<'cover' | 'banner' | null>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  /** URL da imagem atual, usada como origem do recorte (reajustar). */
  const [cropUrl, setCropUrl] = useState<string | null>(null);

  // Efeito com a carga embutida: evita depender de uma funcao recriada a cada render.
  useEffect(() => {
    let active = true;
    setLoading(true);
    workApi
      .listMyWorks()
      .then((payload) => {
        if (active) {
          setWorks(payload);
          // Sem nenhuma obra no catalogo, o formulario de lancamento ja aparece.
          if (payload.length === 0) setFormOpen(true);
        }
      })
      .catch(() => {
        if (active) setError('Não foi possível carregar suas obras.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const loadWorks = () => {
    setLoading(true);
    workApi
      .listMyWorks()
      .then(setWorks)
      .catch(() => setError('Não foi possível carregar suas obras.'))
      .finally(() => setLoading(false));
  };


  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setSynopsis('');
    setGenres(['ACAO']);
    setFormat('MANGA');
    setCover(null);
    setBanner(null);
    setStatus('ongoing');
    setDeclared(false);
  };

  const startEditing = (work: CreatorWorkSummaryDto) => {
    setFormOpen(true);
    setEditingId(work.id);
    setTitle(work.title);
    // A sinopse e as categorias JA GRAVADAS entram no formulario: editar nao pode
    // apagar o que o autor ja escreveu.
    setSynopsis(work.synopsis ?? '');
    setGenres(work.genres ?? []);
    setCover(work.coverUrl ? { url: work.coverUrl, previewUrl: work.coverUrl } : null);
    setBanner(work.bannerUrl ? { url: work.bannerUrl, previewUrl: work.bannerUrl } : null);
    setStatus((work.status as 'ongoing' | 'draft' | 'completed') || 'ongoing');
    setMessage(null);
  };

  const uploadCover = async (file: File) => {
    const stored = await storageApi.uploadFile(file);
    setCover({ url: stored.url, previewUrl: stored.url });
  };

  const uploadBanner = async (file: File) => {
    const stored = await storageApi.uploadFile(file);
    setBanner({ url: stored.url, previewUrl: stored.url });
  };

  const save = async (event: React.FormEvent) => {
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
      loadWorks();
    } catch (err: any) {
      setError(err?.message || 'Não foi possível salvar a obra.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (work: CreatorWorkSummaryDto) => {
    if (!window.confirm(`Remover a obra "${work.title}"? Os capítulos publicados saem do catálogo.`)) return;
    try {
      await workApi.deleteWork(work.id);
      setMessage('Obra removida.');
      loadWorks();
    } catch (err: any) {
      setError(err?.message || 'Não foi possível remover a obra.');
    }
  };

  /** Normaliza o texto da busca: minusculas e sem acento (aspx). */
  function normalizeText(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  const filteredWorks = useMemo(() => {
    const term = normalizeText(query.trim());
    if (!term) return works;
    return works.filter((work) => normalizeText(work.title).includes(term));
  }, [works, query]);

  const list = filteredWorks;

  return (
    <section className="mn-container py-10 space-y-8">
      <header className="border-2 border-[var(--mn-yellow)] bg-[var(--mn-ink-2)] p-6 shadow-[6px_6px_0_var(--mn-yellow)]">
        <p className="font-pixel text-[11px] tracking-widest text-[var(--mn-mute)] uppercase">Criador</p>
        <h1 className="font-display text-3xl sm:text-4xl text-[var(--mn-paper)] uppercase mt-1 flex items-center gap-3">
          <BookMarked size={26} className="text-[var(--mn-yellow)]" /> Minhas obras
        </h1>
        <p className="mt-2 text-sm text-[var(--mn-mute)]">
          Aqui você lança e configura a <strong className="text-[var(--mn-paper)]">obra</strong>: capa, banner,
          categorias, título e sinopse. Para publicar capítulos, vá em <strong className="text-[var(--mn-paper)]">Capítulos</strong>
          e escolha a obra.
        </p>
      </header>

      {/* Lista das obras */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl text-[var(--mn-paper)] uppercase">Seu catálogo</h2>
          <div className="flex flex-wrap items-center gap-2">
            {works.length > 0 && (
              <label className="flex items-center gap-2 border-2 border-[var(--mn-line)] bg-[var(--mn-ink-2)] px-3 py-2">
                <Search size={14} className="text-[var(--mn-mute)]" />
                <span className="sr-only">Buscar obra pelo título</span>
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar por título"
                  className="w-48 bg-transparent font-body text-sm text-[var(--mn-paper)] placeholder:text-[var(--mn-mute)] focus:outline-none"
                />
              </label>
            )}
            {works.length > 0 && (
              <Button
                variant="primary"
                onClick={() => {
                  resetForm();
                  setFormOpen(true);
                }}
                className="!px-5 !py-3 shadow-[4px_4px_0_#0B0B0C]"
                title="Abrir o formulário para lançar uma nova obra"
              >
                <Plus size={15} /> LANÇAR NOVA OBRA
              </Button>
            )}
          </div>
        </div>

        {loading && <p className="font-pixel text-[11px] uppercase text-[var(--mn-mute)]">Carregando...</p>}
        {!loading && works.length === 0 && (
          <p className="font-body text-sm text-[var(--mn-mute)]">
            Nenhuma obra ainda. Use o formulário abaixo para lançar a primeira.
          </p>
        )}
        {!loading && works.length > 0 && list.length === 0 && (
          <p className="font-body text-sm text-[var(--mn-mute)]">
            Nenhuma obra com esse título. Ajuste a busca ou lance uma nova obra.
          </p>
        )}
        <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map((work) => (
            <li key={work.id} className="border-2 border-[var(--mn-line)] bg-[var(--mn-ink-2)] p-4 space-y-3">
              <div className="flex gap-3">
                <img
                  src={work.coverUrl || '/avatar-placeholder.png'}
                  alt={work.title}
                  className="w-20 h-28 object-cover border-2 border-[var(--mn-line)]"
                />
                <div className="min-w-0">
                  <p className="font-display text-sm text-[var(--mn-paper)] uppercase break-words">{work.title}</p>
                  <p className="font-pixel text-[10px] uppercase text-[var(--mn-mute)]">
                    {work.status === 'draft' ? 'Rascunho' : work.status === 'completed' ? 'Concluída' : 'Em lançamento'}
                  </p>
                  <p className="font-pixel text-[10px] uppercase text-[var(--mn-mute)]">
                    {work.totalChapters} cap · {work.totalViews} views · {work.totalLikes} likes
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="ghost" onClick={() => startEditing(work)}>
                  <Pencil size={13} /> CONFIGURAR
                </Button>
                <Button variant="ghost" onClick={() => remove(work)}>
                  <Trash2 size={13} /> REMOVER
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Formulário de lançamento/configuração da obra.
          Sem obra no catálogo ele aparece direto; com obra, só abre pelo botão "LANÇAR NOVA OBRA"
          (o autor com muitas obras quer ver o catálogo, não um formulário Taking o olho). */}
      {formOpen && (
      <form onSubmit={save} className="border-2 border-[var(--mn-line)] bg-[var(--mn-ink-2)] p-6 space-y-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-xl text-[var(--mn-paper)] uppercase">
            {editingId ? 'Configurar obra' : 'Lançar nova obra'}
          </h2>
          <div className="flex items-center gap-2">
            {editingId && (
              <Button type="button" variant="ghost" onClick={resetForm}>
                CANCELAR EDIÇÃO
              </Button>
            )}
            <Button type="button" variant="ghost" onClick={() => setFormOpen(false)}>
              FECHAR
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-5">
          <div className="space-y-4">
            <Field label="TÍTULO DA OBRA" value={title} onChange={(event) => setTitle(event.target.value)} />
            <div className="space-y-1.5">
              <label htmlFor="work-synopsis" className="font-body text-sm font-semibold text-[var(--mn-paper)] block">
                SINOPSE
              </label>
              <textarea
                id="work-synopsis"
                value={synopsis}
                onChange={(event) => setSynopsis(event.target.value)}
                rows={4}
                minLength={100}
                maxLength={500}
                className="w-full p-3 bg-[var(--mn-ink-2)] text-[var(--mn-paper)] font-body text-sm border-2 border-[var(--mn-line)] focus:border-[var(--mn-paper)] focus:shadow-[3px_3px_0_var(--mn-yellow)] outline-none"
              />
              <p className="font-pixel text-[11px] uppercase text-[var(--mn-mute)]">
                {synopsis.trim().length}/500 caracteres · mínimo de 100
              </p>
            </div>
            <div className="space-y-2">
              <p className="font-body text-sm font-semibold text-[var(--mn-paper)]">CATEGORIAS</p>
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
            {editingId && (
              <div className="space-y-2">
                <p className="font-body text-sm font-semibold text-[var(--mn-paper)]">ESTADO</p>
                <div className="flex gap-2">
                  {(
                    [
                      { value: 'ongoing', label: 'EM LANÇAMENTO' },
                      { value: 'draft', label: 'RASCUNHO' },
                      { value: 'completed', label: 'CONCLUÍDA' },
                    ] as const
                  ).map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setStatus(option.value)}
                      aria-pressed={status === option.value}
                      className={`px-3 py-1 border-2 font-pixel text-[11px] uppercase transition-colors ${
                        status === option.value
                          ? 'bg-[var(--mn-yellow)] text-[var(--mn-ink)] border-[var(--mn-ink)]'
                          : 'border-[var(--mn-line)] text-[var(--mn-paper)] hover:border-[var(--mn-yellow)]'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Capa e banner (a obra, não o capítulo) */}
          <div className="space-y-4">
            <div className="border-2 border-[var(--mn-line)] p-4 space-y-2">
              <p className="font-pixel text-[11px] uppercase text-[var(--mn-mute)]">CAPA DA OBRA (2:3)</p>
              {cover ? (
                <img src={cover.previewUrl} alt="Capa da obra" className="w-32 h-48 object-cover border-2 border-[var(--mn-line)]" />
              ) : (
                <p className="font-pixel text-[11px] uppercase text-[var(--mn-mute)]">Nenhum arquivo selecionado</p>
              )}
              <label className="inline-flex items-center gap-2 border-2 border-[var(--mn-line)] px-3 py-2 font-pixel text-[11px] uppercase text-[var(--mn-paper)] hover:border-[var(--mn-yellow)] cursor-pointer">
                <Upload size={13} /> {cover ? 'TROCAR CAPA' : 'ENVIAR CAPA'}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = '';
                    if (file) {
                      setCropTarget('cover');
                      setCropFile(file);
                      setCropUrl(null);
                    }
                  }}
                />
              </label>
              {cover && (
                <button
                  type="button"
                  onClick={() => {
                    setCropTarget('cover');
                    setCropFile(null);
                    setCropUrl(cover.url);
                  }}
                  className="inline-flex items-center gap-2 border-2 border-[var(--mn-line)] px-3 py-2 font-pixel text-[11px] uppercase text-[var(--mn-paper)] hover:border-[var(--mn-yellow)]"
                  title="Reenquadra a capa atual arrastando, sem subir um arquivo novo"
                >
                  <Crop size={13} /> AJUSTAR CAPA
                </button>
              )}
            </div>

            <div className="border-2 border-[var(--mn-line)] p-4 space-y-2">
              <p className="font-pixel text-[11px] uppercase text-[var(--mn-mute)]">BANNER (16:9)</p>
              {banner && (
                <img src={banner.previewUrl} alt="Banner da obra" className="w-full h-24 object-cover border-2 border-[var(--mn-line)]" />
              )}
              <label className="inline-flex items-center gap-2 border-2 border-[var(--mn-line)] px-3 py-2 font-pixel text-[11px] uppercase text-[var(--mn-paper)] hover:border-[var(--mn-yellow)] cursor-pointer">
                <Upload size={13} /> {banner ? 'TROCAR BANNER' : 'ENVIAR BANNER'}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = '';
                    if (file) {
                      setCropTarget('banner');
                      setCropFile(file);
                      setCropUrl(null);
                    }
                  }}
                />
              </label>
              {banner && (
                <button
                  type="button"
                  onClick={() => {
                    setCropTarget('banner');
                    setCropFile(null);
                    setCropUrl(banner.url);
                  }}
                  className="inline-flex items-center gap-2 border-2 border-[var(--mn-line)] px-3 py-2 font-pixel text-[11px] uppercase text-[var(--mn-paper)] hover:border-[var(--mn-yellow)]"
                  title="Reenquadra o banner atual arrastando, sem subir um arquivo novo"
                >
                  <Crop size={13} /> AJUSTAR BANNER
                </button>
              )}
            </div>
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
            Declaro que esta obra é de minha autoria original e não viola direitos de terceiros.
          </span>
        </label>

        {error && (
          <p role="alert" className="border-2 border-[var(--mn-red)] p-3 font-body text-sm text-[var(--mn-paper)]">
            {error}
          </p>
        )}
        {message && (
          <p role="status" className="border-2 border-[var(--mn-teal)] p-3 font-body text-sm text-[var(--mn-paper)]">
            {message}
          </p>
        )}

        <Button type="submit" variant="primary" disabled={saving}>
          {saving ? 'SALVANDO...' : editingId ? 'SALVAR CONFIGURAÇÃO DA OBRA' : 'LANÇAR OBRA NO CATÁLOGO'}
        </Button>
      </form>
      )}

      {(cropFile || cropUrl) && (
        <ImageCropper
          file={cropFile}
          sourceUrl={cropUrl}
          outputWidth={cropTarget === 'banner' ? 1600 : 900}
          outputHeight={cropTarget === 'banner' ? 900 : 1200}
          confirmLabel={cropTarget === 'banner' ? 'USAR ESTE BANNER' : 'USAR ESTA CAPA'}
          busy={saving}
          error={error}
          onCancel={() => {
            setCropFile(null);
            setCropUrl(null);
            setCropTarget(null);
          }}
          onConfirm={async (blob) => {
            const file = new File([blob], cropTarget === 'banner' ? 'banner.jpg' : 'cover.jpg', { type: 'image/jpeg' });
            if (cropTarget === 'banner') {
              await uploadBanner(file);
            } else {
              await uploadCover(file);
            }
            setCropFile(null);
            setCropUrl(null);
            setCropTarget(null);
          }}
        />
      )}
    </section>
  );
}

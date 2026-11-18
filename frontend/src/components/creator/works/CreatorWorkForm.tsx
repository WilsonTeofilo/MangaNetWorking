import { Crop, Upload } from 'lucide-react';
import { Button } from '../../ui/Button';
import { Field } from '../../ui/Field';
import { GENRES } from './useCreatorWorks';

export interface CreatorWorkFormProps {
  editingId: string | null;
  title: string;
  onTitleChange: (value: string) => void;
  synopsis: string;
  onSynopsisChange: (value: string) => void;
  genres: string[];
  onToggleGenre: (genre: string) => void;
  format: 'MANGA' | 'LIGHT_NOVEL';
  onFormatChange: (format: 'MANGA' | 'LIGHT_NOVEL') => void;
  status: 'ongoing' | 'draft' | 'completed';
  onStatusChange: (status: 'ongoing' | 'draft' | 'completed') => void;
  cover: { url: string; previewUrl: string } | null;
  banner: { url: string; previewUrl: string } | null;
  declared: boolean;
  onDeclaredChange: (declared: boolean) => void;
  saving: boolean;
  error: string | null;
  message: string | null;
  createdWorkId?: string | null;
  onNavigateToChapters?: (workId?: string) => void;
  onSubmit: (event: React.FormEvent) => void;
  onCancelEdit: () => void;
  onClose: () => void;
  onSelectCropFile: (target: 'cover' | 'banner', file: File) => void;
  onAdjustCrop: (target: 'cover' | 'banner', url: string) => void;
}

export function CreatorWorkForm({
  editingId,
  title,
  onTitleChange,
  synopsis,
  onSynopsisChange,
  genres,
  onToggleGenre,
  format,
  onFormatChange,
  status,
  onStatusChange,
  cover,
  banner,
  declared,
  onDeclaredChange,
  saving,
  error,
  message,
  createdWorkId,
  onNavigateToChapters,
  onSubmit,
  onCancelEdit,
  onClose,
  onSelectCropFile,
  onAdjustCrop,
}: CreatorWorkFormProps) {
  return (
    <form onSubmit={onSubmit} className="border-2 border-[var(--mn-line)] bg-[var(--mn-ink-2)] p-6 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-xl text-[var(--mn-paper)] uppercase">
          {editingId ? 'Configurar obra' : 'Lançar nova obra'}
        </h2>
        <div className="flex items-center gap-2">
          {editingId && (
            <Button type="button" variant="ghost" onClick={onCancelEdit}>
              CANCELAR EDIÇÃO
            </Button>
          )}
          <Button type="button" variant="ghost" onClick={onClose}>
            FECHAR
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <div className="space-y-4">
          <Field label="TÍTULO DA OBRA" value={title} onChange={(event) => onTitleChange(event.target.value)} />

          <div className="space-y-1.5">
            <label htmlFor="work-synopsis" className="font-body text-sm font-semibold text-[var(--mn-paper)] block">
              SINOPSE
            </label>
            <textarea
              id="work-synopsis"
              value={synopsis}
              onChange={(event) => onSynopsisChange(event.target.value)}
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
                  onClick={() => onToggleGenre(genre)}
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
                  onClick={() => onFormatChange(option)}
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
            {!editingId && (
              <p className="text-[10px] font-body text-[var(--mn-mute)] mt-1">
                {format === 'MANGA'
                  ? 'Mangá: capítulos publicados como páginas de imagem (JPG/PNG/WebP).'
                  : 'Light Novel: capítulos escritos em blocos de texto com editor visual.'}
              </p>
            )}
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
                    onClick={() => onStatusChange(option.value)}
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
            <label className="font-display text-xs uppercase text-[var(--mn-mute)] tracking-wider block">
              CAPA DA OBRA <span className="text-[var(--mn-red)]">*</span>
              <span className="ml-1 font-body normal-case text-[10px]">Retrato 2:3 — obrigatória</span>
            </label>
            {cover ? (
              <img
                src={cover.previewUrl}
                alt="Capa da obra"
                className="w-32 h-48 object-cover border-2 border-[var(--mn-line)]"
              />
            ) : (
              <p className="font-pixel text-[11px] uppercase text-[var(--mn-mute)]">Nenhum arquivo selecionado</p>
            )}
            <div className="flex flex-wrap gap-2">
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
                      onSelectCropFile('cover', file);
                    }
                  }}
                />
              </label>
              {cover && (
                <button
                  type="button"
                  onClick={() => onAdjustCrop('cover', cover.url)}
                  className="inline-flex items-center gap-2 border-2 border-[var(--mn-line)] px-3 py-2 font-pixel text-[11px] uppercase text-[var(--mn-paper)] hover:border-[var(--mn-yellow)]"
                  title="Reenquadra a capa atual arrastando, sem subir um arquivo novo"
                >
                  <Crop size={13} /> AJUSTAR CAPA
                </button>
              )}
            </div>
          </div>

          <div className="border-2 border-[var(--mn-line)] p-4 space-y-2">
            <p className="font-pixel text-[11px] uppercase text-[var(--mn-mute)]">BANNER (16:9)</p>
            {banner && (
              <img
                src={banner.previewUrl}
                alt="Banner da obra"
                className="w-full h-24 object-cover border-2 border-[var(--mn-line)]"
              />
            )}
            <div className="flex flex-wrap gap-2">
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
                      onSelectCropFile('banner', file);
                    }
                  }}
                />
              </label>
              {banner && (
                <button
                  type="button"
                  onClick={() => onAdjustCrop('banner', banner.url)}
                  className="inline-flex items-center gap-2 border-2 border-[var(--mn-line)] px-3 py-2 font-pixel text-[11px] uppercase text-[var(--mn-paper)] hover:border-[var(--mn-yellow)]"
                  title="Reenquadra o banner atual arrastando, sem subir um arquivo novo"
                >
                  <Crop size={13} /> AJUSTAR BANNER
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <label className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={declared}
          onChange={(event) => onDeclaredChange(event.target.checked)}
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

      {createdWorkId ? (
        <div
          role="status"
          className="border-2 border-[var(--mn-ok)] bg-[var(--mn-ok)]/10 p-3 font-body text-sm text-[var(--mn-paper)] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2">
            <span className="text-[var(--mn-ok)] font-semibold">✅ Obra criada!</span>
            <a
              href={`?aba=obras&obra=${createdWorkId}`}
              onClick={(e) => {
                if (onNavigateToChapters) {
                  e.preventDefault();
                  onNavigateToChapters(createdWorkId);
                }
              }}
              className="text-[var(--mn-yellow)] hover:underline inline-flex items-center gap-1 font-semibold"
            >
              Publique o primeiro capítulo agora →
            </a>
          </div>
        </div>
      ) : (
        message && (
          <p role="status" className="border-2 border-[var(--mn-ok)] p-3 font-body text-sm text-[var(--mn-paper)]">
            {message}
          </p>
        )
      )}

      <Button type="submit" variant="primary" disabled={saving}>
        {saving ? 'SALVANDO...' : editingId ? 'SALVAR CONFIGURAÇÃO DA OBRA' : 'LANÇAR OBRA NO CATÁLOGO'}
      </Button>
    </form>
  );
}

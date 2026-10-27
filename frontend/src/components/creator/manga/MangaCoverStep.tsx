import { RefObject } from 'react';
import { Crop } from 'lucide-react';
import { Button } from '../../ui/Button';

interface MangaCoverStepProps {
  coverFile: File | null;
  coverPreview: string | null;
  coverInputRef: RefObject<HTMLInputElement | null>;
  pickCover: (file: File | undefined) => void;
  setChapterCoverCropOpen: (open: boolean) => void;
}

export function MangaCoverStep({
  coverFile,
  coverPreview,
  coverInputRef,
  pickCover,
  setChapterCoverCropOpen,
}: MangaCoverStepProps) {
  return (
    <section className="border-2 border-[var(--mn-line)] bg-[var(--mn-ink-2)] p-5 space-y-4">
      <h3 className="font-display text-xl text-[var(--mn-paper)] uppercase">Capa do capítulo</h3>
      <p className="font-body text-xs text-[var(--mn-mute)]">
        Opcional: se você não enviar, o capítulo usa a capa da obra.
      </p>
      <div className="flex flex-wrap items-center gap-4">
        {coverPreview && (
          <img
            src={coverPreview}
            alt="Capa do capítulo"
            className="w-28 h-40 object-cover border-2 border-[var(--mn-yellow)]"
          />
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
  );
}

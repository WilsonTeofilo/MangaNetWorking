import { RefObject } from 'react';
import { Image as ImageIcon, Upload } from 'lucide-react';
import { Button } from '../../ui/Button';
import { PageItem } from './mangaEditorTypes';

interface MangaUploadStepProps {
  pages: PageItem[];
  dragging: boolean;
  setDragging: (dragging: boolean) => void;
  pagesInputRef: RefObject<HTMLInputElement | null>;
  addPages: (files: FileList | File[], advance?: boolean) => void;
}

export function MangaUploadStep({
  pages,
  dragging,
  setDragging,
  pagesInputRef,
  addPages,
}: MangaUploadStepProps) {
  return (
    <section className="border-2 border-[var(--mn-yellow)] bg-[var(--mn-ink-2)] p-5 space-y-4">
      <h3 className="font-display text-xl text-[var(--mn-paper)] uppercase">
        Envie as páginas do capítulo
      </h3>
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
    </section>
  );
}

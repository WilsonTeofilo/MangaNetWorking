import { RefObject } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  CornerDownLeft,
  GripVertical,
  Plus,
  Trash2,
} from 'lucide-react';
import { Button } from '../../ui/Button';
import { PageItem } from './mangaEditorTypes';

interface MangaOrganizeStepProps {
  pages: PageItem[];
  jumpTo: string;
  setJumpTo: (val: string) => void;
  jumpToPage: () => void;
  pagesInputRef: RefObject<HTMLInputElement | null>;
  pageRefs: RefObject<Record<string, HTMLLIElement | null>>;
  addPages: (files: FileList | File[], advance?: boolean) => void;
  movePage: (index: number, direction: -1 | 1) => void;
  removePage: (key: string) => void;
  reorderByDrag: (from: number, to: number) => void;
  dragIndex: number | null;
  setDragIndex: (idx: number | null) => void;
  overIndex: number | null;
  setOverIndex: (idx: number | null) => void;
  setPreview: (page: PageItem) => void;
}

export function MangaOrganizeStep({
  pages,
  jumpTo,
  setJumpTo,
  jumpToPage,
  pagesInputRef,
  pageRefs,
  addPages,
  movePage,
  removePage,
  reorderByDrag,
  dragIndex,
  setDragIndex,
  overIndex,
  setOverIndex,
  setPreview,
}: MangaOrganizeStepProps) {
  return (
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
              if (pageRefs.current) {
                pageRefs.current[page.key] = element;
              }
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
    </section>
  );
}

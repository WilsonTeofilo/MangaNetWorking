import { X } from 'lucide-react';
import { EditorBlock, getSeparatorGlyph } from './novelEditorTypes';

interface NovelReaderPreviewModalProps {
  isOpen: boolean;
  chapterTitle: string;
  blocks: EditorBlock[];
  onClose: () => void;
}

export function NovelReaderPreviewModal({
  isOpen,
  chapterTitle,
  blocks,
  onClose,
}: NovelReaderPreviewModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col p-4 sm:p-6 overflow-y-auto">
      <div className="max-w-2xl mx-auto w-full space-y-6">
        <div className="flex items-center justify-between border-b border-[var(--mn-line)] pb-3">
          <span className="font-pixel text-[12px] text-[var(--mn-yellow)] uppercase">PRÉVIA DO LEITOR</span>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:text-[var(--mn-yellow)]"
            aria-label="Fechar prévia"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-4 font-serif text-lg leading-relaxed text-[var(--mn-paper)]">
          <h1 className="font-display text-3xl mb-6">{chapterTitle}</h1>
          {blocks.map((b) => (
            <div key={b.key}>
              {b.type === 'text' && <p className="mb-4 whitespace-pre-wrap">{b.text}</p>}
              {b.type === 'illustration' && b.previewUrl && (
                <figure className="my-6 text-center">
                  <img src={b.previewUrl} alt={b.altText} className="mx-auto rounded-[2px] max-h-[70vh]" />
                  {b.altText && <figcaption className="text-xs font-body text-[var(--mn-mute)] mt-2">{b.altText}</figcaption>}
                </figure>
              )}
              {b.type === 'separator' && (
                <div className="my-8 text-center text-[var(--mn-yellow)] tracking-[0.4em]">
                  {getSeparatorGlyph(b.style)}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

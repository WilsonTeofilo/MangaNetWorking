import React from 'react';
import {
  ArrowDown,
  ArrowUp,
  Image as ImageIcon,
  Loader2,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  EditorBlock,
  IllustrationEditorBlock,
  SEPARATOR_LABEL,
  SeparatorEditorBlock,
  TextEditorBlock,
} from './novelEditorTypes';
import { countVisibleProseCharacters } from '../../../utils/proseEditorialPolicy';

interface NovelBlockItemProps {
  block: EditorBlock;
  index: number;
  totalBlocks: number;
  dragIndex: number | null;
  overIndex: number | null;
  textareaRef: (el: HTMLTextAreaElement | null) => void;
  fileInputRef: (el: HTMLInputElement | null) => void;
  /** Abre o seletor de arquivo nativo do bloco de ilustração. */
  onClickFileInput: () => void;
  onUpdate: (updater: (b: EditorBlock) => EditorBlock) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onUploadIllustration: (file: File) => void;
}

export function NovelBlockItem({
  block,
  index,
  totalBlocks,
  dragIndex,
  overIndex,
  textareaRef,
  fileInputRef,
  onClickFileInput,
  onUpdate,
  onMoveUp,
  onMoveDown,
  onRemove,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onUploadIllustration,
}: NovelBlockItemProps) {
  const isDragging = dragIndex === index;
  const isOver = overIndex === index;

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={`group relative border-2 transition-all ${
        isDragging
          ? 'opacity-30 border-[var(--mn-yellow)]'
          : isOver
            ? 'border-[var(--mn-yellow)] bg-[var(--mn-ink-2)] scale-[1.01]'
            : 'border-[var(--mn-line)] bg-[var(--mn-ink)] hover:border-[var(--mn-paper-muted)]'
      }`}
    >
      {/* Cabeçalho do Bloco */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[var(--mn-line)] bg-[var(--mn-ink-2)] text-xs font-mono text-[var(--mn-mute)] select-none">
        <div className="flex items-center gap-2 cursor-grab active:cursor-grabbing">
          <span className="font-bold text-[var(--mn-paper)]">#{index + 1}</span>
          <span>
            {block.type === 'text' && 'PARÁGRAFO'}
            {block.type === 'illustration' && 'ILUSTRAÇÃO'}
            {block.type === 'separator' && 'SEPARADOR DE CENA'}
          </span>
          {block.type === 'text' && (
            <span className="text-[10px] text-[var(--mn-mute)]">
              ({countVisibleProseCharacters(block.text)} caracteres)
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={index === 0}
            title="Mover para cima"
            className="p-1 hover:text-[var(--mn-yellow)] disabled:opacity-20"
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={index === totalBlocks - 1}
            title="Mover para baixo"
            className="p-1 hover:text-[var(--mn-yellow)] disabled:opacity-20"
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onRemove}
            title="Remover bloco"
            className="p-1 hover:text-[var(--mn-red)] text-[var(--mn-mute)]"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Conteúdo do Bloco */}
      <div className="p-3">
        {block.type === 'text' && (
          <textarea
            ref={textareaRef}
            value={block.text}
            onChange={(e) => onUpdate((b) => ({ ...(b as TextEditorBlock), text: e.target.value }))}
            placeholder="Digite os parágrafos da sua cena aqui..."
            rows={Math.max(3, Math.min(18, Math.ceil(block.text.length / 70)))}
            className="w-full bg-transparent font-serif text-base text-[var(--mn-paper)] placeholder:text-[var(--mn-mute)] focus:outline-none resize-y leading-relaxed"
          />
        )}

        {block.type === 'illustration' && (
          <div className="space-y-3">
            {block.uploading ? (
              <div className="h-44 border-2 border-dashed border-[var(--mn-yellow)] flex flex-col items-center justify-center gap-2 text-[var(--mn-yellow)] font-mono text-xs">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span>Enviando ilustração para o servidor seguro...</span>
              </div>
            ) : block.previewUrl ? (
              <div className="flex flex-col sm:flex-row gap-4 items-start">
                <div className="relative border-2 border-[var(--mn-line)] max-w-xs overflow-hidden bg-black">
                  <img
                    src={block.previewUrl}
                    alt={block.altText || 'Ilustração'}
                    className="max-h-56 object-contain"
                  />
                  <button
                    type="button"
                    onClick={onClickFileInput}
                    className="absolute top-1 right-1 bg-black/80 text-[var(--mn-paper)] p-1 hover:text-[var(--mn-yellow)]"
                    title="Trocar arquivo"
                  >
                    <Upload className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex-1 space-y-2 w-full">
                  <label className="block text-xs font-mono text-[var(--mn-mute)]">
                    LEGENDA / DESCRIÇÃO DE ACESSIBILIDADE (ALT TEXT)
                  </label>
                  <input
                    type="text"
                    value={block.altText}
                    onChange={(e) =>
                      onUpdate((b) => ({ ...(b as IllustrationEditorBlock), altText: e.target.value }))
                    }
                    placeholder="Ex: Yukio encarando a lâmina de Kiraya no pátio"
                    className="w-full bg-[var(--mn-ink-2)] border border-[var(--mn-line)] px-2.5 py-1.5 text-xs text-[var(--mn-paper)] focus:outline-none focus:border-[var(--mn-yellow)]"
                  />
                  <div className="flex items-center gap-2 text-xs font-mono text-[var(--mn-mute)] pt-1">
                    <span>Largura:</span>
                    <button
                      type="button"
                      onClick={() => onUpdate((b) => ({ ...(b as IllustrationEditorBlock), width: 100 }))}
                      className={`px-2 py-0.5 border ${
                        block.width === 100
                          ? 'border-[var(--mn-yellow)] text-[var(--mn-yellow)] font-bold'
                          : 'border-[var(--mn-line)]'
                      }`}
                    >
                      100% (Cheia)
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdate((b) => ({ ...(b as IllustrationEditorBlock), width: 75 }))}
                      className={`px-2 py-0.5 border ${
                        block.width === 75
                          ? 'border-[var(--mn-yellow)] text-[var(--mn-yellow)] font-bold'
                          : 'border-[var(--mn-line)]'
                      }`}
                    >
                      75%
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdate((b) => ({ ...(b as IllustrationEditorBlock), width: 50 }))}
                      className={`px-2 py-0.5 border ${
                        block.width === 50
                          ? 'border-[var(--mn-yellow)] text-[var(--mn-yellow)] font-bold'
                          : 'border-[var(--mn-line)]'
                      }`}
                    >
                      50% (Compacta)
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div
                onClick={onClickFileInput}
                className="h-32 border-2 border-dashed border-[var(--mn-line)] hover:border-[var(--mn-yellow)] flex flex-col items-center justify-center gap-2 cursor-pointer text-[var(--mn-mute)] hover:text-[var(--mn-paper)] transition-colors"
              >
                <ImageIcon className="w-6 h-6" />
                <span className="font-mono text-xs">Clique para selecionar uma imagem</span>
              </div>
            )}

            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              ref={fileInputRef}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onUploadIllustration(file);
              }}
              className="hidden"
            />
          </div>
        )}

        {block.type === 'separator' && (
          <div className="flex items-center justify-between py-2">
            <div className="font-display tracking-[0.3em] text-lg text-[var(--mn-yellow)] text-center flex-1">
              {SEPARATOR_LABEL[block.style].glyph}
            </div>
            <div className="flex items-center gap-1.5 text-xs font-mono text-[var(--mn-mute)]">
              {(['scene', 'time', 'pov', 'line'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => onUpdate((b) => ({ ...(b as SeparatorEditorBlock), style: s }))}
                  className={`px-2 py-0.5 border ${
                    block.style === s
                      ? 'border-[var(--mn-yellow)] text-[var(--mn-yellow)] font-bold'
                      : 'border-[var(--mn-line)]'
                  }`}
                >
                  {SEPARATOR_LABEL[s].label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

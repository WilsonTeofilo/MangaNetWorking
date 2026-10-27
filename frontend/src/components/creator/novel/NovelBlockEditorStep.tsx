import React from 'react';
import {
  AlertTriangle,
  ImagePlus,
  Minus,
  Plus,
  Upload,
} from 'lucide-react';
import {
  EditorBlock,
  newIllustrationBlock,
  newSeparatorBlock,
  newTextBlock,
} from './novelEditorTypes';
import { NovelBlockItem } from './NovelBlockItem';
import {
  ChapterType,
  PROSE_EDITORIAL_POLICY,
  ValidationResult,
} from '../../../utils/proseEditorialPolicy';

interface NovelBlockEditorStepProps {
  chapterType: ChapterType;
  blocks: EditorBlock[];
  totalChars: number;
  illustrationCount: number;
  editorial: ValidationResult;
  structureErrors: string[];
  fileDropActive: boolean;
  setFileDropActive: (active: boolean) => void;
  dragIndex: number | null;
  setDragIndex: (idx: number | null) => void;
  overIndex: number | null;
  setOverIndex: (idx: number | null) => void;
  textareaRefs: React.MutableRefObject<Record<string, HTMLTextAreaElement | null>>;
  blockInputRefs: React.MutableRefObject<Record<string, HTMLInputElement | null>>;
  updateBlock: (key: string, updater: (b: EditorBlock) => EditorBlock) => void;
  addBlockAt: (index: number, block: EditorBlock) => void;
  removeBlock: (key: string) => void;
  moveBlock: (from: number, to: number) => void;
  handleIllustrationUpload: (file: File, targetKey?: string, insertIndex?: number) => void;
}

export function NovelBlockEditorStep({
  chapterType,
  blocks,
  totalChars,
  illustrationCount,
  editorial,
  structureErrors,
  fileDropActive,
  setFileDropActive,
  dragIndex,
  setDragIndex,
  overIndex,
  setOverIndex,
  textareaRefs,
  blockInputRefs,
  updateBlock,
  addBlockAt,
  removeBlock,
  moveBlock,
  handleIllustrationUpload,
}: NovelBlockEditorStepProps) {
  const minChars = chapterType === 'REGULAR' ? PROSE_EDITORIAL_POLICY.minimum : PROSE_EDITORIAL_POLICY.specialMinimum;
  const targetMax = PROSE_EDITORIAL_POLICY.maximum;
  const targetMin = PROSE_EDITORIAL_POLICY.recommendedMinimum;
  const charPercent = Math.min(100, Math.round((totalChars / targetMax) * 100));

  return (
    <div className="space-y-6">
      {/* 1. Barra de Estatísticas da Política Editorial */}
      <div className="border-2 border-[var(--mn-line)] bg-[var(--mn-ink)] p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-3">
            <span className="text-[var(--mn-mute)] uppercase">CONTAGEM REAL:</span>
            <span className="font-bold text-base text-[var(--mn-yellow)] tabular-nums">
              {totalChars.toLocaleString()}
            </span>
            <span className="text-[var(--mn-mute)]">/ {targetMax.toLocaleString()} chars</span>
          </div>

          <div className="flex items-center gap-4">
            <span className={illustrationCount > 6 ? 'text-[var(--mn-red)] font-bold' : 'text-[var(--mn-mute)]'}>
              ILUSTRAÇÕES: <strong className="text-[var(--mn-paper)]">{illustrationCount}</strong> / 6
            </span>
            <span className="text-[var(--mn-mute)]">
              BLOCO(S): <strong className="text-[var(--mn-paper)]">{blocks.length}</strong>
            </span>
          </div>
        </div>

        {/* Barra de Progresso Visual */}
        <div className="h-2 w-full bg-[var(--mn-ink-2)] border border-[var(--mn-line)] overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              totalChars < minChars
                ? 'bg-[var(--mn-red)]'
                : totalChars < targetMin
                  ? 'bg-[var(--mn-yellow)]/60'
                  : totalChars <= targetMax
                    ? 'bg-[var(--mn-yellow)]'
                    : 'bg-[var(--mn-red)]'
            }`}
            style={{ width: `${charPercent}%` }}
          />
        </div>

        {/* Avisos Inline */}
        {(structureErrors.length > 0 || !editorial.valid) && (
          <div className="pt-1 text-xs font-mono space-y-1">
            {structureErrors.map((err: string, idx: number) => (
              <p key={idx} className="text-[var(--mn-red)] flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {err}
              </p>
            ))}
            {!editorial.valid &&
              editorial.errors.map((err: string, idx: number) => (
                <p key={idx} className="text-[var(--mn-red)] flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {err}
                </p>
              ))}
          </div>
        )}
      </div>

      {/* 2. Área Dropzone para arquivos soltos diretamente no documento */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setFileDropActive(true);
        }}
        onDragLeave={() => setFileDropActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setFileDropActive(false);
          const file = e.dataTransfer.files?.[0];
          if (file && (file.type === 'image/jpeg' || file.type === 'image/png' || file.type === 'image/webp')) {
            handleIllustrationUpload(file);
          }
        }}
        className={`border-2 border-dashed p-3 transition-colors text-center font-mono text-xs ${
          fileDropActive
            ? 'border-[var(--mn-yellow)] bg-[var(--mn-yellow)]/10 text-[var(--mn-yellow)]'
            : 'border-[var(--mn-line)] text-[var(--mn-mute)]'
        }`}
      >
        <Upload className="w-4 h-4 mx-auto mb-1 opacity-70" />
        <span>Arraste uma imagem (JPEG, PNG ou WebP) para este documento para inserir como ilustração</span>
      </div>

      {/* 3. Lista de Blocos Ordenados */}
      <div className="space-y-4">
        {blocks.map((block, index) => (
          <React.Fragment key={block.key}>
            <NovelBlockItem
              block={block}
              index={index}
              totalBlocks={blocks.length}
              dragIndex={dragIndex}
              overIndex={overIndex}
              textareaRef={(el) => (textareaRefs.current[block.key] = el)}
              fileInputRef={(el) => (blockInputRefs.current[block.key] = el)}
              onClickFileInput={() => blockInputRefs.current[block.key]?.click()}
              onUpdate={(updater) => updateBlock(block.key, updater)}
              onMoveUp={() => moveBlock(index, index - 1)}
              onMoveDown={() => moveBlock(index, index + 1)}
              onRemove={() => removeBlock(block.key)}
              onDragStart={(e) => {
                setDragIndex(index);
                e.dataTransfer.setData('text/plain', String(index));
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setOverIndex(index);
              }}
              onDrop={(e) => {
                e.preventDefault();
                const fromStr = e.dataTransfer.getData('text/plain');
                if (fromStr) {
                  const from = parseInt(fromStr, 10);
                  if (!isNaN(from)) moveBlock(from, index);
                }
                setDragIndex(null);
                setOverIndex(null);
              }}
              onDragEnd={() => {
                setDragIndex(null);
                setOverIndex(null);
              }}
              onUploadIllustration={(file) => handleIllustrationUpload(file, block.key)}
            />

            {/* Inserção Rápida entre blocos */}
            <div className="flex items-center justify-center gap-2 opacity-30 hover:opacity-100 transition-opacity py-1">
              <span className="text-[10px] font-mono text-[var(--mn-mute)]">+ INSERIR:</span>
              <button
                type="button"
                onClick={() => addBlockAt(index, newTextBlock())}
                className="px-2 py-0.5 border border-[var(--mn-line)] bg-[var(--mn-ink)] text-[10px] font-mono text-[var(--mn-paper)] hover:border-[var(--mn-yellow)]"
              >
                + Parágrafo
              </button>
              <button
                type="button"
                onClick={() => addBlockAt(index, newIllustrationBlock())}
                className="px-2 py-0.5 border border-[var(--mn-line)] bg-[var(--mn-ink)] text-[10px] font-mono text-[var(--mn-paper)] hover:border-[var(--mn-yellow)]"
              >
                + Ilustração
              </button>
              <button
                type="button"
                onClick={() => addBlockAt(index, newSeparatorBlock())}
                className="px-2 py-0.5 border border-[var(--mn-line)] bg-[var(--mn-ink)] text-[10px] font-mono text-[var(--mn-paper)] hover:border-[var(--mn-yellow)]"
              >
                + Separador
              </button>
            </div>
          </React.Fragment>
        ))}
      </div>

      {/* 4. Toolbar Final de Inserção */}
      <div className="p-4 border-2 border-dashed border-[var(--mn-line)] bg-[var(--mn-ink-2)] flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => addBlockAt(blocks.length - 1, newTextBlock())}
          className="inline-flex items-center gap-1.5 px-3 py-2 border-2 border-[var(--mn-line)] bg-[var(--mn-ink)] text-xs font-mono text-[var(--mn-paper)] hover:border-[var(--mn-yellow)] hover:text-[var(--mn-yellow)] transition-all"
        >
          <Plus className="w-4 h-4" /> ADICIONAR PARÁGRAFO
        </button>
        <button
          type="button"
          onClick={() => addBlockAt(blocks.length - 1, newIllustrationBlock())}
          className="inline-flex items-center gap-1.5 px-3 py-2 border-2 border-[var(--mn-line)] bg-[var(--mn-ink)] text-xs font-mono text-[var(--mn-paper)] hover:border-[var(--mn-yellow)] hover:text-[var(--mn-yellow)] transition-all"
        >
          <ImagePlus className="w-4 h-4" /> ADICIONAR ILUSTRAÇÃO
        </button>
        <button
          type="button"
          onClick={() => addBlockAt(blocks.length - 1, newSeparatorBlock())}
          className="inline-flex items-center gap-1.5 px-3 py-2 border-2 border-[var(--mn-line)] bg-[var(--mn-ink)] text-xs font-mono text-[var(--mn-paper)] hover:border-[var(--mn-yellow)] hover:text-[var(--mn-yellow)] transition-all"
        >
          <Minus className="w-4 h-4" /> SEPARADOR DE CENA
        </button>
      </div>
    </div>
  );
}

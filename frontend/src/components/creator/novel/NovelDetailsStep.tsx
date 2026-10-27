import React from 'react';
import { Upload } from 'lucide-react';
import { CHAPTER_TYPE_LABEL } from './novelEditorTypes';
import { ChapterType } from '../../../utils/proseEditorialPolicy';
import { Field } from '../../ui/Field';

interface NovelDetailsStepProps {
  chapterType: ChapterType;
  setChapterType: (type: ChapterType) => void;
  chapterTitle: string;
  setChapterTitle: (title: string) => void;
  releaseDate: string;
  setReleaseDate: (date: string) => void;
  coverPreview: string | null;
  coverInputRef: React.RefObject<HTMLInputElement | null>;
  onCoverFileSelected: (file: File) => void;
  onOpenCrop: () => void;
  onRemoveCover: () => void;
  titleError: string | null;
  typeError: string | null;
  prologueTaken: boolean;
  editingNumber?: number | null;
  nextChapterNumber: number;
  markDirty: () => void;
}

export function NovelDetailsStep({
  chapterType,
  setChapterType,
  chapterTitle,
  setChapterTitle,
  releaseDate,
  setReleaseDate,
  coverPreview,
  coverInputRef,
  onCoverFileSelected,
  onOpenCrop,
  onRemoveCover,
  titleError,
  typeError,
  prologueTaken,
  editingNumber,
  nextChapterNumber,
  markDirty,
}: NovelDetailsStepProps) {
  const isEditing = editingNumber !== null && editingNumber !== undefined;

  return (
    <div className="space-y-6 max-w-2xl">
      {/* 1. Tipo de Capítulo */}
      <div>
        <label className="block font-mono text-xs text-[var(--mn-mute)] uppercase tracking-wider mb-2">
          TIPO DE CAPÍTULO
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(['REGULAR', 'PROLOGUE', 'SPECIAL'] as const).map((t) => {
            const disabled = t === 'PROLOGUE' && prologueTaken;
            const selected = chapterType === t;
            return (
              <button
                key={t}
                type="button"
                disabled={disabled}
                onClick={() => {
                  setChapterType(t);
                  markDirty();
                }}
                className={`p-3 border-2 text-left transition-all ${
                  selected
                    ? 'border-[var(--mn-yellow)] bg-[var(--mn-yellow)] text-black font-bold shadow-[2px_2px_0_var(--mn-paper)]'
                    : disabled
                      ? 'border-[var(--mn-line)] opacity-40 cursor-not-allowed bg-[var(--mn-ink-2)] text-[var(--mn-mute)]'
                      : 'border-[var(--mn-line)] bg-[var(--mn-ink)] text-[var(--mn-paper)] hover:border-[var(--mn-paper-muted)]'
                }`}
              >
                <div className="font-display text-sm uppercase">{CHAPTER_TYPE_LABEL[t]}</div>
                <div className="text-[11px] font-mono mt-1 opacity-80">
                  {t === 'REGULAR' && '6k-18k recomendados'}
                  {t === 'PROLOGUE' && 'Capítulo 0 narrativo'}
                  {t === 'SPECIAL' && 'Mínimo de 300 chars'}
                </div>
              </button>
            );
          })}
        </div>
        {typeError && <p className="text-xs font-mono text-[var(--mn-red)] mt-1.5">{typeError}</p>}
      </div>

      {/* 2. Título do Capítulo */}
      <div>
        <Field
          label="TÍTULO DO CAPÍTULO"
          value={chapterTitle}
          onChange={(e) => {
            setChapterTitle(e.target.value);
            markDirty();
          }}
          placeholder="Ex: O despertar da cicatriz"
          error={titleError ?? undefined}
          required
        />
        <p className="text-[11px] font-mono text-[var(--mn-mute)] mt-1">
          {isEditing
            ? `Editando capítulo #${editingNumber}`
            : chapterType === 'PROLOGUE'
              ? 'Será indexado como Capítulo 0'
              : `Será indexado como Capítulo ${nextChapterNumber}`}
        </p>
      </div>

      {/* 3. Agendamento Opcional */}
      <div>
        <Field
          label="DATA E HORA DE LANÇAMENTO (OPCIONAL)"
          type="datetime-local"
          value={releaseDate}
          onChange={(e) => {
            setReleaseDate(e.target.value);
            markDirty();
          }}
        />
        <p className="text-[11px] font-mono text-[var(--mn-mute)] mt-1">
          Deixe vazio ou com horário atual para publicar imediatamente. Se no futuro, ficará agendado para membros/público.
        </p>
      </div>

      {/* 4. Capa Opcional do Capítulo */}
      <div>
        <label className="block font-mono text-xs text-[var(--mn-mute)] uppercase tracking-wider mb-2">
          CAPA DO CAPÍTULO (OPCIONAL)
        </label>
        <div className="flex items-center gap-4">
          {coverPreview ? (
            <div className="relative border-2 border-[var(--mn-line)] w-28 h-40 overflow-hidden bg-black group">
              <img src={coverPreview} alt="Capa" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={onOpenCrop}
                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center font-mono text-[10px] text-[var(--mn-paper)] transition-opacity"
              >
                Reajustar
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => coverInputRef.current?.click()}
              className="w-28 h-40 border-2 border-dashed border-[var(--mn-line)] hover:border-[var(--mn-yellow)] flex flex-col items-center justify-center gap-2 font-mono text-[10px] text-[var(--mn-mute)] hover:text-[var(--mn-paper)] transition-colors"
            >
              <Upload className="w-5 h-5" />
              <span>Enviar capa</span>
            </button>
          )}

          <div className="space-y-2 text-xs font-mono text-[var(--mn-mute)]">
            <p>Se não enviar, a light novel usará a capa principal da obra.</p>
            {coverPreview && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => coverInputRef.current?.click()}
                  className="underline hover:text-[var(--mn-paper)]"
                >
                  Trocar arquivo
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={onRemoveCover}
                  className="text-[var(--mn-red)] underline"
                >
                  Remover
                </button>
              </div>
            )}
          </div>
        </div>

        <input
          ref={coverInputRef as React.RefObject<HTMLInputElement>}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onCoverFileSelected(file);
          }}
          className="hidden"
        />
      </div>
    </div>
  );
}

import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Save,
  X,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { ImageCropper } from '../common/ImageCropper';
import {
  ChapterDraft,
  STEPS,
  getSeparatorGlyph,
} from './novel/novelEditorTypes';
import { useLightNovelEditor } from './novel/useLightNovelEditor';
import { NovelDetailsStep } from './novel/NovelDetailsStep';
import { NovelBlockEditorStep } from './novel/NovelBlockEditorStep';
import { NovelReviewStep } from './novel/NovelReviewStep';
import { NovelPublishStep } from './novel/NovelPublishStep';

export { type ChapterDraft } from './novel/novelEditorTypes';

interface LightNovelChapterWizardProps {
  workId: string;
  workTitle: string;
  nextChapterNumber: number;
  existingChapterNumbers?: number[];
  editingNumber?: number | null;
  draft?: ChapterDraft | null;
  onSaved?: () => void;
  onCancel?: () => void;
}

export function LightNovelChapterWizard({
  workId,
  workTitle,
  nextChapterNumber,
  existingChapterNumbers = [],
  editingNumber,
  draft,
  onSaved,
  onCancel,
}: LightNovelChapterWizardProps) {
  const editor = useLightNovelEditor({
    workId,
    nextChapterNumber,
    draft,
    editingNumber,
    existingChapterNumbers,
    onSaved,
  });

  const isEditing = editingNumber !== null && editingNumber !== undefined;
  const canPublish =
    !editor.titleError &&
    !editor.typeError &&
    editor.structureErrors.length === 0 &&
    editor.editorial.valid &&
    !editor.uploading;

  return (
    <div className="space-y-6">
      {/* 1. Header do Wizard e Barra de Navegação de Steps */}
      <div className="border-b-2 border-[var(--mn-line)] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="font-mono text-xs text-[var(--mn-yellow)] uppercase tracking-wider block">
            {isEditing ? `EDITANDO CAPÍTULO #${editingNumber}` : 'NOVO CAPÍTULO DE LIGHT NOVEL'}
          </span>
          <h2 className="font-display text-2xl text-[var(--mn-paper)] uppercase">{workTitle}</h2>
        </div>

        {/* Indicador de Etapas */}
        <div className="flex items-center gap-1 sm:gap-2">
          {STEPS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => editor.setStep(s.id)}
              className={`px-3 py-1.5 font-display text-xs uppercase border-2 transition-all ${
                editor.step === s.id
                  ? 'border-[var(--mn-yellow)] bg-[var(--mn-yellow)] text-black font-bold shadow-[2px_2px_0_var(--mn-paper)]'
                  : editor.step > s.id
                    ? 'border-[var(--mn-line)] bg-[var(--mn-ink-2)] text-[var(--mn-paper)]'
                    : 'border-transparent text-[var(--mn-mute)] hover:border-[var(--mn-line)]'
              }`}
            >
              {s.id}. {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Barra de Alertas: Rascunho Recuperável / Feedback de Autosave */}
      {editor.recoverable && (
        <div className="border-2 border-[var(--mn-yellow)] bg-[var(--mn-yellow)]/10 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
          <span className="text-[var(--mn-paper)] flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-[var(--mn-yellow)] shrink-0" />
            Rascunho não salvo encontrado de {new Date(editor.recoverable.savedAt).toLocaleTimeString('pt-BR')}.
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={editor.restoreDraft}
              className="px-2.5 py-1 bg-[var(--mn-yellow)] text-black font-bold hover:bg-white"
            >
              Restaurar rascunho
            </button>
            <button
              type="button"
              onClick={editor.discardStoredDraft}
              className="px-2.5 py-1 border border-[var(--mn-line)] text-[var(--mn-mute)] hover:text-[var(--mn-paper)]"
            >
              Descartar
            </button>
          </div>
        </div>
      )}

      {editor.error && (
        <div className="border-2 border-[var(--mn-red)] bg-[var(--mn-red)]/10 p-3 text-xs font-mono text-[var(--mn-red)] flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {editor.error}
        </div>
      )}

      {editor.success && (
        <div className="border-2 border-[var(--mn-green)] bg-[var(--mn-green)]/10 p-3 text-xs font-mono text-[var(--mn-green)]">
          {editor.success}
        </div>
      )}

      {/* 3. Renderização Modular da Etapa Atual */}
      <div className="py-2">
        {editor.step === 1 && (
          <NovelDetailsStep
            chapterType={editor.chapterType}
            setChapterType={editor.setChapterType}
            chapterTitle={editor.chapterTitle}
            setChapterTitle={editor.setChapterTitle}
            releaseDate={editor.releaseDate}
            setReleaseDate={editor.setReleaseDate}
            coverPreview={editor.coverPreview}
            coverInputRef={editor.coverInputRef}
            onCoverFileSelected={(file) => {
              editor.setCoverFile(file);
              editor.setCoverPreview(URL.createObjectURL(file));
              editor.markDirty();
            }}
            onOpenCrop={() => editor.setCoverCropOpen(true)}
            onRemoveCover={() => {
              editor.setCoverFile(null);
              editor.setCoverPreview(null);
              editor.setCoverUrl(null);
              editor.markDirty();
            }}
            titleError={editor.titleError}
            typeError={editor.typeError}
            prologueTaken={editor.prologueTaken}
            editingNumber={editingNumber}
            nextChapterNumber={nextChapterNumber}
            markDirty={editor.markDirty}
          />
        )}

        {editor.step === 2 && (
          <NovelBlockEditorStep
            chapterType={editor.chapterType}
            blocks={editor.blocks}
            totalChars={editor.totalChars}
            illustrationCount={editor.illustrationCount}
            editorial={editor.editorial}
            structureErrors={editor.structureErrors}
            fileDropActive={editor.fileDropActive}
            setFileDropActive={editor.setFileDropActive}
            dragIndex={editor.dragIndex}
            setDragIndex={editor.setDragIndex}
            overIndex={editor.overIndex}
            setOverIndex={editor.setOverIndex}
            textareaRefs={editor.textareaRefs}
            blockInputRefs={editor.blockInputRefs}
            updateBlock={editor.updateBlock}
            addBlockAt={editor.addBlockAt}
            removeBlock={editor.removeBlock}
            moveBlock={editor.moveBlock}
            handleIllustrationUpload={editor.handleIllustrationUpload}
          />
        )}

        {editor.step === 3 && (
          <NovelReviewStep
            chapterTitle={editor.chapterTitle}
            chapterType={editor.chapterType}
            totalChars={editor.totalChars}
            illustrationCount={editor.illustrationCount}
            textBlockCount={editor.textBlockCount}
            blocks={editor.blocks}
            editorial={editor.editorial}
            structureErrors={editor.structureErrors}
            isScheduled={editor.isScheduled}
            scheduledDate={editor.scheduledDate}
            onOpenPreview={() => editor.setShowPreview(true)}
          />
        )}

        {editor.step === 4 && (
          <NovelPublishStep
            busy={editor.busy}
            isEditing={isEditing}
            isScheduled={editor.isScheduled}
            scheduledDate={editor.scheduledDate}
            onPublish={editor.handlePublish}
            canPublish={canPublish}
          />
        )}
      </div>

      {/* 4. Rodapé de Navegação do Wizard */}
      <div className="border-t-2 border-[var(--mn-line)] pt-4 flex items-center justify-between">
        <div>
          {editor.step > 1 ? (
            <Button
              variant="ghost"
              onClick={() => editor.setStep((s) => s - 1)}
              className="inline-flex items-center gap-1.5"
            >
              <ChevronLeft className="w-4 h-4" /> VOLTAR
            </Button>
          ) : (
            onCancel && (
              <Button variant="ghost" onClick={onCancel}>
                CANCELAR
              </Button>
            )
          )}
        </div>

        <div className="flex items-center gap-3">
          {editor.savedAt && (
            <span className="text-[11px] font-mono text-[var(--mn-mute)] flex items-center gap-1">
              <Save className="w-3.5 h-3.5" /> Salvo às {editor.savedAt.toLocaleTimeString('pt-BR')}
            </span>
          )}

          {editor.step < 4 && (
            <Button
              variant="primary"
              onClick={() => editor.setStep((s) => s + 1)}
              className="inline-flex items-center gap-1.5 !px-6"
            >
              AVANÇAR <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Modal de Crop de Capa */}
      {editor.coverCropOpen && editor.coverPreview && (
        <ImageCropper
          sourceUrl={editor.coverPreview}
          outputWidth={600}
          outputHeight={800}
          onConfirm={(blob: Blob) => {
            const file = new File([blob], 'cover.jpg', { type: 'image/jpeg' });
            editor.setCoverFile(file);
            editor.setCoverPreview(URL.createObjectURL(blob));
            editor.setCoverCropOpen(false);
            editor.markDirty();
          }}
          onCancel={() => editor.setCoverCropOpen(false)}
        />
      )}

      {/* Modal de Prévia Fiel */}
      {editor.showPreview && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col p-4 sm:p-6 overflow-y-auto">
          <div className="max-w-2xl mx-auto w-full space-y-6">
            <div className="flex items-center justify-between border-b border-[var(--mn-line)] pb-3">
              <span className="font-mono text-xs text-[var(--mn-yellow)] uppercase">PRÉVIA DO LEITOR</span>
              <button
                type="button"
                onClick={() => editor.setShowPreview(false)}
                className="p-1 hover:text-[var(--mn-yellow)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4 font-serif text-lg leading-relaxed text-[var(--mn-paper)]">
              <h1 className="font-display text-3xl mb-6">{editor.chapterTitle}</h1>
              {editor.blocks.map((b) => (
                <div key={b.key}>
                  {b.type === 'text' && <p className="mb-4 whitespace-pre-wrap">{b.text}</p>}
                  {b.type === 'illustration' && b.previewUrl && (
                    <figure className="my-6 text-center">
                      <img src={b.previewUrl} alt={b.altText} className="mx-auto rounded max-h-[70vh]" />
                      {b.altText && <figcaption className="text-xs font-mono text-[var(--mn-mute)] mt-2">{b.altText}</figcaption>}
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
      )}
    </div>
  );
}

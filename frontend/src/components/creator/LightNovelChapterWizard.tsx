import { useLightNovelEditor } from './novel/useLightNovelEditor';
import { NovelWizardHeader } from './novel/NovelWizardHeader';
import { NovelWizardAlerts } from './novel/NovelWizardAlerts';
import { NovelWizardFooter } from './novel/NovelWizardFooter';
import { NovelDetailsStep } from './novel/NovelDetailsStep';
import { NovelBlockEditorStep } from './novel/NovelBlockEditorStep';
import { NovelReviewStep } from './novel/NovelReviewStep';
import { NovelPublishStep } from './novel/NovelPublishStep';
import { NovelReaderPreviewModal } from './novel/NovelReaderPreviewModal';

export { type ChapterDraft } from './novel/novelEditorTypes';

interface LightNovelChapterWizardProps {
  workId: string;
  workTitle: string;
  nextChapterNumber: number;
  existingChapterNumbers?: number[];
  editingNumber?: number | null;
  draft?: import('./novel/novelEditorTypes').ChapterDraft | null;
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
      <NovelWizardHeader
        workTitle={workTitle}
        isEditing={isEditing}
        editingNumber={editingNumber}
        currentStep={editor.step}
        maxStep={editor.maxStep}
        onGoToStep={editor.goToStep}
      />

      {/* 2. Barra de Alertas: Rascunho Recuperável / Feedback de Autosave */}
      <NovelWizardAlerts
        recoverable={editor.recoverable}
        onRestoreDraft={editor.restoreDraft}
        onDiscardDraft={editor.discardStoredDraft}
        error={editor.error}
        success={editor.success}
      />

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
            onCoverFileSelected={editor.selectCoverFile}
            onOpenCrop={() => editor.setCoverCropOpen(true)}
            onRemoveCover={editor.removeCover}
            cropOpen={editor.coverCropOpen}
            onCloseCrop={() => editor.setCoverCropOpen(false)}
            onCropConfirmed={editor.cropConfirmed}
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
      <NovelWizardFooter
        currentStep={editor.step}
        maxStep={editor.maxStep}
        savedAt={editor.savedAt}
        onGoToStep={editor.goToStep}
        onCancel={onCancel}
      />

      {/* Modal de Prévia Fiel */}
      <NovelReaderPreviewModal
        isOpen={editor.showPreview}
        chapterTitle={editor.chapterTitle}
        blocks={editor.blocks}
        onClose={() => editor.setShowPreview(false)}
      />
    </div>
  );
}

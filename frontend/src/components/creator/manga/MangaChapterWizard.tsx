import { Check, ChevronLeft, ChevronRight, Pencil, X, ZoomIn } from 'lucide-react';
import { Button } from '../../ui/Button';
import { ImageCropper } from '../../common/ImageCropper';
import { storageApi } from '../../../api/storageApi';
import { MANGA_WIZARD_STEPS } from './mangaEditorTypes';
import { useMangaChapterEditor, UseMangaChapterEditorProps } from './useMangaChapterEditor';
import { MangaUploadStep } from './MangaUploadStep';
import { MangaOrganizeStep } from './MangaOrganizeStep';
import { MangaCoverStep } from './MangaCoverStep';
import { MangaReviewStep } from './MangaReviewStep';
import { MangaPublishStep } from './MangaPublishStep';

export function MangaChapterWizard(props: UseMangaChapterEditorProps) {
  const editor = useMangaChapterEditor(props);

  return (
    <div className="space-y-6">
      {editor.isEditing ? (
        <p className="flex flex-wrap items-center gap-2 border-2 border-[var(--mn-teal)] bg-[var(--mn-teal)]/15 px-3 py-2 font-pixel text-[11px] uppercase text-[var(--mn-teal)]">
          <Pencil size={13} /> MODO EDIÇÃO · capítulo {props.draft?.chapterNumber} de “{props.workTitle}” — todas as etapas liberadas
        </p>
      ) : (
        <p className="font-pixel text-[11px] uppercase text-[var(--mn-mute)]">
          Publicando em <span className="text-[var(--mn-yellow)]">{props.workTitle}</span> · capítulo {props.nextChapterNumber} · mangá (páginas)
        </p>
      )}

      {/* Checklist de publicação */}
      <nav aria-label="Etapas de publicação do capítulo" className="border-2 border-[var(--mn-line)] bg-[var(--mn-ink-2)] p-4">
        <ol className="grid sm:grid-cols-5 gap-2">
          {MANGA_WIZARD_STEPS.map((item) => {
            const state = editor.checklist.find((entry) => entry.id === item.id);
            const active = editor.step === item.id;
            const locked = item.id > editor.maxStep;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  disabled={locked}
                  onClick={() => editor.goToStep(item.id)}
                  className={`w-full text-left p-2.5 border-2 transition-all ${
                    active
                      ? 'border-[var(--mn-yellow)] bg-[var(--mn-ink)] shadow-[2px_2px_0_var(--mn-yellow)]'
                      : locked
                        ? 'border-[var(--mn-line)] opacity-40 cursor-not-allowed'
                        : 'border-[var(--mn-line)] hover:border-[var(--mn-paper)]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-pixel text-[11px] uppercase text-[var(--mn-mute)]">{item.id}.</span>
                    {state?.ok && <Check size={14} className="text-[var(--mn-teal)]" />}
                  </div>
                  <p className="font-display text-xs text-[var(--mn-paper)] uppercase mt-1 truncate">{item.label}</p>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      {/* ETAPA 1 — Upload */}
      {editor.step === 1 && (
        <MangaUploadStep
          pages={editor.pages}
          dragging={editor.dragging}
          setDragging={editor.setDragging}
          pagesInputRef={editor.pagesInputRef}
          addPages={editor.addPages}
        />
      )}

      {/* ETAPA 2 — Organizar páginas */}
      {editor.step === 2 && (
        <MangaOrganizeStep
          pages={editor.pages}
          jumpTo={editor.jumpTo}
          setJumpTo={editor.setJumpTo}
          jumpToPage={editor.jumpToPage}
          pagesInputRef={editor.pagesInputRef}
          pageRefs={editor.pageRefs}
          addPages={editor.addPages}
          movePage={editor.movePage}
          removePage={editor.removePage}
          reorderByDrag={editor.reorderByDrag}
          dragIndex={editor.dragIndex}
          setDragIndex={editor.setDragIndex}
          overIndex={editor.overIndex}
          setOverIndex={editor.setOverIndex}
          setPreview={editor.setPreview}
        />
      )}

      {/* ETAPA 3 — Capa do capítulo */}
      {editor.step === 3 && (
        <MangaCoverStep
          coverFile={editor.coverFile}
          coverPreview={editor.coverPreview}
          coverInputRef={editor.coverInputRef}
          pickCover={editor.pickCover}
          setChapterCoverCropOpen={editor.setChapterCoverCropOpen}
        />
      )}

      {/* ETAPA 4 — Revisar */}
      {editor.step === 4 && (
        <MangaReviewStep
          workTitle={props.workTitle}
          nextChapterNumber={props.nextChapterNumber}
          chapterTitle={editor.chapterTitle}
          setChapterTitle={editor.setChapterTitle}
          releaseDate={editor.releaseDate}
          setReleaseDate={editor.setReleaseDate}
          pages={editor.pages}
          coverFile={editor.coverFile}
        />
      )}

      {/* ETAPA 5 — Publicar */}
      {editor.step === 5 && (
        <MangaPublishStep
          workTitle={props.workTitle}
          releaseDate={editor.releaseDate}
          busy={editor.busy}
          publish={editor.publish}
        />
      )}

      {/* Navegação entre etapas */}
      <div className="flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="ghost"
          onClick={() => editor.goToStep(editor.step - 1)}
          disabled={editor.step <= 1}
        >
          <ChevronLeft size={14} /> VOLTAR
        </Button>
        <span className="font-pixel text-[11px] uppercase text-[var(--mn-mute)]">
          Etapa {editor.step} de 5
        </span>
        <Button
          type="button"
          variant="ghost"
          onClick={() => editor.goToStep(editor.step + 1)}
          disabled={editor.step >= editor.maxStep}
        >
          AVANÇAR <ChevronRight size={14} />
        </Button>
      </div>

      {editor.error && (
        <p role="alert" className="border-2 border-[var(--mn-red)] bg-[var(--mn-ink-2)] p-3 font-body text-sm text-[var(--mn-paper)]">
          {editor.error}
        </p>
      )}
      {editor.success && (
        <p role="status" className="border-2 border-[var(--mn-teal)] bg-[var(--mn-ink-2)] p-3 font-body text-sm text-[var(--mn-paper)]">
          {editor.success}
        </p>
      )}

      {/* Recorte da capa do capítulo */}
      {editor.chapterCoverCropOpen && editor.coverPreview && (
        <ImageCropper
          sourceUrl={editor.coverPreview}
          outputWidth={900}
          outputHeight={1200}
          confirmLabel="USAR ESTA CAPA"
          busy={editor.busy}
          error={editor.error}
          onCancel={() => editor.setChapterCoverCropOpen(false)}
          onConfirm={async (blob) => {
            const file = new File([blob], 'chapter-cover.jpg', { type: 'image/jpeg' });
            const stored = await storageApi.uploadFile(file);
            editor.setCoverUrl(stored.url);
            editor.setCoverPreview(stored.url);
            editor.setChapterCoverCropOpen(false);
          }}
        />
      )}

      {/* Preview ampliada da página */}
      {editor.preview && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Pré-visualização da página ${editor.pages.findIndex((item) => item.key === editor.preview?.key) + 1}`}
          className="fixed inset-0 z-[120] bg-black/85 flex items-center justify-center p-6"
          onClick={() => editor.setPreview(null)}
        >
          <div className="relative max-h-full overflow-auto" onClick={(event) => event.stopPropagation()}>
            <img src={editor.preview.previewUrl} alt="Página ampliada" className="max-h-[80vh] object-contain" />
            <button
              type="button"
              onClick={() => editor.setPreview(null)}
              className="absolute top-2 right-2 p-2 bg-[var(--mn-ink)] border-2 border-[var(--mn-paper)] text-[var(--mn-paper)]"
              aria-label="Fechar pré-visualização"
            >
              <X size={16} />
            </button>
            <p className="mt-2 font-pixel text-[11px] uppercase text-[var(--mn-paper)] flex items-center gap-1">
              <ZoomIn size={12} /> Pág {editor.pages.findIndex((item) => item.key === editor.preview?.key) + 1}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

import { BookMarked } from 'lucide-react';
import { ImageCropper } from '../components/common/ImageCropper';
import { useCreatorWorks } from '../components/creator/works/useCreatorWorks';
import { CreatorWorksList } from '../components/creator/works/CreatorWorksList';
import { CreatorWorkForm } from '../components/creator/works/CreatorWorkForm';

/**
 * "Minhas obras" — orquestrador de lançamento e configuração de obras.
 *
 * <p>Decomposto modularmente conforme TASK-105:
 * consome useCreatorWorks e orquestra CreatorWorksList, CreatorWorkForm e ImageCropper.</p>
 */
interface CreatorWorksPageProps {
  onNavigateToChapters?: (workId?: string) => void;
}

export function CreatorWorksPage({ onNavigateToChapters }: CreatorWorksPageProps = {}) {
  const {
    works, filteredWorks, loading, error, message, query, setQuery, formOpen, setFormOpen,
    editingId, title, setTitle, synopsis, setSynopsis, genres, toggleGenre, format, setFormat,
    status, setStatus, cover, banner, declared, setDeclared, saving, startEditing, resetForm,
    save, remove, cropTarget, cropFile, cropUrl, startCropFromFile, startCropFromUrl, cancelCrop, confirmCrop,
    createdWorkId,
  } = useCreatorWorks();

  return (
    <section className="mn-container py-10 space-y-8">
      <header className="border-2 border-[var(--mn-yellow)] bg-[var(--mn-ink-2)] p-6 shadow-[6px_6px_0_var(--mn-yellow)]">
        <p className="font-pixel text-[11px] tracking-widest text-[var(--mn-mute)] uppercase">Criador</p>
        <h1 className="font-display text-3xl sm:text-4xl text-[var(--mn-paper)] uppercase mt-1 flex items-center gap-3">
          <BookMarked size={26} className="text-[var(--mn-yellow)]" /> Minhas obras
        </h1>
        <p className="mt-2 text-sm text-[var(--mn-mute)]">
          Aqui você lança e configura a <strong className="text-[var(--mn-paper)]">obra</strong>: capa, banner,
          categorias, título e sinopse. Para publicar capítulos, vá em <strong className="text-[var(--mn-paper)]">Capítulos</strong>
          e escolha a obra.
        </p>
      </header>

      <CreatorWorksList
        works={works}
        filteredWorks={filteredWorks}
        loading={loading}
        query={query}
        onQueryChange={setQuery}
        onOpenCreateForm={() => {
          resetForm();
          setFormOpen(true);
        }}
        onEditWork={startEditing}
        onRemoveWork={remove}
        onManageChapters={(work) => onNavigateToChapters?.(work.id)}
        onGoToChapters={() => onNavigateToChapters?.()}
      />

      {formOpen && (
        <CreatorWorkForm
          editingId={editingId}
          title={title}
          onTitleChange={setTitle}
          synopsis={synopsis}
          onSynopsisChange={setSynopsis}
          genres={genres}
          onToggleGenre={toggleGenre}
          format={format}
          onFormatChange={setFormat}
          status={status}
          onStatusChange={setStatus}
          cover={cover}
          banner={banner}
          declared={declared}
          onDeclaredChange={setDeclared}
          saving={saving}
          error={error}
          message={message}
          createdWorkId={createdWorkId}
          onNavigateToChapters={onNavigateToChapters}
          onSubmit={save}
          onCancelEdit={resetForm}
          onClose={() => setFormOpen(false)}
          onSelectCropFile={startCropFromFile}
          onAdjustCrop={startCropFromUrl}
        />
      )}

      {(cropFile || cropUrl) && (
        <ImageCropper
          file={cropFile}
          sourceUrl={cropUrl}
          outputWidth={cropTarget === 'banner' ? 1600 : 900}
          outputHeight={cropTarget === 'banner' ? 900 : 1200}
          confirmLabel={cropTarget === 'banner' ? 'USAR ESTE BANNER' : 'USAR ESTA CAPA'}
          busy={saving}
          error={error}
          onCancel={cancelCrop}
          onConfirm={confirmCrop}
        />
      )}
    </section>
  );
}

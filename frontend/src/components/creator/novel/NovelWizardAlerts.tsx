import { AlertTriangle, RotateCcw } from 'lucide-react';

interface NovelWizardAlertsProps {
  recoverable: { savedAt: string } | null;
  onRestoreDraft: () => void;
  onDiscardDraft: () => void;
  error: string | null;
  success: string | null;
}

export function NovelWizardAlerts({
  recoverable,
  onRestoreDraft,
  onDiscardDraft,
  error,
  success,
}: NovelWizardAlertsProps) {
  return (
    <>
      {recoverable && (
        <div className="border-2 border-[var(--mn-yellow)] bg-[var(--mn-yellow)]/10 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-body">
          <span className="text-[var(--mn-paper)] flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-[var(--mn-yellow)] shrink-0" />
            Rascunho não salvo encontrado de {new Date(recoverable.savedAt).toLocaleTimeString('pt-BR')}.
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onRestoreDraft}
              className="px-2.5 py-1 bg-[var(--mn-yellow)] text-black font-bold hover:bg-white transition-colors"
            >
              Restaurar rascunho
            </button>
            <button
              type="button"
              onClick={onDiscardDraft}
              className="px-2.5 py-1 border border-[var(--mn-line)] text-[var(--mn-mute)] hover:text-[var(--mn-paper)] transition-colors"
            >
              Descartar
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="border-2 border-[var(--mn-red)] bg-[var(--mn-red)]/10 p-3 text-xs font-body text-[var(--mn-red)] flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {success && (
        <div className="border-2 border-[var(--mn-ok)] bg-[var(--mn-ok)]/10 p-3 text-xs font-body text-[var(--mn-ok)]">
          {success}
        </div>
      )}
    </>
  );
}

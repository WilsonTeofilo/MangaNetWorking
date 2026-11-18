import { STEPS } from './novelEditorTypes';

interface NovelWizardHeaderProps {
  workTitle: string;
  isEditing: boolean;
  editingNumber?: number | null;
  currentStep: number;
  maxStep: number;
  onGoToStep: (step: number) => void;
}

export function NovelWizardHeader({
  workTitle,
  isEditing,
  editingNumber,
  currentStep,
  maxStep,
  onGoToStep,
}: NovelWizardHeaderProps) {
  return (
    <div className="border-b-2 border-[var(--mn-line)] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <span className="font-pixel text-[12px] text-[var(--mn-yellow)] uppercase tracking-wider block">
          {isEditing ? `EDITANDO CAPÍTULO #${editingNumber}` : 'NOVO CAPÍTULO DE LIGHT NOVEL'}
        </span>
        <h2 className="font-display text-2xl text-[var(--mn-paper)] uppercase">{workTitle}</h2>
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        {STEPS.map((s) => {
          const locked = s.id > maxStep;
          return (
            <button
              key={s.id}
              type="button"
              disabled={locked}
              onClick={() => onGoToStep(s.id)}
              className={`px-3 py-1.5 font-display text-xs uppercase border-2 transition-all ${
                currentStep === s.id
                  ? 'border-[var(--mn-yellow)] bg-[var(--mn-yellow)] text-black font-bold shadow-[2px_2px_0_var(--mn-paper)]'
                  : locked
                    ? 'border-[var(--mn-line)] opacity-40 cursor-not-allowed text-[var(--mn-mute)]'
                    : currentStep > s.id
                      ? 'border-[var(--mn-line)] bg-[var(--mn-ink-2)] text-[var(--mn-paper)]'
                      : 'border-transparent text-[var(--mn-mute)] hover:border-[var(--mn-line)]'
              }`}
            >
              {s.id}. {s.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

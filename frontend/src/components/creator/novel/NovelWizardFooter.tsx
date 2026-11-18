import { ChevronLeft, ChevronRight, Save } from 'lucide-react';
import { Button } from '../../ui/Button';

interface NovelWizardFooterProps {
  currentStep: number;
  maxStep: number;
  savedAt: Date | null;
  onGoToStep: (step: number) => void;
  onCancel?: () => void;
}

export function NovelWizardFooter({
  currentStep,
  maxStep,
  savedAt,
  onGoToStep,
  onCancel,
}: NovelWizardFooterProps) {
  return (
    <div className="border-t-2 border-[var(--mn-line)] pt-4 flex items-center justify-between">
      <div>
        {currentStep > 1 ? (
          <Button
            variant="ghost"
            onClick={() => onGoToStep(currentStep - 1)}
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
        {savedAt && (
          <span className="text-xs font-body tabular-nums text-[var(--mn-mute)] flex items-center gap-1">
            <Save className="w-3.5 h-3.5" /> Salvo às {savedAt.toLocaleTimeString('pt-BR')}
          </span>
        )}

        {currentStep < 4 && (
          <Button
            variant="primary"
            disabled={currentStep >= maxStep}
            onClick={() => onGoToStep(currentStep + 1)}
            className="inline-flex items-center gap-1.5 !px-6"
          >
            AVANÇAR <ChevronRight className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

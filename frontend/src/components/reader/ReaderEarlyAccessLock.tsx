import { Button } from '../ui/Button';

interface ReaderEarlyAccessLockProps {
  authorName: string;
  onBack: () => void;
}

export function ReaderEarlyAccessLock({ authorName, onBack }: ReaderEarlyAccessLockProps) {
  return (
    <div className="w-full bg-[var(--mn-ink-2)] border border-[var(--mn-line)] p-10 text-center space-y-3">
      <h3 className="font-display text-2xl text-[var(--mn-yellow)] uppercase">
        ACESSO ANTECIPADO PARA MEMBROS
      </h3>
      <p className="font-body text-sm text-[var(--mn-mute)] max-w-md mx-auto">
        Este capítulo é exclusivo para membros oficiais de {authorName}.
        Torne-se membro na página da obra para ler agora.
      </p>
      <Button type="button" variant="primary" onClick={onBack} className="!min-h-[36px] !text-xs">
        VOLTAR À OBRA
      </Button>
    </div>
  );
}

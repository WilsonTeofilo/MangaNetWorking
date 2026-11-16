import { Button } from '../ui/Button';
import { Field } from '../ui/Field';

export interface PasswordRecoveryStepProps {
  step: 'request' | 'sent';
  email: string;
  setEmail: (val: string) => void;
  isLoading: boolean;
  errorMessage: string;
  onSubmit: (e: React.FormEvent) => void;
  onBackToLogin: () => void;
}

export function PasswordRecoveryStep({
  step,
  email,
  setEmail,
  isLoading,
  errorMessage,
  onSubmit,
  onBackToLogin,
}: PasswordRecoveryStepProps) {
  if (step === 'sent') {
    return (
      <section className="space-y-6" aria-live="polite">
        <h2 className="font-display text-3xl text-[var(--mn-paper)] uppercase">CONFIRA SEU E-MAIL</h2>
        <p className="font-body text-sm text-[var(--mn-mute)]">
          Se o endereço estiver cadastrado, você receberá um link de validade limitada para redefinir sua senha.
        </p>
        <button
          type="button"
          onClick={onBackToLogin}
          className="w-full font-pixel text-[10px] text-[var(--mn-mute)] hover:text-[var(--mn-paper)]"
        >
          VOLTAR AO LOGIN
        </button>
      </section>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div>
        <h2 className="font-display text-3xl text-[var(--mn-paper)] uppercase">RECUPERAR SENHA</h2>
        <p className="font-body text-xs text-[var(--mn-mute)] mt-1">
          Se o e-mail estiver cadastrado, enviaremos um link de recuperação.
        </p>
      </div>

      <Field
        label="E-MAIL"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />

      {errorMessage && (
        <p role="alert" className="font-body text-xs text-[var(--mn-red)]">
          {errorMessage}
        </p>
      )}

      <Button
        type="submit"
        variant="primary"
        disabled={isLoading}
        className="w-full !min-h-[48px]"
      >
        {isLoading ? 'ENVIANDO…' : 'ENVIAR LINK'}
      </Button>

      <button
        type="button"
        onClick={onBackToLogin}
        className="w-full font-pixel text-[10px] text-[var(--mn-mute)] hover:text-[var(--mn-paper)]"
      >
        VOLTAR AO LOGIN
      </button>
    </form>
  );
}

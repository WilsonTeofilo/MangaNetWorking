import { Mail } from 'lucide-react';
import { Button } from '../ui/Button';
import { Field } from '../ui/Field';
import { PasswordInput } from '../ui/PasswordInput';
import { limitPasswordLength } from './useAuthForm';

export interface LoginFormProps {
  email: string;
  setEmail: (val: string) => void;
  password: string;
  setPassword: (val: string) => void;
  isLoading: boolean;
  errorMessage: string;
  onSubmit: (e: React.FormEvent) => void;
  onSwitchMode: (mode: 'login' | 'register') => void;
  onForgotPassword: () => void;
}

export function LoginForm({
  email,
  setEmail,
  password,
  setPassword,
  isLoading,
  errorMessage,
  onSubmit,
  onSwitchMode,
  onForgotPassword,
}: LoginFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div>
        <h2 className="font-display text-3xl sm:text-4xl text-[var(--mn-paper)] uppercase tracking-wide">
          ENTRAR NA CONTA
        </h2>
        <p className="font-body text-xs text-[var(--mn-mute)] mt-1">
          Acesse com seu e-mail e senha. O 2FA é obrigatório.
        </p>
      </div>

      {/* Alternar entre Entrar e Criar Conta */}
      <div className="grid grid-cols-2 border-2 border-[var(--mn-line)]">
        <button
          type="button"
          onClick={() => onSwitchMode('login')}
          className="py-2 font-pixel text-[12px] uppercase tracking-wider transition-all bg-[var(--mn-paper)] text-[var(--mn-ink)]"
        >
          ENTRAR
        </button>
        <button
          type="button"
          onClick={() => onSwitchMode('register')}
          className="py-2 font-pixel text-[12px] uppercase tracking-wider border-l-2 border-[var(--mn-line)] transition-all bg-[var(--mn-ink-3)] text-[var(--mn-mute)] hover:text-[var(--mn-paper)]"
        >
          CRIAR CONTA
        </button>
      </div>

      <div className="space-y-4">
        <Field
          label="E-MAIL OU USERNAME"
          type="text"
          inputMode="text"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="seu.email@exemplo.com ou seu username"
          helperText="Entre com o e-mail ou com o username que você criou."
          required
          childrenRight={<Mail size={16} className="text-[var(--mn-mute)]" />}
        />

        <PasswordInput
          label="SENHA"
          value={password}
          onChange={(e) => setPassword(limitPasswordLength(e.target.value))}
          placeholder="••••••••"
          autoComplete="current-password"
          showStrength={false}
          required
        />
      </div>

      {errorMessage && (
        <div className="p-2 border-2 border-[var(--mn-red)] bg-[var(--mn-red)]/10 font-body text-xs text-[var(--mn-red)]">
          {errorMessage}
        </div>
      )}

      <Button
        type="submit"
        variant="primary"
        disabled={isLoading}
        className="w-full !min-h-[48px] !text-lg"
      >
        {isLoading ? 'VERIFICANDO...' : 'CONTINUAR COM 2FA'}
      </Button>

      <button
        type="button"
        onClick={onForgotPassword}
        className="w-full font-pixel text-[10px] text-[var(--mn-mute)] hover:text-[var(--mn-yellow)]"
      >
        ESQUECI MINHA SENHA
      </button>
    </form>
  );
}

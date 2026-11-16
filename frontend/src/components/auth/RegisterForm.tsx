import { Mail } from 'lucide-react';
import { Button } from '../ui/Button';
import { Field } from '../ui/Field';
import { PasswordInput } from '../ui/PasswordInput';
import { sanitizeUsernameInput, type UsernameValidation } from '../../utils/usernameRules';
import { limitPasswordLength, type SexOption, type UsernameStatus } from './useAuthForm';

export interface RegisterFormProps {
  name: string;
  setName: (val: string) => void;
  username: string;
  setUsername: (val: string) => void;
  usernameValidation: UsernameValidation;
  usernameStatus: UsernameStatus;
  usernameSuggestion: string | null;
  email: string;
  setEmail: (val: string) => void;
  password: string;
  setPassword: (val: string) => void;
  confirmPassword: string;
  setConfirmPassword: (val: string) => void;
  birthDate: string;
  setBirthDate: (val: string) => void;
  sex: SexOption;
  setSex: (val: SexOption) => void;
  termsAccepted: boolean;
  setTermsAccepted: (val: boolean) => void;
  privacyPolicyVersion: string;
  isLoading: boolean;
  errorMessage: string;
  onSubmit: (e: React.FormEvent) => void;
  onSwitchMode: (mode: 'login' | 'register') => void;
}

export function RegisterForm({
  name,
  setName,
  username,
  setUsername,
  usernameValidation,
  usernameStatus,
  usernameSuggestion,
  email,
  setEmail,
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  birthDate,
  setBirthDate,
  sex,
  setSex,
  termsAccepted,
  setTermsAccepted,
  privacyPolicyVersion,
  isLoading,
  errorMessage,
  onSubmit,
  onSwitchMode,
}: RegisterFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div>
        <h2 className="font-display text-3xl sm:text-4xl text-[var(--mn-paper)] uppercase tracking-wide">
          CRIAR CONTA
        </h2>
        <p className="font-body text-xs text-[var(--mn-mute)] mt-1">
          Cadastro com verificação em 2 etapas obrigatória.
        </p>
      </div>

      {/* Alternar entre Entrar e Criar Conta */}
      <div className="grid grid-cols-2 border-2 border-[var(--mn-line)]">
        <button
          type="button"
          onClick={() => onSwitchMode('login')}
          className="py-2 font-pixel text-[12px] uppercase tracking-wider transition-all bg-[var(--mn-ink-3)] text-[var(--mn-mute)] hover:text-[var(--mn-paper)]"
        >
          ENTRAR
        </button>
        <button
          type="button"
          onClick={() => onSwitchMode('register')}
          className="py-2 font-pixel text-[12px] uppercase tracking-wider border-l-2 border-[var(--mn-line)] transition-all bg-[var(--mn-paper)] text-[var(--mn-ink)]"
        >
          CRIAR CONTA
        </button>
      </div>

      {/* Informação explicativa para novos cadastros */}
      <div className="space-y-2 border-2 border-[var(--mn-line)] bg-[var(--mn-ink-3)] p-3">
        <span className="font-pixel text-[12px] text-[var(--mn-mute)] tracking-wider uppercase block">
          TODAS AS CONTAS COMEÇAM COMO LEITOR
        </span>
        <p className="font-body text-xs text-[var(--mn-mute)] leading-relaxed">
          Leitor lê, curte, comenta e usa a biblioteca. Depois do 2FA você escolhe a foto, a
          visibilidade do perfil e, se quiser publicar, vira escritor em &quot;Minha conta&quot;
          (é preciso declarar um link social: Instagram, YouTube ou portfólio).
        </p>
      </div>

      <div className="space-y-4">
        <Field
          label="NOME"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Seu nome completo"
          required
        />

        <Field
          label="USERNAME"
          value={username}
          onChange={(e) => setUsername(sanitizeUsernameInput(e.target.value))}
          placeholder="ex.: teofilo"
          helperText="Minúsculas, números, ponto e sublinhado. Não pode ter espaço, acento, símbolo no início/fim nem termo reservado."
          required
        />

        {username.length > 0 && !usernameValidation.valid && (
          <p className="font-body text-xs text-[var(--mn-red)]" role="alert">
            {usernameValidation.message}
          </p>
        )}

        {usernameStatus !== 'idle' && (
          <p
            className={`font-pixel text-[11px] uppercase ${
              usernameStatus === 'free'
                ? 'text-[var(--mn-ok)]'
                : usernameStatus === 'taken'
                  ? 'text-[var(--mn-red)]'
                  : 'text-[var(--mn-mute)]'
            }`}
          >
            {usernameStatus === 'checking' && 'verificando...'}
            {usernameStatus === 'free' && `@${username.trim().toLowerCase()} está livre`}
            {usernameStatus === 'taken' && (
              <>
                @{username.trim().toLowerCase()} já está em uso
                {usernameSuggestion ? ` — use @${usernameSuggestion}` : ''}
              </>
            )}
          </p>
        )}

        <Field
          label="E-MAIL"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="seu.email@exemplo.com"
          required
          childrenRight={<Mail size={16} className="text-[var(--mn-mute)]" />}
        />

        <PasswordInput
          label="SENHA"
          value={password}
          onChange={(e) => setPassword(limitPasswordLength(e.target.value))}
          placeholder="••••••••"
          autoComplete="new-password"
          showStrength={true}
          required
        />

        <p id="password-policy" className="font-body text-xs text-[var(--mn-mute)]">
          Use de 8 a 64 caracteres. Espaços, símbolos, acentos e emojis são aceitos.
        </p>

        <PasswordInput
          label="CONFIRMAR SENHA"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(limitPasswordLength(e.target.value))}
          autoComplete="new-password"
          aria-describedby="password-policy"
          required
        />

        <Field
          label="DATA DE NASCIMENTO"
          type="date"
          value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
          helperText="Necessário para controle de maioridade e proteção legal (LGPD)"
        />

        <div className="space-y-2">
          <label htmlFor="sex" className="font-pixel text-[12px] text-[var(--mn-mute)] tracking-wider uppercase block">
            SEXO
          </label>
          <select
            id="sex"
            value={sex}
            onChange={(e) => setSex(e.target.value as SexOption)}
            className="w-full bg-[var(--mn-ink-3)] border-2 border-[var(--mn-line)] px-3 py-3 font-body text-sm text-[var(--mn-paper)] focus:border-[var(--mn-yellow)] focus:outline-none"
          >
            <option value="NAO_INFORMADO">Prefiro nao informar</option>
            <option value="MASCULINO">Masculino</option>
            <option value="FEMININO">Feminino</option>
            <option value="OUTRO">Outro</option>
          </select>
        </div>

        <div className="flex items-start gap-2 pt-2">
          <input
            type="checkbox"
            id="termsAccepted"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-[var(--mn-line)] bg-[var(--mn-ink-3)] text-[var(--mn-yellow)] focus:ring-0 cursor-pointer"
          />
          <label htmlFor="termsAccepted" className="font-body text-xs text-[var(--mn-mute)] leading-relaxed cursor-pointer select-none">
            Li e concordo com os <span className="text-[var(--mn-paper)] underline">Termos de Uso</span> e a{' '}
            <span className="text-[var(--mn-paper)] underline">Política de Privacidade</span> (versão {privacyPolicyVersion || 'carregando'}; LGPD - Lei 13.709/2018).
          </label>
        </div>
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
        {isLoading ? 'VERIFICANDO...' : 'CRIAR CONTA E ATIVAR 2FA'}
      </Button>
    </form>
  );
}

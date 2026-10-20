import { useId, useState, type ChangeEvent, type InputHTMLAttributes } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Field } from './Field';

export type PasswordStrengthLevel = 'weak' | 'medium' | 'strong';

export interface PasswordStrength {
  level: PasswordStrengthLevel;
  length: number;
  uniqueCharacters: number;
  characterGroups: number;
  predictable: boolean;
  mediumByVariety: boolean;
  mediumByLength: boolean;
  strongByVariety: boolean;
  strongByUniqueCharacters: boolean;
  strongByLongPassphrase: boolean;
}

const COMMON_PASSWORDS = new Set([
  'password', 'password1', 'password123', 'senha', 'senha123', 'senha1234',
  '12345678', '123456789', 'qwerty', 'qwerty123', 'admin', 'admin123',
  'letmein', 'iloveyou', 'welcome', 'manga123',
]);
const PREDICTABLE_SEQUENCES = ['012345', '123456', '234567', '345678', 'abcdef', 'qwerty', 'asdfgh', 'zxcvbn'];

export function assessPassword(password: string): PasswordStrength {
  const source = Array.from(password.normalize('NFKC')).join('');
  const normalized = source.toLocaleLowerCase('en-US');
  const compact = normalized.replace(/[^\p{L}\p{N}]/gu, '');
  const uniqueCharacters = new Set(Array.from(source)).size;
  const predictable = COMMON_PASSWORDS.has(compact)
    || PREDICTABLE_SEQUENCES.some((sequence) => compact.includes(sequence))
    || uniqueCharacters <= 2;
  const groups = [
    /\p{Ll}/u.test(source),
    /\p{Lu}/u.test(source),
    /\p{N}/u.test(source),
    /[\p{P}\p{S}\p{Z}]/u.test(source),
  ].filter(Boolean).length;
  const length = Array.from(password).length;
  const mediumByVariety = length >= 12 && groups >= 2;
  const mediumByLength = length >= 16 && uniqueCharacters >= 10;
  const strongByVariety = length >= 16 && groups >= 3;
  const strongByUniqueCharacters = length >= 16 && uniqueCharacters >= 12;
  const strongByLongPassphrase = length >= 20 && groups >= 2;
  const strong = !predictable && (strongByVariety || strongByUniqueCharacters || strongByLongPassphrase);
  const medium = !predictable && (mediumByVariety || mediumByLength);

  return {
    level: strong ? 'strong' : medium ? 'medium' : 'weak',
    length,
    uniqueCharacters,
    characterGroups: groups,
    predictable,
    mediumByVariety,
    mediumByLength,
    strongByVariety,
    strongByUniqueCharacters,
    strongByLongPassphrase,
  };
}

interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'> {
  label: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  showStrength?: boolean;
}

export function PasswordInput({ label, value, onChange, showStrength = false, id, className = '', ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const generatedId = useId();
  const inputId = id || `password-${generatedId}`;
  const strengthId = `${inputId}-strength`;
  const strength = assessPassword(value);
  const existingDescription = props['aria-describedby'];
  const describedBy = [existingDescription, showStrength && value ? strengthId : undefined].filter(Boolean).join(' ') || undefined;
  const levelLabel = { weak: 'Fraca', medium: 'Média', strong: 'Forte' }[strength.level];
  const levelColor = { weak: 'text-[var(--mn-red)]', medium: 'text-[var(--mn-yellow)]', strong: 'text-emerald-400' }[strength.level];

  return (
    <>
      <Field
        {...props}
        id={inputId}
        label={label}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        aria-describedby={describedBy}
        aria-invalid={showStrength && value ? strength.level === 'weak' : props['aria-invalid']}
        className={`pr-12 ${className}`}
        autoCapitalize="none"
        spellCheck={false}
        childrenRight={(
          <button
            type="button"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-sm text-[var(--mn-mute-paper)] transition-colors hover:text-[var(--mn-yellow)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--mn-yellow)]"
            onClick={() => setVisible((current) => !current)}
            aria-label={`${visible ? 'Ocultar' : 'Mostrar'} ${label.toLocaleLowerCase('pt-BR')}`}
            aria-pressed={visible}
          >
            {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
          </button>
        )}
      />
      {showStrength && value && (
        <div id={strengthId} className="-mt-3 space-y-3 border-2 border-[var(--mn-line)] bg-[var(--mn-ink-2)] p-3" role="group" aria-label="Avaliação de força da senha">
          <div className="flex items-center justify-between gap-3">
            <span className="font-body text-sm text-[var(--mn-paper)]">Força da senha</span>
            <span className={`font-body text-sm font-bold ${levelColor}`} aria-live="polite">{levelLabel}</span>
          </div>
          <div className="grid grid-cols-3 gap-1" aria-hidden="true">
            {(['weak', 'medium', 'strong'] as const).map((level) => {
              const active = ['weak', 'medium', 'strong'].indexOf(strength.level) >= ['weak', 'medium', 'strong'].indexOf(level);
              return <span key={level} className={`h-1.5 ${active ? level === 'weak' ? 'bg-[var(--mn-red)]' : level === 'medium' ? 'bg-[var(--mn-yellow)]' : 'bg-emerald-400' : 'bg-[var(--mn-line)]'}`} />;
            })}
          </div>
          <ul className="space-y-1 font-body text-xs text-[var(--mn-mute-paper)]">
            <Requirement met={strength.length >= 8 && !strength.predictable}>Base: pelo menos 8 caracteres; evite senha comum, sequência óbvia ou repetição simples.</Requirement>
            <Requirement met={strength.mediumByVariety || strength.mediumByLength}>Média: 12+ caracteres e 2 grupos diferentes; ou 16+ caracteres com 10 distintos.</Requirement>
            <Requirement met={strength.strongByVariety || strength.strongByUniqueCharacters || strength.strongByLongPassphrase}>Forte: 16+ e 3 grupos ou 12 distintos; ou frase de 20+ caracteres com 2 grupos.</Requirement>
          </ul>
          {strength.length < 8 && <p className="font-body text-xs text-[var(--mn-red)]">Faltam {8 - strength.length} caracteres para o mínimo.</p>}
          {strength.predictable && <p className="font-body text-xs text-[var(--mn-red)]">Troque a sequência, repetição ou padrão comum por uma frase imprevisível.</p>}
          <p className="font-body text-[11px] leading-relaxed text-[var(--mn-mute-paper)]">Grupos: letras minúsculas, maiúsculas, números e símbolos/espaços. Senhas fracas não podem ser cadastradas. Evite reutilizar senhas.</p>
        </div>
      )}
    </>
  );
}

function Requirement({ met, children }: { met: boolean; children: string }) {
  return <li className="flex gap-2"><span aria-hidden="true" className={met ? 'text-emerald-400' : 'text-[var(--mn-red)]'}>{met ? '✓' : '•'}</span><span>{children}</span></li>;
}

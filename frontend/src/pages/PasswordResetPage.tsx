import { useState, type FormEvent } from 'react';
import { authApi } from '../api/authApi';
import { ApiError } from '../api/client';
import { PasswordInput, assessPassword } from '../components/ui/PasswordInput';
import { Button } from '../components/ui/Button';

interface PasswordResetPageProps {
  token: string;
  onBackToLogin: () => void;
}

export function PasswordResetPage({ token, onBackToLogin }: PasswordResetPageProps) {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [complete, setComplete] = useState(false);
  const [loading, setLoading] = useState(false);

  const limitPasswordLength = (value: string) => Array.from(value).slice(0, 64).join('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (!token) {
      setError('Este link está incompleto. Solicite uma nova recuperação de senha.');
      return;
    }
    const length = Array.from(password).length;
    if (length < 8 || length > 64 || assessPassword(password).level === 'weak') {
      setError('Escolha uma senha média ou forte, com no mínimo 8 e no máximo 64 caracteres.');
      return;
    }
    if (password !== confirmation) {
      setError('A confirmação não corresponde à nova senha.');
      return;
    }
    setLoading(true);
    try {
      await authApi.confirmPasswordReset({ token, newPassword: password });
      setComplete(true);
      setPassword('');
      setConfirmation('');
    } catch (cause) {
      const body = cause instanceof ApiError ? cause.data as { message?: string } | undefined : undefined;
      setError(body?.message || 'Não foi possível redefinir a senha agora. Verifique o link ou solicite outro.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0B0B0C] p-4 text-[#F4EFE3] sm:p-6">
      <section className="mx-auto mt-12 max-w-lg space-y-6 border-2 border-[var(--mn-yellow)] bg-[#151517] p-6 shadow-[6px_6px_0_var(--mn-yellow)] sm:mt-24 sm:p-10">
        <p className="font-pixel text-xs text-[var(--mn-yellow)]">MANGANETWORKING</p>
        <h1 className="font-display text-3xl uppercase">{complete ? 'Senha atualizada' : 'Criar nova senha'}</h1>
        {complete ? (
          <div className="space-y-5" role="status">
            <p className="font-body text-sm text-[#A9A59A]">Sua senha foi alterada. Entre novamente com a nova senha; a verificação em duas etapas continuará ativa.</p>
            <Button type="button" variant="primary" onClick={onBackToLogin}>VOLTAR AO LOGIN</Button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-5" noValidate>
            <p className="font-body text-sm text-[#A9A59A]">Use uma senha média ou forte. Ela deve ter entre 8 e 64 caracteres.</p>
            <PasswordInput label="NOVA SENHA" value={password} onChange={(event) => setPassword(limitPasswordLength(event.target.value))} autoComplete="new-password" showStrength required disabled={loading || !token} />
            <PasswordInput label="CONFIRMAR NOVA SENHA" value={confirmation} onChange={(event) => setConfirmation(limitPasswordLength(event.target.value))} autoComplete="new-password" required disabled={loading || !token} />
            {error && <p role="alert" className="font-body text-sm text-[#E8402F]">{error}</p>}
            <Button type="submit" variant="primary" disabled={loading || !token || !password || !confirmation} className="w-full !min-h-[48px]">
              {loading ? 'ATUALIZANDO…' : 'ATUALIZAR SENHA'}
            </Button>
            {!token && <p role="alert" className="font-body text-sm text-[#E8402F]">Link inválido ou sem token. Solicite uma nova recuperação pelo login.</p>}
            <button type="button" onClick={onBackToLogin} className="w-full font-pixel text-[10px] text-[#A9A59A] underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--mn-yellow)]">VOLTAR AO LOGIN</button>
          </form>
        )}
      </section>
    </main>
  );
}

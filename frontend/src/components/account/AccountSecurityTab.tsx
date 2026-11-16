import { useEffect, useState } from 'react';
import { Eye, EyeOff, ShieldCheck, UserPlus, LogOut, Download, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { userApi, authApi } from '../../api/authApi';
import { Button } from '../ui/Button';
import { Field } from '../ui/Field';
import { Modal } from '../common/Modal';
import { sanitizeUsernameInput, validateUsername } from '../../utils/usernameRules';

export interface AccountSecurityTabProps {
  onOpenPublicProfile: (username: string) => void;
  onBecomeWriter?: () => void;
  onSaved?: () => void;
}

export function AccountSecurityTab({
  onOpenPublicProfile,
  onBecomeWriter,
  onSaved,
}: AccountSecurityTabProps) {
  const { user, saveProfile, logout, refreshSession } = useAuth();
  const [isPublic, setIsPublic] = useState(user.profilePublic ?? true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Username só pode ser reivindicado uma vez quando começa com 'user_'
  const usernameIsGenerated = (user.username ?? '').startsWith('user_');
  const [usernameDraft, setUsernameDraft] = useState(user.username ?? '');
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'free' | 'taken'>('idle');
  const [usernameSuggestion, setUsernameSuggestion] = useState<string | null>(null);
  const [usernameQuery, setUsernameQuery] = useState('');
  const usernameValidation = validateUsername(usernameDraft);

  useEffect(() => {
    if (usernameQuery.length < 3) {
      setUsernameStatus('idle');
      setUsernameSuggestion(null);
      return;
    }
    setUsernameStatus('checking');
    let cancelled = false;
    const timer = setTimeout(() => {
      authApi
        .checkUsername(usernameQuery)
        .then((result) => {
          if (cancelled) return;
          setUsernameStatus(result.available ? 'free' : 'taken');
          setUsernameSuggestion(result.suggestion ?? null);
        })
        .catch(() => {
          if (!cancelled) setUsernameStatus('idle');
        });
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [usernameQuery]);

  const claimUsername = async () => {
    setSaving(true);
    setError(null);
    const check = validateUsername(usernameDraft);
    if (!check.valid) {
      setError(check.message);
      setSaving(false);
      return;
    }
    try {
      await userApi.updateProfile({ username: check.value });
      await refreshSession();
      setMessage('Username definido com sucesso. Ele não poderá ser alterado novamente.');
      onSaved?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Não foi possível definir o username.');
    } finally {
      setSaving(false);
    }
  };

  const toggleVisibility = async () => {
    setSaving(true);
    setError(null);
    try {
      await saveProfile({ isProfilePublic: !isPublic });
      setIsPublic(!isPublic);
      setMessage(!isPublic ? 'Seu perfil agora é público.' : 'Seu perfil agora é privado.');
      onSaved?.();
    } catch {
      setError('Não foi possível alterar a visibilidade.');
    } finally {
      setSaving(false);
    }
  };

  const handleExportData = async () => {
    setError(null);
    try {
      const data = await userApi.exportMyData();
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute(
        'download',
        `manganetworking-dados-${user.name.toLowerCase().replace(/\s+/g, '-')}.json`
      );
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      setMessage('Download dos seus dados iniciado.');
    } catch {
      setError('Não foi possível exportar seus dados agora. Tente novamente mais tarde.');
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    setError(null);
    try {
      await userApi.deleteMyAccount();
      setShowDeleteModal(false);
      window.location.reload();
    } catch {
      setError('Não foi possível confirmar a exclusão da conta. Tente novamente.');
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Reivindicação de Username (apenas se for gerado) */}
      {usernameIsGenerated && (
        <div className="bg-[var(--mn-ink-2)] p-6 sm:p-7 space-y-4">
          <h2 className="font-display text-xl text-[var(--mn-paper)] uppercase">Definir meu username</h2>
          <p className="font-body text-sm text-[var(--mn-mute)]">
            Sua conta ainda usa o identificador automático. Escolha o username público: ele será a
            segunda forma de login e o endereço da sua página. Depois de definido, não muda mais.
          </p>
          <Field
            label="USERNAME"
            value={usernameDraft}
            onChange={(e) => {
              const value = sanitizeUsernameInput(e.target.value);
              setUsernameDraft(value);
              setUsernameQuery(value);
            }}
            placeholder="ex.: teofilo"
          />
          {usernameDraft.length > 0 && !usernameValidation.valid && (
            <p className="font-body text-xs text-[var(--mn-red)]" role="alert">
              {usernameValidation.message}
            </p>
          )}
          {usernameStatus === 'taken' && usernameSuggestion && (
            <button
              type="button"
              onClick={() => setUsernameDraft(usernameSuggestion)}
              className="font-pixel text-[11px] uppercase text-[var(--mn-yellow)] hover:underline cursor-pointer"
            >
              usar @{usernameSuggestion}
            </button>
          )}
          <Button
            onClick={claimUsername}
            disabled={saving || usernameStatus === 'taken' || !usernameValidation.valid}
          >
            DEFINIR USERNAME
          </Button>
        </div>
      )}

      {/* Visibilidade do Perfil */}
      <div className="bg-[var(--mn-ink-2)] p-6 sm:p-7 space-y-4">
        <h2 className="font-display text-xl text-[var(--mn-paper)] uppercase">Visibilidade do perfil</h2>
        {user.isCreator ? (
          <p className="font-body text-sm text-[var(--mn-mute)] border-2 border-[var(--mn-ok)] p-3">
            <strong className="text-[var(--mn-paper)]">Perfil de escritor é sempre público.</strong> Quem
            publica precisa ser encontrado pelos leitores — a visibilidade privativa é exclusiva para
            conta de leitor.
          </p>
        ) : (
          <>
            <p className="font-body text-sm text-[var(--mn-mute)]">
              Privado: ninguém vê seus dados além do username (usado em comentários).
              Público: sua página com obras favoritadas fica visível para outros leitores.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={toggleVisibility} disabled={saving} variant={isPublic ? 'ghost' : 'primary'}>
                {isPublic ? <EyeOff size={14} /> : <Eye size={14} />}
                {isPublic ? 'TORNAR PRIVADO' : 'TORNAR PÚBLICO'}
              </Button>
              <span className="font-pixel text-[11px] uppercase text-[var(--mn-mute)]">
                {isPublic ? 'PERFIL PÚBLICO' : 'PERFIL PRIVADO'}
              </span>
            </div>
          </>
        )}

        <div className="flex flex-wrap gap-3 pt-2">
          {user.username && (
            <Button variant="ghost" onClick={() => onOpenPublicProfile(user.username!)}>
              <Eye size={14} /> VER MINHA PÁGINA PÚBLICA
            </Button>
          )}
          {onBecomeWriter && !user.isCreator && (
            <Button variant="ghost" onClick={onBecomeWriter}>
              <UserPlus size={14} /> QUERO PUBLICAR COMO ESCRITOR
            </Button>
          )}
        </div>
      </div>

      {message && <p role="status" className="font-pixel text-xs text-[var(--mn-ok)] uppercase">{message}</p>}
      {error && <p role="alert" className="font-pixel text-xs text-[var(--mn-red)] uppercase">{error}</p>}

      {/* Seção de Governança de Dados LGPD */}
      <div className="bg-[var(--mn-ink-2)] p-6 sm:p-7 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck size={20} className="text-[var(--mn-yellow)]" />
          <h2 className="font-display text-xl text-[var(--mn-paper)] uppercase">Governança e Privacidade (LGPD)</h2>
        </div>
        <p className="font-body text-sm text-[var(--mn-mute)]">
          Em conformidade com a Lei Geral de Proteção de Dados (Lei 13.709/2018), você tem o direito de
          acessar, exportar ou solicitar a exclusão definitiva dos seus dados a qualquer momento.
        </p>

        <div className="flex flex-wrap gap-3 pt-2">
          <Button variant="ghost" onClick={handleExportData}>
            <Download size={14} /> BAIXAR MEUS DADOS (JSON)
          </Button>
          <Button variant="ghost" onClick={() => void logout()}>
            <LogOut size={14} /> SAIR DA CONTA
          </Button>
          <Button variant="danger" onClick={() => setShowDeleteModal(true)}>
            EXCLUIR CONTA
          </Button>
        </div>
      </div>

      {/* Modal de Exclusão Irreversível */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => !deleting && setShowDeleteModal(false)}
        title="EXCLUIR CONTA DEFINITIVAMENTE"
        maxWidth="max-w-lg"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-[var(--mn-red)] font-pixel text-xs uppercase font-bold">
            <AlertTriangle size={16} /> Ação Irreversível (Art. 18, VI da LGPD)
          </div>
          <p className="font-body text-sm text-[var(--mn-paper)] leading-relaxed">
            Esta operação apaga permanentemente seu histórico de leitura, biblioteca, comentários,
            avatares e revoga todas as sessões ativas. Não será possível recuperar nenhum dado.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 justify-end">
            <Button
              variant="ghost"
              onClick={() => setShowDeleteModal(false)}
              disabled={deleting}
            >
              CANCELAR
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteAccount}
              disabled={deleting}
            >
              {deleting ? 'EXCLUINDO…' : 'CONFIRMAR EXCLUSÃO'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

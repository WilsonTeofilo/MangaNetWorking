import { useEffect, useRef, useState } from 'react';
import { Camera, Crop, Eye, EyeOff, ShieldCheck, UserPlus, LogOut, BookOpen } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { storageApi } from '../api/storageApi';
import { userApi, authApi } from '../api/authApi';
import { Button } from '../components/ui/Button';
import { Field } from '../components/ui/Field';
import { ImageCropper } from '../components/common/ImageCropper';
import { Modal } from '../components/common/Modal';
import { sanitizeUsernameInput, validateUsername } from '../utils/usernameRules';

/**
 * "Minha conta" — o perfil do LEITOR.
 *
 * <p>Escopo deliberado (identidade visual 9.6): identidade, visibilidade do perfil, o link
 * para a página pública e os dados/privacidade. A candidatura a escritor é uma página
 * própria ("Quero publicar como escritor"), para não duplicar os mesmos campos em dois
 * lugares.</p>
 */
export function AccountProfilePage({
  onOpenPublicProfile,
  onOpenReaderPanel,
  onBecomeWriter,
  onSaved,
}: {
  onOpenPublicProfile: (username: string) => void;
  onOpenReaderPanel?: () => void;
  onBecomeWriter?: () => void;
  /** Chamado depois que o perfil e salvo (o primeiro acesso termina aqui). */
  onSaved?: () => void;
}) {
  const { user, saveProfile, logout, refreshSession } = useAuth();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl);
  const [isPublic, setIsPublic] = useState(user.profilePublic ?? true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** Origem do recorte: arquivo novo ou a foto atual (para reajustar sem subir arquivo). */
  const [cropSource, setCropSource] = useState<{ file?: File; url?: string } | null>(null);
  const [showDelete, setShowDelete] = useState(false);

  // Username só pode ser reivindicado uma vez, enquanto o identificador ainda é o gerado.
  const usernameIsGenerated = (user.username ?? '').startsWith('user_');
  const [usernameDraft, setUsernameDraft] = useState(user.username ?? '');
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'free' | 'taken'>('idle');
  const [usernameSuggestion, setUsernameSuggestion] = useState<string | null>(null);
  const [usernameQuery, setUsernameQuery] = useState('');
  const usernameValidation = validateUsername(usernameDraft);


  // Verificacao de disponibilidade com debounce: uma request por tecla inundaria a API
  // (e o limitador de requisicoes responderia 429).
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
      setMessage('Username definido. Ele não muda mais.');
    } catch (err: any) {
      setError(err?.message || 'Não foi possível definir o username.');
    } finally {
      setSaving(false);
    }
  };

  /** Recebe o recorte final (quadrado) e grava como avatar. */
  const uploadCroppedAvatar = async (blob: Blob) => {
    setUploading(true);
    setError(null);
    try {
      const file = new File([blob], 'avatar.png', { type: 'image/png' });
      const stored = await storageApi.uploadAvatar(file);
      setAvatarUrl(stored.url);
      await saveProfile({ avatarUrl: stored.url });
      setCropSource(null);
      setMessage('Foto de perfil atualizada.');
      onSaved?.();
    } catch (err: any) {
      setError(err?.message || 'Não foi possível enviar a foto. Tente outra imagem.');
    } finally {
      setUploading(false);
    }
  };

  const handleAvatarPicked = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Formato não suportado. Envie JPG, PNG ou WebP.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('A foto passa de 10 MB. Envie uma imagem menor.');
      return;
    }
    setError(null);
    setCropSource({ file });
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

  return (
    <section className="mn-container py-10 space-y-6">
      <header className="border-2 border-[var(--mn-yellow)] bg-[var(--mn-ink-2)] p-6 shadow-[6px_6px_0_var(--mn-yellow)]">
        <p className="font-pixel text-[11px] tracking-widest text-[var(--mn-mute)] uppercase">Conta</p>
        <h1 className="font-display text-3xl sm:text-4xl text-[var(--mn-paper)] uppercase mt-1">Minha conta</h1>
        <p className="mt-2 text-sm text-[var(--mn-mute)]">
          Seus dados de perfil. O username é o seu identificador público e a segunda forma de login: não muda.
        </p>
      </header>

      <div className="grid lg:grid-cols-[320px_1fr] gap-6 items-start">
        {/* Identidade */}
        <div className="border-2 border-[var(--mn-line)] bg-[var(--mn-ink-2)] p-6 space-y-3 text-center">
          <div className="relative mx-auto w-32 h-32">
            <img
              src={avatarUrl || '/avatar-placeholder.png'}
              alt="Foto de perfil"
              className="w-32 h-32 rounded-full object-cover bg-[#1F2833] border-2 border-[var(--mn-yellow)]"
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="absolute bottom-0 right-0 w-10 h-10 rounded-full bg-[var(--mn-yellow)] text-[var(--mn-ink)] border-2 border-[var(--mn-ink)] flex items-center justify-center hover:scale-105 transition-transform disabled:opacity-60"
              title="Trocar foto de perfil"
              aria-label="Trocar foto de perfil"
            >
              <Camera size={18} />
            </button>
          </div>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleAvatarPicked} />
          <div className="flex flex-col gap-2">
            <Button onClick={() => fileRef.current?.click()} disabled={uploading} variant="ghost" className="w-full">
              <Camera size={14} /> {uploading ? 'ENVIANDO...' : 'TROCAR FOTO'}
            </Button>
            {avatarUrl && (
              <Button
                onClick={() => setCropSource({ url: avatarUrl })}
                disabled={uploading}
                variant="ghost"
                className="w-full"
                title="Reajusta a foto que já está no seu perfil, sem subir um arquivo novo"
              >
                <Crop size={14} /> REAJUSTAR FOTO ATUAL
              </Button>
            )}
          </div>

          <p className="font-display text-xl text-[var(--mn-paper)] uppercase">{user.name}</p>
          <p className="font-pixel text-xs text-[var(--mn-yellow)]">@{user.username || 'sem-username'}</p>
          <p className="text-xs text-[var(--mn-mute)] break-all">{user.email}</p>
          <p className="font-pixel text-[11px] uppercase text-[var(--mn-mute)]">
            {user.isCreator ? 'Escritor' : 'Leitor'}
            {user.sex && user.sex !== 'NAO_INFORMADO' ? ` · ${user.sex}` : ''}
          </p>
        </div>

        {/* Visibilidade, conta e dados */}
        <div className="space-y-6">
          {usernameIsGenerated && (
            <div className="border-2 border-[var(--mn-line)] bg-[var(--mn-ink-2)] p-6 space-y-3">
              <h2 className="font-display text-xl text-[var(--mn-paper)] uppercase">Definir meu username</h2>
              <p className="text-sm text-[var(--mn-mute)]">
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
                <p className="text-xs text-[var(--mn-red)]" role="alert">
                  {usernameValidation.message}
                </p>
              )}
              {usernameStatus === 'taken' && usernameSuggestion && (
                <button
                  type="button"
                  onClick={() => setUsernameDraft(usernameSuggestion)}
                  className="font-pixel text-[11px] uppercase text-[var(--mn-yellow)] hover:underline"
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

          <div className="border-2 border-[var(--mn-line)] bg-[var(--mn-ink-2)] p-6 space-y-4">
            <h2 className="font-display text-xl text-[var(--mn-paper)] uppercase">Visibilidade do perfil</h2>
            {user.isCreator ? (
              <p className="text-sm text-[var(--mn-mute)] border-2 border-[var(--mn-teal)] p-3">
                <strong className="text-[var(--mn-paper)]">Perfil de escritor é sempre público.</strong> Quem
                publica precisa ser encontrado pelos leitores — a visibilidade privativa é só para
                conta de leitor. Os ajustes de foto, bio e links ficam no painel do autor.
              </p>
            ) : (
              <>
                <p className="text-sm text-[var(--mn-mute)]">
                  Privado: ninguém vê seus dados além do username (é o que aparece nos comentários).
                  Público: sua página pública fica visível para qualquer pessoa.
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
            <div className="flex flex-wrap gap-3">
              {user.username && (
                <Button variant="ghost" onClick={() => onOpenPublicProfile(user.username!)}>
                  <Eye size={14} /> VER MINHA PÁGINA PÚBLICA
                </Button>
              )}
              {onOpenReaderPanel && (
                <Button variant="ghost" onClick={onOpenReaderPanel}>
                  <BookOpen size={14} /> MEU PAINEL DE LEITOR
                </Button>
              )}
              {onBecomeWriter && !user.isCreator && (
                <Button variant="ghost" onClick={onBecomeWriter}>
                  <UserPlus size={14} /> QUERO PUBLICAR COMO ESCRITOR
                </Button>
              )}
            </div>
          </div>

          {message && <p role="status" className="font-pixel text-xs text-[var(--mn-teal)] uppercase">{message}</p>}
          {error && <p role="alert" className="font-pixel text-xs text-[var(--mn-red)] uppercase">{error}</p>}

          <div className="border-2 border-[var(--mn-line)] bg-[var(--mn-ink-2)] p-6 space-y-3">
            <h2 className="font-display text-xl text-[var(--mn-paper)] uppercase">Dados e privacidade</h2>
            <div className="flex flex-wrap gap-3">
              <Button variant="ghost" onClick={() => void userApi.exportMyData()}>
                <ShieldCheck size={14} /> BAIXAR MEUS DADOS
              </Button>
              <Button variant="ghost" onClick={() => void logout()}>
                <LogOut size={14} /> SAIR DA CONTA
              </Button>
              <Button variant="danger" onClick={() => setShowDelete(true)}>
                EXCLUIR CONTA
              </Button>
            </div>
          </div>
        </div>
      </div>

      {cropSource && (
        <ImageCropper
          file={cropSource.file ?? null}
          sourceUrl={cropSource.url ?? null}
          outputWidth={512}
          outputHeight={512}
          busy={uploading}
          error={error}
          onCancel={() => setCropSource(null)}
          onConfirm={uploadCroppedAvatar}
        />
      )}

      {/* Exclusão: confirmação em modal (identidade visual 9.6) */}
      <Modal
        isOpen={showDelete}
        onClose={() => setShowDelete(false)}
        title="EXCLUIR CONTA"
        maxWidth="max-w-lg"
      >
        <p className="font-body text-sm text-[var(--mn-paper)]">
          Isso apaga permanentemente seus dados, revoga todas as sessões e despublica as obras
          (Art. 18, VI da LGPD). Não dá para desfazer.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button variant="ghost" onClick={() => setShowDelete(false)}>
            CANCELAR
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              setShowDelete(false);
              void userApi.deleteMyAccount();
            }}
          >
            EXCLUIR DEFINITIVAMENTE
          </Button>
        </div>
      </Modal>
    </section>
  );
}

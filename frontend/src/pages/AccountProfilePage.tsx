import { useEffect, useRef, useState } from 'react';
import { Camera, Eye, EyeOff, ShieldCheck, UserPlus, LogOut, BookOpen } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { storageApi } from '../api/storageApi';
import { authApi, userApi } from '../api/authApi';
import { Button } from '../components/ui/Button';
import { Field } from '../components/ui/Field';

/** Formatos aceitos pelo normalizador de avatar do servidor (JPEG e PNG). */
const AVATAR_TYPES = ['image/jpeg', 'image/png'];

/**
 * "Minha conta": o perfil do titular — foto, nome, username, sexo e a decisão de
 * ficar público ou privado. É a página de perfil por dentro (o painel do criador tem
 * telas próprias).
 */
export function AccountProfilePage({ onOpenPublicProfile, onOpenReaderPanel }: { onOpenPublicProfile: (username: string) => void; onOpenReaderPanel?: () => void }) {
  const { user, saveProfile, becomeWriter, logout, refreshSession } = useAuth();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl);
  const [isPublic, setIsPublic] = useState(user.profilePublic ?? true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Formulário de candidatura a escritor (basta UM vínculo social).
  const [showWriterForm, setShowWriterForm] = useState(!user.isCreator);
  const [instagramUrl, setInstagramUrl] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [applying, setApplying] = useState(false);
  const [usernameDraft, setUsernameDraft] = useState(user.username ?? '');
  /** Situacao do username digitado: vazio, checando, livre, em uso ou invalido. */
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'free' | 'taken' | 'invalid'>('idle');
  /** Alternativa livre oferecida pelo servidor quando o username desejado ja existe. */
  const [usernameSuggestion, setUsernameSuggestion] = useState<string | null>(null);

  // Username só pode ser reivindicado uma vez, enquanto o identificador ainda é o gerado.
  const usernameIsGenerated = (user.username ?? '').startsWith('user_');

  // Verificacao de disponibilidade com atraso: evita inundar a API a cada tecla e
  // devolve uma alternativa concreta quando o nome desejado ja existe.
  useEffect(() => {
    const candidate = usernameDraft.trim().toLowerCase();
    if (!usernameIsGenerated || candidate.length < 3) {
      setUsernameStatus('idle');
      setUsernameSuggestion(null);
      return;
    }
    setUsernameStatus('checking');
    let cancelled = false;
    const timer = setTimeout(() => {
      authApi
        .checkUsername(candidate)
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
  }, [usernameDraft, usernameIsGenerated]);

  const claimUsername = async () => {
    setSaving(true);
    setError(null);
    try {
      await userApi.updateProfile({ username: usernameDraft });
      await refreshSession();
      setMessage('Username definido. Ele não muda mais.');
    } catch (err: any) {
      setError(err?.message || 'Não foi possível definir o username.');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError(null);
    setMessage(null);

    if (!AVATAR_TYPES.includes(file.type)) {
      setError('Formato não suportado. Envie uma foto JPG ou PNG (a imagem é convertida pelo servidor).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('A foto passa de 10 MB. Envie uma imagem menor.');
      return;
    }

    setUploading(true);
    try {
      const stored = await storageApi.uploadAvatar(file);
      setAvatarUrl(stored.url);
      await saveProfile({ avatarUrl: stored.url });
      setMessage('Foto de perfil atualizada.');
    } catch (err: any) {
      setError(err?.message || 'Não foi possível enviar a foto. Use JPEG ou PNG e tente novamente.');
    } finally {
      setUploading(false);
    }
  };

  const toggleVisibility = async () => {
    setSaving(true);
    setError(null);
    try {
      await saveProfile({ isProfilePublic: !isPublic });
      setIsPublic(!isPublic);
      setMessage(!isPublic ? 'Seu perfil agora é público.' : 'Seu perfil agora é privado.');
    } catch {
      setError('Não foi possível alterar a visibilidade.');
    } finally {
      setSaving(false);
    }
  };

  const applyAsWriter = async (event: React.FormEvent) => {
    event.preventDefault();
    setApplying(true);
    setError(null);
    try {
      await becomeWriter({
        instagramUrl: instagramUrl || undefined,
        youtubeUrl: youtubeUrl || undefined,
        portfolioUrl: portfolioUrl || undefined,
      });
      setMessage('Perfil de escritor criado. Já pode publicar.');
      setShowWriterForm(false);
    } catch (err: any) {
      setError(err?.message || 'Não foi possível criar o perfil de escritor.');
    } finally {
      setApplying(false);
    }
  };

  return (
    <section className="mn-container py-10 space-y-8">
      <header className="border-2 border-[var(--mn-yellow)] bg-[var(--mn-ink-2)] p-6 shadow-[6px_6px_0_var(--mn-yellow)]">
        <p className="font-pixel text-[11px] tracking-widest text-[var(--mn-mute)] uppercase">Conta</p>
        <h1 className="font-display text-3xl sm:text-4xl text-[var(--mn-paper)] uppercase mt-1">Minha conta</h1>
        <p className="mt-2 text-sm text-[var(--mn-mute)]">
          Seus dados de perfil. O username é o seu identificador público e a segunda forma de login: não muda.
        </p>
      </header>

      <div className="grid lg:grid-cols-[320px_1fr] gap-6 items-start">
        {/* Cartão de identidade */}
        <div className="border-2 border-[var(--mn-line)] bg-[var(--mn-ink-2)] p-6 space-y-4 text-center">
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
          <input ref={fileRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={handleAvatar} />
          <Button onClick={() => fileRef.current?.click()} disabled={uploading} variant="ghost" className="w-full">
            <Camera size={14} /> {uploading ? 'ENVIANDO...' : 'TROCAR FOTO'}
          </Button>

          <p className="font-display text-xl text-[var(--mn-paper)] uppercase">{user.name}</p>
          <p className="font-pixel text-xs text-[var(--mn-yellow)]">@{user.username || 'sem-username'}</p>
          <p className="text-xs text-[var(--mn-mute)] break-all">{user.email}</p>
          <p className="font-pixel text-[11px] uppercase text-[var(--mn-mute)]">
            {user.isCreator ? 'Escritor' : 'Leitor'}
            {user.sex && user.sex !== 'NAO_INFORMADO' ? ` · ${user.sex}` : ''}
          </p>
        </div>

        {/* Configurações */}
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
                onChange={(e) => setUsernameDraft(e.target.value.toLowerCase())}
                placeholder="ex.: teofilo"
              />
              <Button onClick={claimUsername} disabled={saving || usernameStatus === 'taken'}>DEFINIR USERNAME</Button>

              {usernameStatus === 'checking' && (
                <p className="font-pixel text-[11px] uppercase text-[var(--mn-mute)]">verificando disponibilidade...</p>
              )}
              {usernameStatus === 'free' && (
                <p className="font-pixel text-[11px] uppercase text-[var(--mn-teal)]">@
{usernameDraft.trim().toLowerCase()} esta livre</p>
              )}
              {usernameStatus === 'taken' && (
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-pixel text-[11px] uppercase text-[var(--mn-red)]">
                    @
{usernameDraft.trim().toLowerCase()} ja esta em uso
                  </p>
                  {usernameSuggestion && (
                    <button
                      type="button"
                      onClick={() => setUsernameDraft(usernameSuggestion)}
                      className="font-pixel text-[11px] uppercase text-[var(--mn-yellow)] hover:underline"
                    >
                      usar @
{usernameSuggestion}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="border-2 border-[var(--mn-line)] bg-[var(--mn-ink-2)] p-6 space-y-4">
            <h2 className="font-display text-xl text-[var(--mn-paper)] uppercase">Visibilidade do perfil</h2>
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
                {isPublic ? 'Perfil público' : 'Perfil privado'}
              </span>
            </div>
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
          </div>

          {/* Candidatura a escritor: os dados de leitor são herdados; falta só UM link. */}
          {!user.isCreator && (
            <div className="border-2 border-[var(--mn-teal)] bg-[var(--mn-ink-2)] p-6 space-y-4">
              <h2 className="font-display text-xl text-[var(--mn-paper)] uppercase flex items-center gap-2">
                <UserPlus size={18} className="text-[var(--mn-teal)]" /> Quero publicar como escritor
              </h2>
              <p className="text-sm text-[var(--mn-mute)]">
                Leitor lê, curte, comenta e usa a biblioteca. Para publicar, informe <strong>um</strong> vínculo
                social (Instagram, YouTube ou portfólio) — os links são opcionais, mas <strong>um é obrigatório</strong>.
                Seu nome, foto e username são herdados da conta de leitor: não precisa repetir nada.
              </p>
              {!showWriterForm ? (
                <Button onClick={() => setShowWriterForm(true)}>PREENCHER DADOS</Button>
              ) : (
                <form className="space-y-4" onSubmit={applyAsWriter}>
                  <Field label="LINK DO INSTAGRAM (opcional)" value={instagramUrl} onChange={(e) => setInstagramUrl(e.target.value)} placeholder="https://instagram.com/seuperfil" />
                  <Field label="LINK DO YOUTUBE (opcional)" value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} placeholder="https://youtube.com/@seucanal" />
                  <Field label="LINK DE PORTFÓLIO (opcional)" value={portfolioUrl} onChange={(e) => setPortfolioUrl(e.target.value)} placeholder="https://behance.net/seuportfolio" />
                  <div className="flex flex-wrap gap-3">
                    <Button type="submit" disabled={applying}>CRIAR PERFIL DE ESCRITOR</Button>
                    <Button type="button" variant="ghost" onClick={() => setShowWriterForm(false)}>CANCELAR</Button>
                  </div>
                </form>
              )}
            </div>
          )}

          {message && <p role="status" className="font-pixel text-xs text-[var(--mn-teal)] uppercase">{message}</p>}
          {error && <p role="alert" className="font-pixel text-xs text-[var(--mn-red)] uppercase">{error}</p>}

          <div className="border-2 border-[var(--mn-line)] bg-[var(--mn-ink-2)] p-6 space-y-3">
            <h2 className="font-display text-xl text-[var(--mn-paper)] uppercase">Dados e privacidade</h2>
            <Button variant="ghost" onClick={() => void userApi.exportMyData()}>
              <ShieldCheck size={14} /> EXPORTAR MEUS DADOS (LGPD)
            </Button>
            <Button variant="ghost" onClick={() => void logout()}>
              <LogOut size={14} /> SAIR DA CONTA
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

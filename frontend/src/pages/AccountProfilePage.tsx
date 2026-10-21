import { useEffect, useRef, useState } from 'react';
import { Camera, Eye, EyeOff, ShieldCheck, UserPlus, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { storageApi } from '../api/storageApi';
import { userApi } from '../api/authApi';
import { Button } from '../components/ui/Button';
import { Field } from '../components/ui/Field';

/**
 * "Minha conta": o perfil do titular — foto, nome, username, sexo e a decisão de
 * ficar público ou privado. É a página de perfil por dentro (o painel do criador tem
 * telas próprias).
 */
export function AccountProfilePage({ onOpenPublicProfile }: { onOpenPublicProfile: (username: string) => void }) {
  const { user, saveProfile, becomeWriter, logout, refreshSession } = useAuth();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl);
  const [isPublic, setIsPublic] = useState(user.profilePublic ?? true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Formulário de candidatura a escritor (exige vínculo social).
  const [showWriterForm, setShowWriterForm] = useState(!user.isCreator);
  const [usernameDraft, setUsernameDraft] = useState(user.username ?? '');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [handle, setHandle] = useState('');
  const [applying, setApplying] = useState(false);

  // Username só pode ser reivindicado uma vez, enquanto o identificador ainda é o gerado.
  const usernameIsGenerated = (user.username ?? '').startsWith('user_');

  const claimUsername = async () => {
    setSaving(true);
    setError(null);
    try {
      await userApi.updateProfile({ username: usernameDraft } as { username?: string });
      await refreshSession();
      setMessage('Username definido. Ele não muda mais.');
    } catch (err: any) {
      setError(err?.message || 'Não foi possível definir o username.');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    setAvatarUrl(user.avatarUrl);
    setIsPublic(user.profilePublic ?? true);
  }, [user.avatarUrl, user.profilePublic]);

  const handleAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const stored = await storageApi.uploadAvatar(file);
      setAvatarUrl(stored.url);
      await saveProfile({ avatarUrl: stored.url });
      setMessage('Foto de perfil atualizada.');
    } catch {
      setError('Não foi possível enviar a foto. Use JPEG ou PNG.');
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
        handle: handle || undefined,
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
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="relative mx-auto block w-32 h-32 rounded-full overflow-hidden border-2 border-[var(--mn-yellow)] focus-visible:outline"
            title="Trocar foto de perfil"
          >
            <img
              src={avatarUrl || '/avatar-placeholder.png'}
              alt="Foto de perfil"
              className="w-full h-full object-cover bg-[#1F2833]"
            />
            <span className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 focus-within:opacity-100 transition-opacity">
              <Camera size={22} className="text-[var(--mn-paper)]" />
            </span>
          </button>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={handleAvatar} />

          <p className="font-display text-xl text-[var(--mn-paper)] uppercase">{user.name}</p>
          <p className="font-pixel text-xs text-[var(--mn-yellow)]">@{user.username || 'sem-username'}</p>
          <p className="text-xs text-[var(--mn-mute)] break-all">{user.email}</p>
          <p className="font-pixel text-[11px] uppercase text-[var(--mn-mute)]">
            {user.isCreator ? 'Escritor' : 'Leitor'}
            {user.sex && user.sex !== 'NAO_INFORMADO' ? ` · ${user.sex}` : ''}
          </p>
          {uploading && <p className="font-pixel text-[11px] text-[var(--mn-mute)] uppercase">Enviando foto...</p>}
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
              <Button onClick={claimUsername} disabled={saving}>DEFINIR USERNAME</Button>
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
          </div>

          {/* Candidatura a escritor */}
          {!user.isCreator && (
            <div className="border-2 border-[var(--mn-teal)] bg-[var(--mn-ink-2)] p-6 space-y-4">
              <h2 className="font-display text-xl text-[var(--mn-paper)] uppercase flex items-center gap-2">
                <UserPlus size={18} className="text-[var(--mn-teal)]" /> Quero publicar como escritor
              </h2>
              <p className="text-sm text-[var(--mn-mute)]">
                Leitor lê, curte, comenta e usa a biblioteca. Para publicar, informe pelo menos um
                vínculo social (Instagram, YouTube ou portfólio).
              </p>
              {!showWriterForm ? (
                <Button onClick={() => setShowWriterForm(true)}>PREENCHER DADOS</Button>
              ) : (
                <form className="space-y-4" onSubmit={applyAsWriter}>
                  <Field label="USERNAME / @ DO AUTOR" value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="ex.: teofilo" />
                  <Field label="LINK DO INSTAGRAM" value={instagramUrl} onChange={(e) => setInstagramUrl(e.target.value)} placeholder="https://instagram.com/seuperfil" />
                  <Field label="LINK DO YOUTUBE" value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} placeholder="https://youtube.com/@seucanal" />
                  <Field label="LINK DE PORTFÓLIO" value={portfolioUrl} onChange={(e) => setPortfolioUrl(e.target.value)} placeholder="https://behance.net/seuportfolio" />
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

import { useEffect, useState } from 'react';
import { EyeOff, Instagram, Youtube, Link2, Users, BookOpen, Heart, UserPlus } from 'lucide-react';
import { authApi } from '../api/authApi';
import { creatorApi } from '../api/creatorApi';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';

/** Perfil público de um usuário — a página que os demais visitam. */
export interface PublicProfile {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  isCreator: boolean;
  profilePublic: boolean;
  creatorHandle: string | null;
  bio: string | null;
  instagramUrl: string | null;
  youtubeUrl: string | null;
  portfolioUrl: string | null;
  followerCount: number;
  publicWorkCount: number;
  likedWorkCount: number;
  joinedAt: string | null;
}

export function PublicProfilePage({ username }: { username: string }) {
  const { user, isAuthenticated } = useAuth();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [following, setFollowing] = useState(false);
  const [followers, setFollowers] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    authApi
      .getPublicProfile(username)
      .then((payload) => {
        if (!active) return;
        setProfile(payload);
        setFollowers(payload.followerCount);
      })
      .catch(() => {
        if (active) setError('Perfil não encontrado.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [username]);

  const toggleFollow = async () => {
    if (!profile?.creatorHandle) return;
    setBusy(true);
    try {
      const result = following
        ? await creatorApi.unfollowCreator(profile.creatorHandle)
        : await creatorApi.followCreator(profile.creatorHandle);
      setFollowers(result.followers);
      setFollowing(result.following);
    } catch {
      setError('Não foi possível atualizar o seguidor.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <section className="mn-container py-16 text-center">
        <p className="font-pixel text-xs text-[var(--mn-mute)] uppercase">Carregando perfil...</p>
      </section>
    );
  }

  if (error || !profile) {
    return (
      <section className="mn-container py-16 text-center">
        <h1 className="font-display text-3xl text-[var(--mn-paper)] uppercase">Perfil não encontrado</h1>
        <p className="mt-2 text-sm text-[var(--mn-mute)]">{error}</p>
      </section>
    );
  }

  const isOwnProfile = isAuthenticated && user.username?.toLowerCase() === profile.username.toLowerCase();

  return (
    <section className="mn-container py-10 space-y-6">
      <header className="border-2 border-[var(--mn-line)] bg-[var(--mn-ink-2)] p-6 sm:p-8 flex flex-col sm:flex-row gap-6">
        <img
          src={profile.avatarUrl || '/avatar-placeholder.png'}
          alt={profile.displayName || profile.username}
          className="w-28 h-28 rounded-full object-cover border-2 border-[var(--mn-yellow)] bg-[#1F2833]"
        />

        <div className="flex-1 space-y-3">
          <p className="font-pixel text-[11px] uppercase tracking-widest text-[var(--mn-yellow)]">
            {profile.isCreator ? 'Escritor' : 'Leitor'}
          </p>
          <h1 className="font-display text-3xl sm:text-4xl text-[var(--mn-paper)] uppercase break-words">
            @{profile.username}
          </h1>
          {profile.profilePublic ? (
            <>
              {profile.displayName && (
                <p className="font-body text-lg text-[var(--mn-paper)]">{profile.displayName}</p>
              )}
              {profile.bio && <p className="font-body text-sm text-[var(--mn-mute)]">{profile.bio}</p>}

              <div className="grid grid-cols-3 gap-3 pt-2">
                <Stat label="Seguidores" value={profile.isCreator ? followers : 0} icon={<Users size={14} />} />
                <Stat label="Obras públicas" value={profile.publicWorkCount} icon={<BookOpen size={14} />} />
                <Stat label="Curtidas" value={profile.likedWorkCount} icon={<Heart size={14} />} />
              </div>

              {(profile.instagramUrl || profile.youtubeUrl || profile.portfolioUrl) && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {profile.instagramUrl && <SocialLink href={profile.instagramUrl} label="Instagram" icon={<Instagram size={14} />} />}
                  {profile.youtubeUrl && <SocialLink href={profile.youtubeUrl} label="YouTube" icon={<Youtube size={14} />} />}
                  {profile.portfolioUrl && <SocialLink href={profile.portfolioUrl} label="Portfólio" icon={<Link2 size={14} />} />}
                </div>
              )}

              {profile.isCreator && profile.creatorHandle && !isOwnProfile && (
                <div className="pt-2">
                  <Button onClick={toggleFollow} disabled={busy || !isAuthenticated} variant={following ? 'ghost' : 'primary'}>
                    <UserPlus size={14} /> {following ? 'DEIXAR DE SEGUIR' : 'SEGUIR'}
                  </Button>
                  {!isAuthenticated && (
                    <p className="mt-2 font-pixel text-[11px] text-[var(--mn-mute)] uppercase">
                      Entre na sua conta para seguir.
                    </p>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="flex items-start gap-2 border-2 border-[var(--mn-line)] bg-[var(--mn-ink)] p-4">
              <EyeOff size={16} className="text-[var(--mn-mute)] mt-0.5" />
              <p className="font-body text-sm text-[var(--mn-mute)]">
                Este perfil é privado. O username aparece nos comentários, mas os dados do titular não são
                exibidos.
              </p>
            </div>
          )}
        </div>
      </header>
    </section>
  );
}

function Stat({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="border-2 border-[var(--mn-line)] bg-[var(--mn-ink)] p-3">
      <p className="font-pixel text-[10px] uppercase text-[var(--mn-mute)] flex items-center gap-1">
        {icon} {label}
      </p>
      <p className="font-display text-2xl text-[var(--mn-paper)] mt-1">{value}</p>
    </div>
  );
}

/**
 * Link social validado no servidor (allowlist de host + HTTPS). Renderizado como texto e
 * com `rel="noopener noreferrer"` — nunca como HTML.
 */
function SocialLink({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 border-2 border-[var(--mn-line)] px-3 py-1.5 font-pixel text-[11px] uppercase text-[var(--mn-paper)] hover:border-[var(--mn-yellow)] hover:text-[var(--mn-yellow)] transition-colors"
    >
      {icon} {label}
    </a>
  );
}

import { useEffect, useState } from 'react';
import { BookOpen, FileText } from 'lucide-react';
import { creatorApi, CreatorPublicProfileDto } from '../api/creatorApi';
import { useAuth } from '../context/AuthContext';

/**
 * Capítulos do criador: as obras publicadas e seus capítulos.
 * A lista vem do perfil público do autor (endpoint `GET /api/creators/{handle}`) —
 * nada é inventado no front.
 */
export function CreatorChaptersPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<CreatorPublicProfileDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handle = user.creatorHandle;

  useEffect(() => {
    if (!handle) {
      setError('Entre com uma conta de criador para ver seus capítulos.');
      setLoading(false);
      return;
    }
    let active = true;
    creatorApi
      .getPublicProfile(handle)
      .then((payload) => {
        if (active) setProfile(payload);
      })
      .catch(() => {
        if (active) setError('Não foi possível carregar suas obras.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [handle]);

  return (
    <section className="mn-container py-10 space-y-8">
      <header className="border-2 border-[var(--mn-yellow)] bg-[var(--mn-ink-2)] p-6 shadow-[6px_6px_0_var(--mn-yellow)]">
        <p className="font-pixel text-[11px] tracking-widest text-[var(--mn-mute)] uppercase">Criador</p>
        <h1 className="font-display text-3xl sm:text-4xl text-[var(--mn-paper)] uppercase mt-1 flex items-center gap-3">
          <FileText size={26} className="text-[var(--mn-yellow)]" /> Capítulos
        </h1>
        <p className="mt-2 text-sm text-[var(--mn-mute)]">
          Obras publicadas e o total de capítulos de cada uma. Para publicar um capítulo novo, use
          “Minhas obras”.
        </p>
      </header>

      {error && <p role="alert" className="font-pixel text-xs text-[var(--mn-red)] uppercase">{error}</p>}
      {loading && <p className="font-pixel text-xs text-[var(--mn-mute)] uppercase">Carregando...</p>}

      {profile && !loading && (
        <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(profile.works ?? []).length === 0 && (
            <li className="font-pixel text-xs text-[var(--mn-mute)] uppercase">Nenhuma obra publicada ainda.</li>
          )}
          {(profile.works ?? []).map((work) => (
            <li key={work.id} className="border-2 border-[var(--mn-line)] bg-[var(--mn-ink-2)] p-4 space-y-2">
              <p className="font-display text-lg text-[var(--mn-paper)] uppercase flex items-center gap-2">
                <BookOpen size={16} className="text-[var(--mn-yellow)]" /> {work.title}
              </p>
              <p className="font-pixel text-[11px] uppercase text-[var(--mn-mute)]">
                {work.totalChapters} capítulo(s) · {work.totalViews} visualizações · {work.totalLikes} curtidas
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

import { useState } from 'react';
import { Instagram, Youtube, Link2, UserPlus, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Field } from '../components/ui/Field';

/**
 * Candidatura a escritor — página própria.
 *
 * <p>Separada de "Minha conta" de propósito: antes os mesmos campos apareciam nas duas
 * telas (duplicidade confusa). Aqui a regra fica explícita: <strong>um</strong> dos três
 * vínculos é obrigatório, o nome/foto/username são herdados da conta de leitor e
 * <strong>o perfil do escritor é sempre público</strong> — não existe opção de privado.</p>
 */
export function BecomeWriterPage({ onBackToAccount }: { onBackToAccount: () => void }) {
  const { user, becomeWriter } = useAuth();
  const [instagramUrl, setInstagramUrl] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const links = [instagramUrl.trim(), youtubeUrl.trim(), portfolioUrl.trim()].filter(Boolean);
  const hasAtLeastOne = links.length > 0;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!hasAtLeastOne) {
      setError('Informe pelo menos um vínculo social (Instagram, YouTube ou portfólio).');
      return;
    }
    setApplying(true);
    setError(null);
    try {
      await becomeWriter({
        instagramUrl: instagramUrl.trim() || undefined,
        youtubeUrl: youtubeUrl.trim() || undefined,
        portfolioUrl: portfolioUrl.trim() || undefined,
      });
      setDone(true);
    } catch (err: any) {
      setError(err?.message || 'Não foi possível criar o perfil de escritor.');
    } finally {
      setApplying(false);
    }
  };

  if (user.isCreator) {
    return (
      <section className="mn-container py-10 space-y-6">
        <div className="border-2 border-[var(--mn-teal)] bg-[var(--mn-ink-2)] p-6 shadow-[6px_6px_0_var(--mn-teal)]">
          <h1 className="font-display text-3xl text-[var(--mn-paper)] uppercase">Você já é escritor</h1>
          <p className="mt-2 text-sm text-[var(--mn-mute)]">
            O painel do autor tem tudo o que é preciso: foto, bio, vínculos e as obras publicadas.
          </p>
          <Button className="mt-4" onClick={onBackToAccount}>
            IR PARA MINHA CONTA
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="mn-container py-10 space-y-6">
      <header className="border-2 border-[var(--mn-yellow)] bg-[var(--mn-ink-2)] p-6 shadow-[6px_6px_0_var(--mn-yellow)]">
        <p className="font-pixel text-[11px] tracking-widest text-[var(--mn-mute)] uppercase">Programa de criadores</p>
        <h1 className="font-display text-3xl sm:text-4xl text-[var(--mn-paper)] uppercase mt-1 flex items-center gap-3">
          <UserPlus size={26} className="text-[var(--mn-yellow)]" /> Quero publicar como escritor
        </h1>
        <p className="mt-2 text-sm text-[var(--mn-mute)]">
          Leitor lê, curte, comenta e usa a biblioteca. Para publicar, o servidor exige
          <strong className="text-[var(--mn-paper)]"> um único vínculo social</strong> (Instagram, YouTube ou
          portfólio) — os três campos são opcionais, mas um é obrigatório. Seu nome, foto e username
          são herdados da conta de leitor: não precisa repetir nada.
        </p>
      </header>

      <div className="grid lg:grid-cols-[1fr_320px] gap-6 items-start">
        <form onSubmit={submit} className="border-2 border-[var(--mn-line)] bg-[var(--mn-ink-2)] p-6 space-y-4">
          <h2 className="font-display text-xl text-[var(--mn-paper)] uppercase">Seus vínculos</h2>
          <p className="font-pixel text-[11px] uppercase text-[var(--mn-mute)]">
            Preencha um — ou mais de um, se quiser.
          </p>

          <Field
            label="LINK DO INSTAGRAM (opcional)"
            value={instagramUrl}
            onChange={(event) => setInstagramUrl(event.target.value)}
            placeholder="https://instagram.com/seuperfil"
          />
          <Field
            label="LINK DO YOUTUBE (opcional)"
            value={youtubeUrl}
            onChange={(event) => setYoutubeUrl(event.target.value)}
            placeholder="https://youtube.com/@seucanal"
          />
          <Field
            label="LINK DE PORTFÓLIO (opcional)"
            value={portfolioUrl}
            onChange={(event) => setPortfolioUrl(event.target.value)}
            placeholder="https://behance.net/seuportfolio"
          />

          {error && (
            <p role="alert" className="border-2 border-[var(--mn-red)] p-3 font-body text-sm text-[var(--mn-paper)]">
              {error}
            </p>
          )}

          {done ? (
            <p role="status" className="border-2 border-[var(--mn-teal)] p-3 font-body text-sm text-[var(--mn-paper)]">
              Perfil de escritor criado! Já pode publicar no painel do autor.
            </p>
          ) : (
            <Button type="submit" variant="primary" disabled={applying || !hasAtLeastOne}>
              {applying ? 'CRIANDO...' : 'CRIAR PERFIL DE ESCRITOR'}
            </Button>
          )}
          {!hasAtLeastOne && (
            <p className="font-pixel text-[11px] uppercase text-[var(--mn-mute)]">
              Preencha pelo menos um vínculo para liberar o botão.
            </p>
          )}
        </form>

        <aside className="border-2 border-[var(--mn-teal)] bg-[var(--mn-ink-2)] p-6 space-y-3">
          <h2 className="font-display text-lg text-[var(--mn-paper)] uppercase">O que vai acontecer</h2>
          <ul className="space-y-2 font-body text-xs text-[var(--mn-mute)]">
            <li className="flex items-start gap-2">
              <Instagram size={14} className="text-[var(--mn-yellow)] mt-0.5" />
              O leitor vê seus links no perfil público do autor.
            </li>
            <li className="flex items-start gap-2">
              <Youtube size={14} className="text-[var(--mn-yellow)] mt-0.5" />
              Você ganha o painel do autor: obras, capítulos, missões, analytics e monetização.
            </li>
            <li className="flex items-start gap-2">
              <Link2 size={14} className="text-[var(--mn-yellow)] mt-0.5" />
              Seu identificador público continua sendo o seu username.
            </li>
            <li className="flex items-start gap-2">
              <ShieldCheck size={14} className="text-[var(--mn-yellow)] mt-0.5" />
              O perfil do escritor é <strong className="text-[var(--mn-paper)]">sempre público</strong> — não
              existe a opção de deixar privado.
            </li>
          </ul>
        </aside>
      </div>
    </section>
  );
}

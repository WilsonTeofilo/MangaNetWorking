import { Button } from '../../ui/Button';

interface MangaPublishStepProps {
  workTitle: string;
  releaseDate: string;
  busy: boolean;
  publish: () => void;
}

export function MangaPublishStep({
  workTitle,
  releaseDate,
  busy,
  publish,
}: MangaPublishStepProps) {
  return (
    <section className="border-2 border-[var(--mn-yellow)] bg-[var(--mn-ink-2)] p-5 space-y-4">
      <h3 className="font-display text-xl text-[var(--mn-paper)] uppercase">Publicar capítulo</h3>
      <p className="font-body text-xs text-[var(--mn-mute)]">
        O capítulo entra na obra <strong className="text-[var(--mn-paper)]">{workTitle}</strong> e fica
        disponível no catálogo
        {releaseDate ? ' na data escolhida.' : ' imediatamente.'}
      </p>
      <Button onClick={publish} disabled={busy} variant="primary" className="!px-6">
        {busy ? 'PUBLICANDO...' : releaseDate ? 'AGENDAR CAPÍTULO' : 'PUBLICAR CAPÍTULO'}
      </Button>
    </section>
  );
}

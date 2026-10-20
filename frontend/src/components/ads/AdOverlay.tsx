import { useEffect, useState } from 'react';

export type AdSlot = 'start' | 'mid' | 'end';

export interface AdOverlayProps {
  open: boolean;
  slot: AdSlot;
  workTitle: string;
  creatorName: string;
  /** Duração em segundos do anúncio. */
  seconds?: number;
  onComplete: () => void;
}

const SLOT_LABEL: Record<AdSlot, string> = {
  start: 'ABERTURA DO CAPÍTULO',
  mid: 'INTERVALO DE LEITURA',
  end: 'FIM DO CAPÍTULO',
};

// Criativo fictício de demonstração, sem impressão financeira nem receita real.
const FAKE_SPONSOR = {
  name: 'BANCA DO ZÉ',
  headline: 'MANGÁS USADOS, 2 PELO PREÇO DE 1',
  body: 'Av. do Fliperama, 42 — chega mais, otaku.',
};

/**
 * Overlay de anúncio com contagem regressiva.
 * - Bloqueia a leitura até o tempo terminar.
 * - Impossível de fechar clicando fora ou com Esc: o backdrop não tem onClick e não
 *   há X de fechar antes de `done` (contagem regressiva concluída).
 * - Ao final, um X de fechar aparece e libera a leitura de onde o leitor parou.
 */
export function AdOverlay({
  open,
  slot,
  workTitle,
  creatorName,
  seconds = 15,
  onComplete,
}: AdOverlayProps) {
  const [remaining, setRemaining] = useState(seconds);

  // Contagem regressiva baseada em relógio real (imune a throttling de aba em background).
  useEffect(() => {
    if (!open) {
      return;
    }
    setRemaining(seconds);
    const startedAt = Date.now();
    const id = window.setInterval(() => {
      const left = seconds - Math.floor((Date.now() - startedAt) / 1000);
      setRemaining(left > 0 ? left : 0);
      if (left <= 0) {
        window.clearInterval(id);
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [open, seconds]);

  // Trava o scroll do documento enquanto o anúncio está aberto.
  useEffect(() => {
    if (!open) {
      return;
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // Estado derivado: tempo esgotado (necessário antes dos efeitos de bloqueo).
  const done = remaining <= 0;
  const progress = ((seconds - remaining) / seconds) * 100;

  // "Breque forte": impedir fechamento por ESC / clique fora até o tempo acabar.
  useEffect(() => {
    if (!open || done) {
      return;
    }
    const block = (e: KeyboardEvent | MouseEvent) => {
      if (e.type === 'keydown' && (e as KeyboardEvent).key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    document.addEventListener('keydown', block, true);
    return () => {
      document.removeEventListener('keydown', block, true);
    };
  }, [open, done]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[100] bg-[var(--mn-ink)] flex items-center justify-center p-4 select-none"
      role="dialog"
      aria-modal="true"
      aria-label={`Anúncio — ${SLOT_LABEL[slot]}`}
      // backdrop sem onClick: impossível fechar clicando fora
    >
      <div className="relative w-full max-w-lg border-2 border-[var(--mn-yellow)] bg-[var(--mn-ink-2)] shadow-[8px_8px_0_var(--mn-yellow)] overflow-hidden">
        {/* Cabeçalho: contagem regressiva fixa + X de fechar (só quando pronto) */}
        <div className="flex items-center justify-between bg-[var(--mn-yellow)] text-[var(--mn-ink)] px-3 py-2 border-b-2 border-[var(--mn-ink)]">
          <span className="font-pixel text-[12px] uppercase tracking-wider font-bold">
            PUBLICIDADE · {SLOT_LABEL[slot]}
          </span>
          <span className="font-pixel text-[14px] tabular-nums font-bold">{remaining}s</span>

          {/* X de fechar: aparece SOMENTE após a contagem regressiva acabar */}
          {done && (
            <button
              type="button"
              onClick={onComplete}
              aria-label="Fechar anúncio e continuar a leitura"
              className="absolute top-1 right-1 w-7 h-7 flex items-center justify-center font-display text-lg text-[var(--mn-ink)] border-2 border-[var(--mn-ink)] bg-[var(--mn-paper)] hover:scale-110 hover:bg-[var(--mn-red)] hover:text-[var(--mn-paper)] transition-all duration-300 ease-out cursor-pointer"
            >
              ×
            </button>
          )}
        </div>

        {/* Criativo fictício */}
        <div className="relative p-6 text-center bg-[var(--mn-ink)]">
          <div className="absolute inset-0 mn-halftone opacity-10 pointer-events-none" />
          <span className="relative font-pixel text-[12px] text-[var(--mn-yellow)] tracking-widest uppercase">
            {FAKE_SPONSOR.name}
          </span>
          <h3 className="relative font-display text-2xl sm:text-3xl text-[var(--mn-paper)] uppercase mt-2 leading-tight">
            {FAKE_SPONSOR.headline}
          </h3>
          <p className="relative font-body text-sm text-[var(--mn-mute)] mt-2">{FAKE_SPONSOR.body}</p>
          <p className="relative font-body text-[12px] text-[var(--mn-mute)] mt-4 border-t border-[var(--mn-line)] pt-3">
            Intervalo demonstrativo de leitura · {creatorName} · {workTitle}
          </p>
        </div>

        {/* Barra de progresso da contagem */}
        <div className="h-1 bg-[var(--mn-ink)]">
          <div
            className="h-full bg-[var(--mn-yellow)] transition-all duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Sem botão CTA: o anúncio só sai pelo X após o tempo. */}
      </div>
    </div>
  );
}

import { useState } from 'react';
import { MIN_SAMPLE, number, percent } from './analyticsFormatters';

interface CreatorRetentionCurveProps {
  rows: { page: number; readers: number; retentionPercent: number }[];
  sampleReaders: number;
}

export function CreatorRetentionCurve({ rows, sampleReaders }: CreatorRetentionCurveProps) {
  const [active, setActive] = useState<number | null>(null);

  if (rows.length === 0) {
    return <p className="font-pixel text-xs uppercase text-[var(--mn-mute)]">Sem dados de retenção.</p>;
  }
  if (sampleReaders < MIN_SAMPLE) {
    return (
      <div className="space-y-2 border-2 border-dashed border-[var(--mn-line)] p-4">
        <p className="font-pixel text-[10px] uppercase text-[var(--mn-mute)]">
          Dados insuficientes para detalhar a curva
        </p>
        <p className="font-body text-xs text-[var(--mn-mute)]">
          Amostra atual: {number(sampleReaders)} {sampleReaders === 1 ? 'leitor' : 'leitores'}. O
          detalhamento por página é exibido a partir de {MIN_SAMPLE} leitores na janela, para não
          expor comportamento individual. Os totais acima continuam reais.
        </p>
      </div>
    );
  }

  const activeRow = active !== null ? rows[active] : null;

  return (
    <div>
      {activeRow && (
        <p role="status" aria-live="polite" className="mb-2 font-body text-xs text-[var(--mn-paper)]">
          Página {activeRow.page}: {number(activeRow.readers)} leitores chegaram (
          {percent(activeRow.retentionPercent)}).
        </p>
      )}
      <ul className="space-y-1.5">
        {rows.map((row, index) => (
          <li key={row.page}>
            <button
              type="button"
              className="flex w-full items-center gap-2 border border-transparent px-0 py-0.5 text-left hover:border-[var(--mn-line)] focus-visible:outline focus-visible:outline-1 focus-visible:outline-[var(--mn-yellow)]"
              onMouseEnter={() => setActive(index)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(index)}
              onBlur={() => setActive(null)}
              onClick={() => setActive(index)}
              aria-label={`Página ${row.page}: ${row.readers} leitores, ${percent(row.retentionPercent)}`}
            >
              <span className="w-14 shrink-0 font-pixel text-[10px] text-[var(--mn-mute)]">PÁG. {row.page}</span>
              <span className="h-3 min-w-0 flex-1 bg-[var(--mn-ink)]">
                <span
                  className="block h-full bg-[var(--mn-teal)]"
                  style={{ width: `${Math.min(100, row.retentionPercent)}%` }}
                />
              </span>
              <span className="w-20 shrink-0 text-right font-pixel text-[10px] text-[var(--mn-paper)] tabular-nums">
                {number(row.readers)} ({percent(row.retentionPercent)})
              </span>
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-2 font-body text-[10px] leading-snug text-[var(--mn-mute)]">
        Base: {number(sampleReaders)}{' '}
        {sampleReaders === 1 ? 'leitor com progresso registrado' : 'leitores com progresso registrado'}. É
        progresso observado, não confirmação de que a pessoa olhou cada página nem causalidade.
      </p>
    </div>
  );
}

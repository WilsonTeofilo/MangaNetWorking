import { CreatorAnalyticsDto } from '../../api/creatorAnalyticsApi';
import { Win } from '../ui/Win';
import { DISCOVERY_INSTRUMENTED_AT, number } from './analyticsFormatters';

interface CreatorFunnelPanelProps {
  funnel?: CreatorAnalyticsDto['funnel'];
}

export function CreatorFunnelPanel({ funnel }: CreatorFunnelPanelProps) {
  if (!funnel) {
    return (
      <Win title="FUNIL DE DESCOBERTA.EXE">
        <p className="font-pixel text-xs uppercase text-[var(--mn-mute)]">Funil indisponível.</p>
      </Win>
    );
  }

  const stages = [
    {
      label: 'Impressões elegíveis',
      value: funnel.impressions,
      available: true,
      hint: `desde ${DISCOVERY_INSTRUMENTED_AT}`,
    },
    {
      label: 'Aberturas',
      value: funnel.openings,
      available: true,
      hint:
        funnel.attributedOpenings === 1
          ? '1 atribuída a impressão'
          : `${number(funnel.attributedOpenings)} atribuídas a impressão`,
    },
    {
      label: 'Inícios qualificados',
      value: funnel.qualifiedStarts,
      available: true,
      hint: 'primeira página realmente lida',
    },
    {
      label: 'Conclusões estimadas',
      value: funnel.completions,
      available: funnel.completions !== null,
      hint:
        funnel.completions === null
          ? 'não mensurável no formato atual'
          : 'mangá: ≥80% das páginas distintas',
    },
  ];
  const max = Math.max(1, ...stages.map((stage) => (stage.available ? Number(stage.value ?? 0) : 0)));

  return (
    <Win title="FUNIL DE DESCOBERTA.EXE">
      <ol className="space-y-2">
        {stages.map((stage) => (
          <li key={stage.label} className="min-w-0">
            <div className="min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-pixel text-[10px] uppercase text-[var(--mn-mute)]">{stage.label}</span>
                <span className="font-display text-sm text-[var(--mn-paper)] tabular-nums">
                  {stage.available ? number(Number(stage.value)) : '—'}
                </span>
              </div>
              <div className="mt-1 h-2 bg-[var(--mn-ink)]">
                <div
                  className="h-full bg-[var(--mn-yellow)]"
                  style={{
                    width:
                      stage.available && Number(stage.value ?? 0) > 0
                        ? `${Math.max(2, (Number(stage.value ?? 0) / max) * 100)}%`
                        : '0%',
                  }}
                />
              </div>
              <p className="mt-0.5 font-body text-[10px] text-[var(--mn-mute)]">{stage.hint}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-3 border-t border-[var(--mn-line)] pt-2 font-body text-[10px] leading-snug text-[var(--mn-mute)]">
        Clareza de funil: abrir não é ler. A visualização válida (início qualificado) só existe quando
        a primeira página é efetivamente alcançada; página lida alimenta a retenção, nunca uma nova
        visualização. Impressões não são reconstruídas antes de {DISCOVERY_INSTRUMENTED_AT}.
      </p>
    </Win>
  );
}

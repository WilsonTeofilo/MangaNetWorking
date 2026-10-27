export const DISPLAY_TIMEZONE = 'America/Sao_Paulo';
export const MIN_SAMPLE = 10;
export const DISCOVERY_INSTRUMENTED_AT = '22/10/2026';
export const weekdayLabels = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'] as const;

export const number = (value: number | null | undefined): string =>
  value !== null && value !== undefined && Number.isFinite(value)
    ? value.toLocaleString('pt-BR')
    : '—';

export const percent = (value: number | null | undefined): string =>
  value !== null && value !== undefined && Number.isFinite(value)
    ? `${value.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`
    : '—';

export const brl = (value: number): string =>
  Number.isFinite(value)
    ? value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : 'R$ —';

export const dateLabel = (date: string): string =>
  new Date(`${date}T12:00:00`).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

export const dateTimeLabel = (value: string | Date): string =>
  new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: DISPLAY_TIMEZONE,
  });

export const hourRangeLabel = (hour: string): string => {
  const start = new Date(hour);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const now = new Date();
  const dayKey = (value: Date) =>
    value.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: DISPLAY_TIMEZONE,
    });
  const day =
    dayKey(start) === dayKey(now)
      ? 'Hoje'
      : start.toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          timeZone: DISPLAY_TIMEZONE,
        });
  const time = (value: Date) =>
    value.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: DISPLAY_TIMEZONE,
    });
  return `${day}, ${time(start)} – ${time(end)}`;
};

export function comparisonDelta(current: number, previous: number | undefined): {
  diff: number;
  percent: number | null;
  positive: boolean | null;
} | null {
  if (previous === undefined || previous === null) return null;
  const diff = current - previous;
  if (previous === 0) {
    return { diff, percent: null, positive: diff > 0 ? true : diff < 0 ? false : null };
  }
  const pct = Math.round((diff / previous) * 100);
  return { diff, percent: pct, positive: diff > 0 ? true : diff < 0 ? false : null };
}

/**
 * O formato é o primeiro eixo de navegação do catálogo, da home, do feed e da biblioteca.
 *
 * <p>Um único lugar define rótulos, parâmetros de URL e classes do badge — para mangá e light
 * novel nunca divergirem entre telas. Tudo que é estado de UI vive na URL (validado aqui), então
 * link compartilhado, F5 e botão voltar restauram a mesma visão.</p>
 */

export type WorkFormatKey = 'MANGA' | 'LIGHT_NOVEL';
export type FormatFilter = 'all' | WorkFormatKey;

export const DEFAULT_FORMAT: FormatFilter = 'all';

export interface FormatOption {
  value: FormatFilter;
  label: string;
  /** Rótulo curto para espaços apertados (mobile). */
  shortLabel: string;
  /** Texto de apoio do seletor. */
  hint: string;
}

export const FORMAT_OPTIONS: readonly FormatOption[] = [
  { value: 'all', label: 'Tudo', shortLabel: 'Tudo', hint: 'Mangás e light novels' },
  { value: 'MANGA', label: 'Mangá', shortLabel: 'Mangá', hint: 'Capítulos em páginas ilustradas' },
  { value: 'LIGHT_NOVEL', label: 'Light novel', shortLabel: 'Novel', hint: 'Capítulos em prosa com ilustrações' },
];

export function isLightNovel(format?: string | null): boolean {
  return format === 'LIGHT_NOVEL' || format === 'PROSE';
}

export function formatLabel(format?: string | null): string {
  return isLightNovel(format) ? 'Light novel' : 'Mangá';
}

/** Parâmetro de URL (`manga` / `light-novel`) → valor do filtro. Inválido cai em "Tudo". */
export function formatFromParam(raw: string | null | undefined): FormatFilter {
  if (!raw) return DEFAULT_FORMAT;
  const key = raw.trim().toLowerCase();
  if (key === 'manga' || key === 'mangá') return 'MANGA';
  if (key === 'light-novel' || key === 'light_novel' || key === 'lightnovel' || key === 'novel') {
    return 'LIGHT_NOVEL';
  }
  return DEFAULT_FORMAT;
}

/** Valor do filtro → parâmetro de URL. "Tudo" não vai para a URL (URL limpa). */
export function formatToParam(format: FormatFilter): string | null {
  if (format === 'MANGA') return 'manga';
  if (format === 'LIGHT_NOVEL') return 'light-novel';
  return null;
}

/**
 * Rótulo do capítulo conforme o formato.
 *
 * <p>Volumes ainda não são uma entidade no domínio; quando existirem, o prefixo `Vol. X · ` entra
 * aqui (ponto único) sem tocar no card, no feed ou na home.</p>
 */
export function chapterLabel(_format: string | null | undefined, chapterNumber: number): string {
  return `Cap. ${chapterNumber}`;
}

/** Metadados do card: "12 caps" ou "Light novel · 24 caps". */
export function workMetaLine(format: string | null | undefined, totalChapters: number): string {
  const chapters = `${Math.max(totalChapters, 0)} ${totalChapters === 1 ? 'cap' : 'caps'}`;
  return isLightNovel(format) ? `Light novel · ${chapters}` : chapters;
}

/** Tempo relativo curto em pt-BR ("agora", "há 2 h", "há 3 d"). */
export function relativeTime(iso?: string | null, now: number = Date.now()): string {
  if (!iso) return '';
  const timestamp = Date.parse(iso);
  if (Number.isNaN(timestamp)) return '';
  const diffMs = Math.max(now - timestamp, 0);
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `há ${days} d`;
  const months = Math.floor(days / 30);
  if (months < 12) return `há ${months} ${months === 1 ? 'mês' : 'meses'}`;
  const years = Math.floor(months / 12);
  return `há ${years} ${years === 1 ? 'ano' : 'anos'}`;
}

/** Chave de dia local para a timeline ("Hoje", "Ontem" ou a data). */
export function dayLabel(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const startOfDay = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
  const diffDays = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);
  if (diffDays === 0) return 'Hoje';
  if (diffDays === 1) return 'Ontem';
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
}

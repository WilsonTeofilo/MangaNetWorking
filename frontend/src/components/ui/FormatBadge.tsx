import { BookOpen, PanelsTopLeft } from 'lucide-react';
import { isLightNovel } from '../../utils/formatMeta';

export interface FormatBadgeProps {
  format?: string | null;
  /** `sm` para o card; `md` para a página da obra. */
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * Badge de formato do card: fundo amarelo para mangá, papel para light novel.
 *
 * <p>Ícone + rótulo, nunca só cor: quem não distingue amarelo de creme ainda lê
 * "MANGÁ"/"NOVEL". As bordas duras e a fonte pixel seguem a identidade da banca.</p>
 */
export function FormatBadge({ format, size = 'sm', className = '' }: FormatBadgeProps) {
  const novel = isLightNovel(format);
  const label = novel ? 'Light novel' : 'Mangá';
  const Icon = novel ? BookOpen : PanelsTopLeft;

  const palette = novel
    ? 'bg-[var(--mn-paper)] text-[var(--mn-ink)] border-[var(--mn-ink)]'
    : 'bg-[var(--mn-yellow)] text-[var(--mn-ink)] border-[var(--mn-ink)]';

  const sizing =
    size === 'md'
      ? 'px-3 py-1 text-[13px] gap-1.5 shadow-[3px_3px_0_var(--mn-ink)]'
      : 'px-1.5 py-0.5 text-[12px] gap-1 shadow-[2px_2px_0_var(--mn-ink)]';

  return (
    <span
      className={`inline-flex items-center border-2 font-pixel font-bold uppercase tracking-wider select-none ${palette} ${sizing} ${className}`}
      title={novel ? 'Light novel: capítulos em prosa' : 'Mangá: capítulos em páginas'}
    >
      <Icon size={size === 'md' ? 15 : 12} aria-hidden="true" className="shrink-0" />
      <span>{label}</span>
    </span>
  );
}

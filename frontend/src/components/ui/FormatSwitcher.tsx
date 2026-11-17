import { useRef } from 'react';
import { FORMAT_OPTIONS, FormatFilter } from '../../utils/formatMeta';

export interface FormatCounts {
  all: number;
  manga: number;
  lightNovel: number;
}

export interface FormatSwitcherProps {
  value: FormatFilter;
  onChange: (next: FormatFilter) => void;
  /** Contadores por formato (mesmo recorte de busca/filtros, sem o eixo de formato). */
  counts?: FormatCounts | null;
  size?: 'md' | 'lg';
  className?: string;
}

/**
 * Seletor de formato — o mesmo componente na home, no catálogo, no feed e na biblioteca.
 *
 * <p>Não é um filtro escondido: fica sempre visível acima dos demais filtros, com três opções e
 * `aria-pressed`. Setas do teclado movem o foco entre as opções e o indicador de foco é visível.</p>
 */
export function FormatSwitcher({ value, onChange, counts, size = 'lg', className = '' }: FormatSwitcherProps) {
  const buttonsRef = useRef<Array<HTMLButtonElement | null>>([]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const nextIndex =
      event.key === 'ArrowRight'
        ? (index + 1) % FORMAT_OPTIONS.length
        : (index - 1 + FORMAT_OPTIONS.length) % FORMAT_OPTIONS.length;
    buttonsRef.current[nextIndex]?.focus();
    onChange(FORMAT_OPTIONS[nextIndex].value);
  };

  const countFor = (option: FormatFilter): number | null => {
    if (!counts) return null;
    if (option === 'all') return counts.all;
    if (option === 'MANGA') return counts.manga;
    return counts.lightNovel;
  };

  return (
    <div
      role="group"
      aria-label="Filtrar por formato"
      className={`inline-flex w-full sm:w-auto border-2 border-[var(--mn-line)] bg-[var(--mn-ink-2)] shadow-[3px_3px_0_#000000] ${className}`}
    >
      {FORMAT_OPTIONS.map((option, index) => {
        const active = option.value === value;
        const count = countFor(option.value);
        return (
          <button
            key={option.value}
            ref={(element) => {
              buttonsRef.current[index] = element;
            }}
            type="button"
            aria-pressed={active}
            title={option.hint}
            onKeyDown={(event) => handleKeyDown(event, index)}
            onClick={() => onChange(option.value)}
            className={[
              'flex-1 sm:flex-none inline-flex items-center justify-center gap-2 uppercase tracking-wide transition-colors cursor-pointer',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mn-yellow)]',
              size === 'lg' ? 'px-4 sm:px-5 py-2 text-[12px]' : 'px-3 py-1.5 text-[11px]',
              'font-pixel',
              active
                ? 'bg-[var(--mn-yellow)] text-[var(--mn-ink)] font-bold shadow-[inset_0_0_0_1px_var(--mn-ink)]'
                : 'bg-transparent text-[var(--mn-paper)] hover:text-[var(--mn-yellow)] hover:bg-[var(--mn-ink)]',
              index > 0 ? 'border-l-2 border-[var(--mn-line)]' : '',
            ].join(' ')}
          >
            <span>{option.label}</span>
            {count !== null && (
              <span
                className={`tabular-nums text-[10px] px-1 py-0.2 border ${
                  active
                    ? 'border-[var(--mn-ink)] bg-[var(--mn-ink)] text-[var(--mn-yellow)]'
                    : 'border-[var(--mn-line)] bg-[var(--mn-ink-3)] text-[var(--mn-mute)]'
                }`}
                aria-hidden="true"
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

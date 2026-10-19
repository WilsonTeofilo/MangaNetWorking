import { ReactNode } from 'react';

export interface WinProps {
  title: string;
  children: ReactNode;
  onClose?: () => void;
  className?: string;
  theme?: 'dark' | 'paper';
}

export function Win({
  title,
  children,
  onClose,
  className = '',
  theme = 'dark',
}: WinProps) {
  const isPaper = theme === 'paper';

  return (
    <article
      className={`border-2 ${
        isPaper
          ? 'border-[var(--mn-ink)] shadow-[4px_4px_0_var(--mn-ink)] bg-[var(--mn-paper)] text-[var(--mn-ink)]'
          : 'border-[var(--mn-line)] shadow-[4px_4px_0_var(--mn-paper)] bg-[var(--mn-ink-2)] text-[var(--mn-paper)]'
      } ${className}`}
    >
      <header className="h-[28px] bg-[var(--mn-yellow)] text-[var(--mn-ink)] flex items-center justify-between px-2.5 border-b-2 border-[var(--mn-ink)] select-none">
        <span className="font-pixel text-[12px] tracking-widest uppercase font-bold truncate">
          {title}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="w-[18px] h-[18px] border-[1.5px] border-[var(--mn-ink)] bg-transparent flex items-center justify-center font-bold text-[12px] leading-none hover:bg-[var(--mn-ink)] hover:text-[var(--mn-yellow)] transition-colors"
          aria-label={onClose ? 'Fechar janela' : undefined}
          aria-hidden={!onClose}
        >
          ×
        </button>
      </header>
      <div className="p-4">{children}</div>
    </article>
  );
}

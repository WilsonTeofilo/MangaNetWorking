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
          ? 'border-[#0B0B0C] shadow-[4px_4px_0_#0B0B0C] bg-[#F4EFE3] text-[#0B0B0C]'
          : 'border-[#34343A] shadow-[4px_4px_0_#F4EFE3] bg-[#151517] text-[#F4EFE3]'
      } ${className}`}
    >
      <header className="h-[28px] bg-[#FFD400] text-[#0B0B0C] flex items-center justify-between px-2.5 border-b-2 border-[#0B0B0C] select-none">
        <span className="font-pixel text-[11px] tracking-widest uppercase font-bold truncate">
          {title}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="w-[18px] h-[18px] border-[1.5px] border-[#0B0B0C] bg-transparent flex items-center justify-center font-bold text-[12px] leading-none hover:bg-[#0B0B0C] hover:text-[#FFD400] transition-colors"
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

import { useEffect, ReactNode } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  maxWidth?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'max-w-md',
}: ModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[var(--mn-ink)]/85 transition-opacity"
        onClick={onClose}
      />

      {/* Janela de Modal Retrô OS */}
      <div
        className={`relative w-full ${maxWidth} bg-[var(--mn-ink-2)] border-2 border-[var(--mn-line)] shadow-[6px_6px_0_var(--mn-yellow)] z-10 overflow-hidden text-[var(--mn-paper)] select-none`}
        role="dialog"
        aria-modal="true"
      >
        {/* Barra de Título em Amarelo com Fechador [×] */}
        <header className="h-[32px] bg-[var(--mn-yellow)] text-[var(--mn-ink)] border-b-2 border-[var(--mn-ink)] px-3 flex items-center justify-between select-none">
          <div className="flex items-center gap-2 truncate">
            <span className="font-pixel text-[12px] tracking-wider uppercase font-bold truncate">
              {title}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-5 h-5 border-[1.5px] border-[var(--mn-ink)] bg-transparent flex items-center justify-center font-bold text-sm leading-none hover:bg-[var(--mn-ink)] hover:text-[var(--mn-yellow)] transition-colors cursor-pointer"
            aria-label="Fechar janela"
          >
            ×
          </button>
        </header>

        {subtitle && (
          <div className="bg-[var(--mn-ink)] border-b border-[var(--mn-line)] px-4 py-1.5 font-body text-xs text-[var(--mn-mute)]">
            {subtitle}
          </div>
        )}

        <div className="p-5 max-h-[85vh] overflow-y-auto font-body">
          {children}
        </div>
      </div>
    </div>
  );
}

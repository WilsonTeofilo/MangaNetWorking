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
        className="fixed inset-0 bg-[#0B0B0C]/85 backdrop-blur-[2px] transition-opacity"
        onClick={onClose}
      />

      {/* Janela de Modal Retrô OS */}
      <div
        className={`relative w-full ${maxWidth} bg-[#151517] border-2 border-[#0B0B0C] shadow-[8px_8px_0_#FFD400] z-10 overflow-hidden text-[#F4EFE3] select-none`}
        role="dialog"
        aria-modal="true"
      >
        {/* Barra de Título em Amarelo com Fechador [×] */}
        <header className="h-[32px] bg-[#FFD400] text-[#0B0B0C] border-b-2 border-[#0B0B0C] px-3 flex items-center justify-between select-none">
          <div className="flex items-center gap-2 truncate">
            <span className="font-pixel text-xs tracking-wider uppercase font-bold truncate">
              {title}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-5 h-5 border-[1.5px] border-[#0B0B0C] bg-transparent flex items-center justify-center font-bold text-sm leading-none hover:bg-[#0B0B0C] hover:text-[#FFD400] transition-colors cursor-pointer"
            aria-label="Fechar janela"
          >
            ×
          </button>
        </header>

        {subtitle && (
          <div className="bg-[#212125] border-b border-[#34343A] px-4 py-1.5 font-body text-xs text-[#A9A59A]">
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

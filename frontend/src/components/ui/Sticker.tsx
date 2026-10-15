import { Lock } from 'lucide-react';

export type StickerKind = 'new' | 'members' | 'free' | 'complete' | 'hiatus';

export interface StickerProps {
  kind: StickerKind;
  rotate?: -2 | 0 | 2;
  className?: string;
  label?: string;
}

export function Sticker({
  kind,
  rotate = 0,
  className = '',
  label,
}: StickerProps) {
  let styleClasses = '';
  let defaultLabel = '';
  let showLock = false;

  switch (kind) {
    case 'new':
      styleClasses = 'bg-[#E8402F] text-[#F4EFE3] border-2 border-[#0B0B0C]';
      defaultLabel = 'NOVO';
      break;
    case 'members':
      styleClasses = 'bg-[#0B0B0C] text-[#FFD400] border-2 border-[#FFD400]';
      defaultLabel = 'MEMBROS';
      showLock = true;
      break;
    case 'free':
      styleClasses = 'bg-[#F4EFE3] text-[#0B0B0C] border-2 border-[#0B0B0C]';
      defaultLabel = 'GRÁTIS';
      break;
    case 'complete':
      styleClasses = 'bg-[#FFD400] text-[#0B0B0C] border-2 border-[#0B0B0C]';
      defaultLabel = 'COMPLETO';
      break;
    case 'hiatus':
      styleClasses = 'bg-[#212125] text-[#F4EFE3] border-2 border-[#34343A]';
      defaultLabel = 'HIATO';
      break;
  }

  const rotClass =
    rotate === -2 ? 'rotate-[-2deg]' : rotate === 2 ? 'rotate-[2deg]' : '';

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 font-pixel text-[11px] font-bold tracking-wider uppercase select-none shadow-[2px_2px_0_#0B0B0C] ${styleClasses} ${rotClass} ${className}`}
    >
      {showLock && <Lock size={10} className="stroke-[2.5]" />}
      <span>{label || defaultLabel}</span>
    </span>
  );
}

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
      styleClasses = 'bg-[var(--mn-red)] text-[var(--mn-paper)] border-2 border-[var(--mn-ink)]';
      defaultLabel = 'NOVO';
      break;
    case 'members':
      styleClasses = 'bg-[var(--mn-ink)] text-[var(--mn-yellow)] border-2 border-[var(--mn-yellow)]';
      defaultLabel = 'MEMBROS';
      showLock = true;
      break;
    case 'free':
      styleClasses = 'bg-[var(--mn-paper)] text-[var(--mn-ink)] border-2 border-[var(--mn-ink)]';
      defaultLabel = 'GRÁTIS';
      break;
    case 'complete':
      styleClasses = 'bg-[var(--mn-yellow)] text-[var(--mn-ink)] border-2 border-[var(--mn-ink)]';
      defaultLabel = 'COMPLETO';
      break;
    case 'hiatus':
      styleClasses = 'bg-[var(--mn-ink-3)] text-[var(--mn-paper)] border-2 border-[var(--mn-line)]';
      defaultLabel = 'HIATO';
      break;
  }

  const rotClass =
    rotate === -2 ? 'rotate-[-2deg]' : rotate === 2 ? 'rotate-[2deg]' : '';

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 font-pixel text-[12px] font-bold tracking-wider uppercase select-none shadow-[2px_2px_0_var(--mn-ink)] ${styleClasses} ${rotClass} ${className}`}
    >
      {showLock && <Lock size={10} className="stroke-[2.5]" />}
      <span>{label || defaultLabel}</span>
    </span>
  );
}

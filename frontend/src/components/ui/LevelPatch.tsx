import { Lock, Crown, ArrowUp, Sprout, Megaphone } from 'lucide-react';

export interface LevelPatchProps {
  level: 1 | 2 | 3 | 4;
  isUnlocked?: boolean;
  className?: string;
}

export function LevelPatch({
  level,
  isUnlocked = true,
  className = '',
}: LevelPatchProps) {
  const levels = {
    1: {
      name: 'ESTREANTE',
      bg: 'bg-[var(--mn-paper)] text-[var(--mn-ink)] border-2 border-[var(--mn-ink)]',
      icon: <Sprout size={14} />,
    },
    2: {
      name: 'EM ASCENSÃO',
      bg: 'bg-[var(--mn-yellow)] text-[var(--mn-ink)] border-2 border-[var(--mn-ink)]',
      icon: <ArrowUp size={14} className="stroke-[3]" />,
    },
    3: {
      name: 'DESTAQUE',
      bg: 'bg-[var(--mn-red)] text-[var(--mn-paper)] border-2 border-[var(--mn-ink)]',
      icon: <Megaphone size={14} />,
    },
    4: {
      name: 'MESTRE',
      bg: 'bg-[var(--mn-ink)] text-[var(--mn-yellow)] border-2 border-[var(--mn-yellow)] ring-2 ring-[var(--mn-ink)]',
      icon: <Crown size={14} className="fill-[var(--mn-yellow)]" />,
    },
  };

  const current = levels[level];

  if (!isUnlocked) {
    return (
      <div
        className={`inline-flex flex-col items-center justify-center p-2.5 border-2 border-dashed border-[var(--mn-line)] bg-[var(--mn-ink-2)] text-[var(--mn-mute)] opacity-50 select-none ${className}`}
        title={`Nível ${level} Bloqueado`}
      >
        <Lock size={16} className="mb-1 text-[var(--mn-mute)]" />
        <span className="font-logo text-xs">LV.{level}</span>
        <span className="font-pixel text-[12px] tracking-wider mt-0.5">BLOQUEADO</span>
      </div>
    );
  }

  return (
    <div
      className={`inline-flex flex-col items-center justify-center p-2.5 shadow-[3px_3px_0_var(--mn-ink)] select-none ${current.bg} ${className}`}
    >
      <div className="flex items-center gap-1">
        {current.icon}
        <span className="font-logo text-sm leading-none">LV.{level}</span>
      </div>
      <span className="font-pixel text-[12px] tracking-wider font-bold mt-1 uppercase">
        {current.name}
      </span>
    </div>
  );
}

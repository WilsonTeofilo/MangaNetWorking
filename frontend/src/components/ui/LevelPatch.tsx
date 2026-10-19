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
      bg: 'bg-[#F4EFE3] text-[#0B0B0C] border-2 border-[#0B0B0C]',
      icon: <Sprout size={14} />,
    },
    2: {
      name: 'EM ASCENSÃO',
      bg: 'bg-[#FFD400] text-[#0B0B0C] border-2 border-[#0B0B0C]',
      icon: <ArrowUp size={14} className="stroke-[3]" />,
    },
    3: {
      name: 'DESTAQUE',
      bg: 'bg-[#E8402F] text-[#F4EFE3] border-2 border-[#0B0B0C]',
      icon: <Megaphone size={14} />,
    },
    4: {
      name: 'MESTRE',
      bg: 'bg-[#0B0B0C] text-[#FFD400] border-2 border-[#FFD400] ring-2 ring-[#0B0B0C]',
      icon: <Crown size={14} className="fill-[#FFD400]" />,
    },
  };

  const current = levels[level];

  if (!isUnlocked) {
    return (
      <div
        className={`inline-flex flex-col items-center justify-center p-2.5 border-2 border-dashed border-[#34343A] bg-[#151517] text-[#A9A59A] opacity-50 select-none ${className}`}
        title={`Nível ${level} Bloqueado`}
      >
        <Lock size={16} className="mb-1 text-[#A9A59A]" />
        <span className="font-logo text-xs">LV.{level}</span>
        <span className="font-pixel text-[12px] tracking-wider mt-0.5">BLOQUEADO</span>
      </div>
    );
  }

  return (
    <div
      className={`inline-flex flex-col items-center justify-center p-2.5 shadow-[3px_3px_0_#0B0B0C] select-none ${current.bg} ${className}`}
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

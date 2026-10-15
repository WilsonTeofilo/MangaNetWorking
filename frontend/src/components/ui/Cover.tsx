import { useState } from 'react';

export interface CoverProps {
  src?: string;
  title: string;
  alt?: string;
  className?: string;
  aspectRatio?: '2/3' | '3/4';
  dropShadow?: boolean;
}

export function Cover({
  src,
  title,
  alt = '',
  className = '',
  aspectRatio = '2/3',
  dropShadow = true,
}: CoverProps) {
  const [hasError, setHasError] = useState(false);

  // Hash simples para determinar cor de fundo do fallback
  const getHashColor = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colors = [
      { bg: '#FFD400', text: '#0B0B0C', pattern: '#0B0B0C' },
      { bg: '#F4EFE3', text: '#0B0B0C', pattern: '#0B0B0C' },
      { bg: '#E8402F', text: '#F4EFE3', pattern: '#F4EFE3' },
      { bg: '#151517', text: '#FFD400', pattern: '#34343A' },
    ];
    return colors[Math.abs(hash) % colors.length];
  };

  const palette = getHashColor(title);
  const aspectClass = aspectRatio === '3/4' ? 'aspect-[3/4]' : 'aspect-[2/3]';
  const shadowClass = dropShadow ? 'shadow-[4px_4px_0_var(--drop)]' : '';

  if (!src || hasError) {
    return (
      <div
        data-placeholder="true"
        className={`w-full ${aspectClass} border-2 border-[var(--edge)] ${shadowClass} relative overflow-hidden flex flex-col justify-between p-3 select-none ${className}`}
        style={{ backgroundColor: palette.bg, color: palette.text }}
      >
        <div className="absolute inset-0 mn-halftone pointer-events-none opacity-20" />
        <span className="font-pixel text-[10px] tracking-widest uppercase opacity-70 relative z-10">
          MANGA ORIGINAL
        </span>
        <div className="relative z-10 my-auto">
          <h4 className="font-display text-xl leading-tight uppercase line-clamp-3">
            {title}
          </h4>
        </div>
        <div className="pt-2 border-t border-current opacity-40 font-pixel text-[9px] relative z-10 flex justify-between">
          <span>VOL. 01</span>
          <span>MN</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`w-full ${aspectClass} border-2 border-[var(--edge)] ${shadowClass} bg-[#151517] overflow-hidden relative ${className}`}
    >
      <img
        src={src}
        alt={alt || title}
        onError={() => setHasError(true)}
        className="w-full h-full object-cover"
        loading="lazy"
      />
    </div>
  );
}

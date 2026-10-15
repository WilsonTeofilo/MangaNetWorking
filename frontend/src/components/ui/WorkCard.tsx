import { MouseEvent } from 'react';
import { Heart } from 'lucide-react';
import { Work } from '../../types';
import { Cover } from './Cover';
import { Sticker, StickerKind } from './Sticker';

export interface WorkCardProps {
  work: Work;
  onSelect: (work: Work) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (workId: string) => void;
  badges?: StickerKind[];
  className?: string;
}

export function WorkCard({
  work,
  onSelect,
  isFavorite = false,
  onToggleFavorite,
  badges = [],
  className = '',
}: WorkCardProps) {
  const handleFavoriteClick = (e: MouseEvent) => {
    e.stopPropagation();
    if (onToggleFavorite) {
      onToggleFavorite(work.id);
    }
  };

  return (
    <article
      onClick={() => onSelect(work)}
      className={`group cursor-pointer flex flex-col select-none transition-all duration-100 ${className}`}
      title={work.title}
    >
      {/* Container da Capa 2:3 com Sombra e Ações Sobrepostas */}
      <div className="relative overflow-hidden group-hover:-translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-100">
        <Cover
          src={work.coverUrl}
          title={work.title}
          aspectRatio="2/3"
          dropShadow={true}
        />

        {/* Botão de Favoritar sobre a capa (44x44px para acessibilidade) */}
        {onToggleFavorite && (
          <button
            type="button"
            onClick={handleFavoriteClick}
            aria-pressed={isFavorite}
            aria-label={isFavorite ? `Remover ${work.title} dos favoritos` : `Favoritar ${work.title}`}
            className="absolute top-2 right-2 w-11 h-11 flex items-center justify-center bg-[#0B0B0C] border-2 border-[#F4EFE3] shadow-[2px_2px_0_#F4EFE3] hover:scale-105 transition-all z-20"
          >
            <Heart
              size={18}
              className={
                isFavorite
                  ? 'fill-[#FFD400] text-[#FFD400]'
                  : 'text-[#F4EFE3]'
              }
            />
          </button>
        )}

        {/* Badges sobre a capa (canto inferior esquerdo, máx 2) */}
        {badges.length > 0 && (
          <div className="absolute bottom-2 left-2 flex flex-col gap-1 items-start z-20 pointer-events-none">
            {badges.slice(0, 2).map((kind, idx) => (
              <Sticker key={idx} kind={kind} rotate={idx % 2 === 0 ? -2 : 2} />
            ))}
          </div>
        )}
      </div>

      {/* Título e Metadados do Card */}
      <div className="pt-2.5 flex flex-col">
        <h4 className="font-display text-lg sm:text-[20px] text-[#F4EFE3] leading-[1.05] uppercase line-clamp-2 group-hover:text-[#FFD400] transition-colors">
          {work.title}
        </h4>
        <p className="font-body text-xs sm:text-[13px] text-[#A9A59A] mt-1 truncate">
          por <span className="text-[#F4EFE3] font-medium">{work.authorName}</span> · <span className="tabular-nums">{work.totalChapters || 1} caps</span>
        </p>
      </div>
    </article>
  );
}

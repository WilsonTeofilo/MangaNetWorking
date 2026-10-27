import { MouseEvent, ReactNode } from 'react';
import { Star, Eye } from 'lucide-react';
import { Work } from '../../types';
import { AnalyticsSurface, trackOpening } from '../../api/discoveryAnalyticsApi';
import { useWorkImpression } from '../../hooks/useWorkImpression';
import { Cover } from './Cover';
import { FormatBadge } from './FormatBadge';
import { Sticker, StickerKind } from './Sticker';
import { workMetaLine } from '../../utils/formatMeta';

export interface WorkCardProps {
  work: Work;
  onSelect: (work: Work) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (workId: string) => void;
  badges?: StickerKind[];
  className?: string;
  /** Superfície real onde o card aparece; sem ela, nada é rastreado. */
  analyticsSurface?: AnalyticsSurface;
  /** Só leitor autenticado é rastreado — visitante não recebe identificador anônimo. */
  analyticsEnabled?: boolean;
  /** Linha extra (ex.: capítulo recente e tempo relativo no feed). */
  footer?: ReactNode;
  /** Esconde o badge de formato quando o contexto já deixou o formato óbvio. */
  showFormatBadge?: boolean;
}

export function WorkCard({
  work,
  onSelect,
  isFavorite = false,
  onToggleFavorite,
  badges = [],
  className = '',
  analyticsSurface,
  analyticsEnabled = false,
  footer,
  showFormatBadge = true,
}: WorkCardProps) {
  const cardRef = useWorkImpression(work.id, analyticsSurface, analyticsEnabled);

  const handleFavoriteClick = (e: MouseEvent) => {
    e.stopPropagation();
    if (onToggleFavorite) {
      onToggleFavorite(work.id);
    }
  };

  const handleSelect = () => {
    if (analyticsSurface && analyticsEnabled) {
      trackOpening(work.id, analyticsSurface);
    }
    onSelect(work);
  };

  return (
    <article
      ref={cardRef}
      onClick={handleSelect}
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
            className="absolute top-2 right-2 w-11 h-11 flex items-center justify-center bg-[var(--mn-ink)] border-2 border-[var(--mn-paper)] shadow-[2px_2px_0_var(--mn-paper)] hover:scale-105 transition-all z-20"
          >
            <Star
              size={18}
              className={
                isFavorite
                  ? 'fill-[var(--mn-yellow)] text-[var(--mn-yellow)]'
                  : 'text-[var(--mn-paper)]'
              }
            />
          </button>
        )}

        {/* Badges editoriais sobre a capa (canto superior esquerdo, máx 2) */}
        {badges.length > 0 && (
          <div className="absolute top-2 left-2 flex flex-col gap-1 items-start z-20 pointer-events-none">
            {badges.slice(0, 2).map((kind, idx) => (
              <Sticker key={idx} kind={kind} rotate={idx % 2 === 0 ? -2 : 2} />
            ))}
          </div>
        )}

        {/* Formato: canto inferior esquerdo, mesmo card para mangá e light novel */}
        {showFormatBadge && (
          <div className="absolute bottom-2 left-2 z-20 pointer-events-none">
            <FormatBadge format={work.format} />
          </div>
        )}
      </div>

      {/* Título e Metadados do Card */}
      <div className="pt-2.5 flex flex-col">
        <h4 className="font-display text-lg sm:text-[20px] text-[var(--mn-paper)] leading-[1.05] uppercase line-clamp-2 group-hover:text-[var(--mn-yellow)] transition-colors">
          {work.title}
        </h4>
        <p className="font-body text-xs sm:text-[13px] text-[var(--mn-mute)] mt-1 truncate flex items-center gap-1.5">
          {work.authorName ? (
            <>
              por <span className="text-[var(--mn-paper)] font-medium">{work.authorName}</span> ·{' '}
            </>
          ) : null}
          <span className="tabular-nums">{workMetaLine(work.format, work.totalChapters)}</span>
          <span aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1 tabular-nums" title="Visualizações da obra (soma dos capítulos)">
            <Eye size={12} aria-hidden="true" />
            {Number(work.totalViews ?? 0).toLocaleString('pt-BR')}
          </span>
          <span aria-hidden="true">·</span>
          <span
            className="inline-flex items-center gap-1 tabular-nums"
            title="Leitores que favoritaram esta obra"
          >
            <Star size={12} aria-hidden="true" className="fill-[var(--mn-yellow)] text-[var(--mn-yellow)]" />
            {Number(work.totalFavorites ?? 0).toLocaleString('pt-BR')}
          </span>
        </p>
        {footer && <div className="mt-1.5">{footer}</div>}
      </div>
    </article>
  );
}

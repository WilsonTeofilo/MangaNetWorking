import { Eye, ArrowRight, Flame } from 'lucide-react';
import { Work } from '../../types';
import { Cover } from '../ui/Cover';

export interface HomeRankingsSidebarProps {
  rankingWorks: Work[];
  onSelectWork: (work: Work) => void;
  onOpenAuthorProfile?: (authorUsername: string) => void;
  onNavigateToCatalog?: () => void;
}

/**
 * Sidebar Lateral de Rankings estilo MangaPlus adaptada ao Design System MangaNetWorking.
 * Exibe as obras Mais Visualizadas / Em Alta com posições de pódio, miniatura,
 * autor clicável e contagem de visualizações.
 */
export function HomeRankingsSidebar({
  rankingWorks,
  onSelectWork,
  onOpenAuthorProfile,
  onNavigateToCatalog,
}: HomeRankingsSidebarProps) {
  if (rankingWorks.length === 0) {
    return null;
  }

  return (
    <aside className="border-2 border-[var(--mn-line)] bg-[var(--mn-ink-2)] p-4 sm:p-5 shadow-[4px_4px_0_var(--mn-ink)] space-y-4 select-none">
      {/* Cabeçalho da Sidebar */}
      <div className="flex items-center justify-between border-b-2 border-[var(--mn-line)] pb-3">
        <div className="flex items-center gap-1.5">
          <Flame size={18} className="text-[var(--mn-yellow)]" />
          <h3 className="font-display text-lg sm:text-xl text-[var(--mn-paper)] uppercase tracking-wide">
            MAIS VISUALIZADOS
          </h3>
        </div>

        {onNavigateToCatalog && (
          <button
            type="button"
            onClick={onNavigateToCatalog}
            className="flex items-center gap-1 font-pixel text-[11px] text-[var(--mn-yellow)] hover:underline uppercase transition-colors cursor-pointer"
            title="Ver catálogo completo por visualizações"
          >
            <span>VER TODOS</span>
            <ArrowRight size={12} />
          </button>
        )}
      </div>

      {/* Lista Vertical de Obras Ranqueadas */}
      <div className="space-y-3">
        {rankingWorks.slice(0, 6).map((work, idx) => {
          const rank = idx + 1;
          const isTopOne = rank === 1;
          const isTopThree = rank <= 3;

          return (
            <article
              key={`rank-item-${work.id}`}
              onClick={() => onSelectWork(work)}
              className="flex items-center gap-3 p-2 border border-transparent hover:border-[var(--mn-line)] hover:bg-[var(--mn-ink)] transition-colors cursor-pointer group"
            >
              {/* Badge Numérico da Posição */}
              <div
                className={`w-7 h-7 shrink-0 flex items-center justify-center font-display text-sm font-bold border-2 transition-colors ${
                  isTopOne
                    ? 'bg-[var(--mn-yellow)] text-[var(--mn-ink)] border-[var(--mn-yellow)] shadow-[1px_1px_0_var(--mn-ink)]'
                    : isTopThree
                    ? 'bg-[var(--mn-ink)] text-[var(--mn-yellow)] border-[var(--mn-yellow)]'
                    : 'bg-[var(--mn-ink)] text-[var(--mn-mute)] border-[var(--mn-line)]'
                }`}
              >
                {rank}
              </div>

              {/* Miniatura da Capa da Obra */}
              <div className="w-11 h-16 shrink-0 border border-[var(--mn-line)] overflow-hidden bg-[var(--mn-ink-3)]">
                <Cover
                  src={work.coverUrl}
                  title={work.title}
                  aspectRatio="2/3"
                  dropShadow={false}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-150"
                />
              </div>

              {/* Informações da Obra */}
              <div className="flex-1 min-w-0">
                <h4 className="font-display text-sm text-[var(--mn-paper)] uppercase truncate group-hover:text-[var(--mn-yellow)] transition-colors leading-snug">
                  {work.title}
                </h4>

                {/* Autor com navegação para perfil público */}
                <p className="font-body text-xs text-[var(--mn-mute)] truncate mt-0.5">
                  por{' '}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const authorIdentifier = work.authorName?.replace(/^@/, '') || work.authorId;
                      if (onOpenAuthorProfile && authorIdentifier) {
                        onOpenAuthorProfile(authorIdentifier);
                      } else {
                        onSelectWork(work);
                      }
                    }}
                    className="text-[var(--mn-paper)] font-medium hover:text-[var(--mn-yellow)] hover:underline cursor-pointer"
                    title={`Ver perfil de ${work.authorName}`}
                  >
                    {work.authorName}
                  </button>
                </p>

                {/* Visualizações formatadas estilo MangaPlus */}
                <div className="flex items-center gap-1 font-body text-[11px] text-[var(--mn-mute)] tabular-nums mt-1">
                  <Eye size={11} className="text-[var(--mn-yellow)] shrink-0" />
                  <span>
                    {Number(work.totalViews ?? 0).toLocaleString('pt-BR')}{' '}
                    {Number(work.totalViews ?? 0) === 1 ? 'leitura' : 'leituras'}
                  </span>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </aside>
  );
}

import { Work } from '../../types';
import { Cover } from './Cover';

export interface RankRowProps {
  rank: number;
  work: Work;
  onSelect: (work: Work) => void;
}

export function RankRow({ rank, work, onSelect }: RankRowProps) {
  const isFirst = rank === 1;

  return (
    <div
      onClick={() => onSelect(work)}
      className="flex items-center gap-4 py-3 border-b-2 border-[#34343A] hover:bg-[#151517] cursor-pointer group transition-colors px-2 select-none"
    >
      {/* Numeral Gigante estilo Ranking de Revista Semanal */}
      <div className="w-12 sm:w-16 flex items-center justify-center shrink-0">
        <span
          className="font-display text-4xl sm:text-5xl leading-none select-none tracking-tight"
          style={
            isFirst
              ? { color: '#FFD400' }
              : {
                  WebkitTextStroke: '2px #FFD400',
                  color: 'transparent',
                }
          }
        >
          {rank}
        </span>
      </div>

      {/* Capa Pequena 2:3 (48x72) */}
      <div className="w-12 h-[72px] shrink-0">
        <Cover
          src={work.coverUrl}
          title={work.title}
          aspectRatio="2/3"
          dropShadow={false}
          className="w-12 h-[72px]"
        />
      </div>

      {/* Título, Autor e Métricas Tabulares */}
      <div className="flex-1 min-w-0">
        <h4 className="font-display text-lg sm:text-[20px] leading-tight text-[#F4EFE3] group-hover:text-[#FFD400] transition-colors truncate uppercase">
          {work.title}
        </h4>
        <p className="font-body text-xs text-[#A9A59A] truncate mt-0.5">
          por <span className="text-[#F4EFE3] font-medium">{work.authorName}</span>
        </p>
        <p className="font-body text-[12px] text-[#A9A59A] tabular-nums mt-0.5">
          {work.totalViews ? Number(work.totalViews).toLocaleString('pt-BR') : '1.240'} views ·{' '}
          {work.totalLikes ? Number(work.totalLikes).toLocaleString('pt-BR') : '420'} likes
        </p>
      </div>
    </div>
  );
}

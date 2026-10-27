import { ChevronRight, Heart } from 'lucide-react';
import { Button } from '../ui/Button';

interface ChapterEndPanelProps {
  chapterNumber: number;
  totalChapters: number;
  chapterLiked: boolean;
  chapterLikes: number;
  likePending: boolean;
  likeNotice: string | null;
  supportEnabled: boolean;
  membershipPriceBrl: number | null;
  authorId: string;
  authorName: string;
  workId: string;
  workTitle: string;
  onNavigateChapter: (nextNumber: number) => void;
  onBack: () => void;
  onReplay: () => void;
  onToggleLike: () => void;
  onOpenDonate: (authorId: string, authorName: string, workTitle: string, workId: string) => void;
}

export function ChapterEndPanel({
  chapterNumber,
  totalChapters,
  chapterLiked,
  chapterLikes,
  likePending,
  likeNotice,
  supportEnabled,
  membershipPriceBrl,
  authorId,
  authorName,
  workId,
  workTitle,
  onNavigateChapter,
  onBack,
  onReplay,
  onToggleLike,
  onOpenDonate,
}: ChapterEndPanelProps) {
  return (
    <div className="w-full bg-[var(--mn-ink-2)] border-2 border-[var(--mn-yellow)] p-8 text-center space-y-4 mt-4">
      <span className="font-pixel text-[12px] text-[var(--mn-yellow)] uppercase tracking-widest block">
        FIM DO CAPÍTULO
      </span>
      <h3 className="font-display text-2xl text-[var(--mn-paper)] uppercase">
        CAP. #{chapterNumber} CONCLUÍDO
      </h3>
      <p className="font-body text-sm text-[var(--mn-mute)]">
        Valeu por ler até o fim. O próximo capítulo te espera.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        {chapterNumber < totalChapters ? (
          <Button
            type="button"
            variant="primary"
            onClick={() => onNavigateChapter(chapterNumber + 1)}
            className="!min-h-[40px] !text-sm"
          >
            PRÓXIMO CAPÍTULO <ChevronRight size={14} className="ml-1" />
          </Button>
        ) : (
          <Button
            type="button"
            variant="primary"
            onClick={onBack}
            className="!min-h-[40px] !text-sm"
          >
            VOLTAR À OBRA
          </Button>
        )}
        <Button
          type="button"
          variant="secondary"
          onClick={onReplay}
          className="!min-h-[40px] !text-sm"
        >
          RELER CAPÍTULO
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 border-t border-[var(--mn-line)] pt-4">
        <button
          type="button"
          onClick={onToggleLike}
          disabled={likePending}
          aria-pressed={chapterLiked}
          className={`inline-flex items-center gap-2 px-4 py-2 font-display text-sm uppercase border-2 transition-all disabled:opacity-60 ${
            chapterLiked
              ? 'bg-[var(--mn-red)] text-[var(--mn-paper)] border-[var(--mn-ink)]'
              : 'bg-[var(--mn-ink)] text-[var(--mn-paper)] border-[var(--mn-line)] hover:border-[var(--mn-red)]'
          }`}
        >
          <Heart size={15} className={chapterLiked ? 'fill-[var(--mn-paper)]' : ''} />
          <span>{chapterLiked ? 'CAPÍTULO CURTIDO' : 'CURTIR CAPÍTULO'}</span>
          <span className="tabular-nums opacity-80">{Number(chapterLikes).toLocaleString('pt-BR')}</span>
        </button>
      </div>

      {likeNotice && (
        <p role="status" className="font-body text-xs text-[var(--mn-yellow)]">
          {likeNotice}
        </p>
      )}

      {supportEnabled && (
        <div className="w-full border-2 border-[var(--mn-line)] bg-[#101114] p-5 text-center space-y-3">
          <p className="font-display text-lg text-[var(--mn-paper)] uppercase">
            GOSTOU DESTE CAPÍTULO? APOIE O AUTOR.
          </p>
          <p className="font-body text-sm text-[var(--mn-mute)]">
            {membershipPriceBrl
              ? `Doação direta ou clube de membros a partir de ${membershipPriceBrl.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} por mês.`
              : 'Apoio direto ao autor desta obra.'}{' '}
            O próximo capítulo continua disponível.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenDonate(authorId, authorName, workTitle, workId)}
              className="!min-h-[38px] !text-xs"
            >
              APOIAR COM DOAÇÃO
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={onBack}
              className="!min-h-[38px] !text-xs"
            >
              VER OPÇÕES NA OBRA
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

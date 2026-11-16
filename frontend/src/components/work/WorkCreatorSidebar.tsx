import { Calendar, Sparkles } from 'lucide-react';
import { Work, Creator } from '../../types';
import { Button } from '../ui/Button';
import { useModals } from '../../context/ModalContext';

export interface WorkCreatorSidebarProps {
  work: Work;
  creator?: Creator;
}

export function WorkCreatorSidebar({ work, creator }: WorkCreatorSidebarProps) {
  const { openDonate, openMembership } = useModals();

  return (
    <aside className="space-y-6">
      {creator && (
        <div className="border-2 border-[var(--mn-line)] bg-[var(--mn-ink-2)] p-5 space-y-4">
          <span className="font-pixel text-[12px] text-[var(--mn-yellow)] tracking-wider uppercase block font-bold">
            SOBRE O CRIADOR
          </span>

          <div className="flex items-center gap-3">
            <img
              src={creator.avatarUrl}
              alt={creator.name}
              className="w-12 h-12 object-cover border-2 border-[var(--mn-ink)] shadow-[2px_2px_0_var(--mn-yellow)]"
            />
            <div>
              <h4 className="font-display text-lg text-[var(--mn-paper)] uppercase">
                {creator.name}
              </h4>
              <span className="font-body text-xs text-[var(--mn-mute)]">
                @{creator.handle.replace(/^@/, '')}
              </span>
            </div>
          </div>

          <p className="font-body text-xs text-[var(--mn-paper)] leading-relaxed">
            {creator.bio}
          </p>

          <div className="pt-2 border-t border-[var(--mn-line)] flex flex-col gap-2.5">
            {creator.membershipPriceBrl > 0 && (
              <button
                type="button"
                onClick={() => openMembership(creator)}
                className="w-full py-2.5 bg-[var(--mn-yellow)] text-[var(--mn-ink)] border-2 border-[var(--mn-ink)] font-display text-sm sm:text-base tracking-wider uppercase shadow-[3px_3px_0_var(--mn-ink)] hover:bg-[var(--mn-yellow-press)] transition-colors flex items-center justify-center gap-1.5"
              >
                <Sparkles size={16} />
                <span>VIRAR MEMBRO (R$ {creator.membershipPriceBrl.toFixed(2)}/mês)</span>
              </button>
            )}

            <Button
              variant="secondary"
              onClick={() => openDonate(creator.id, creator.name, work.title, work.id)}
              className="w-full !min-h-[44px] !text-sm !py-2.5 font-display tracking-wider uppercase"
            >
              DOAR QUALQUER VALOR
            </Button>
          </div>
        </div>
      )}

      <div className="border-2 border-[var(--mn-line)] bg-[var(--mn-ink-2)] p-5 space-y-2">
        <span className="font-pixel text-[12px] text-[var(--mn-mute)] tracking-wider uppercase block">
          CRONOGRAMA EDITORIAL
        </span>
        <div className="flex items-center gap-2 text-xs font-body text-[var(--mn-paper)]">
          <Calendar size={14} className="text-[var(--mn-yellow)]" />
          <span>Capítulos novos toda sexta-feira às 18h.</span>
        </div>
      </div>
    </aside>
  );
}

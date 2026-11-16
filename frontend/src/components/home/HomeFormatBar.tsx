import { ArrowRight } from 'lucide-react';
import { FormatFilter } from '../../utils/formatMeta';
import { FormatSwitcher } from '../ui/FormatSwitcher';

export interface HomeFormatBarProps {
  formato: FormatFilter;
  onApplyFormat: (format: FormatFilter) => void;
  onNavigateToCatalog?: () => void;
}

export function HomeFormatBar({
  formato,
  onApplyFormat,
  onNavigateToCatalog,
}: HomeFormatBarProps) {
  return (
    <section className="border-b-2 border-[var(--mn-line)] bg-[var(--mn-ink)] py-3 sticky top-[70px] md:top-[82px] z-30">
      <div className="mn-container flex flex-col sm:flex-row sm:items-center gap-3">
        <span className="font-pixel text-[12px] tracking-wider uppercase text-[var(--mn-mute)]">
          Ver por formato
        </span>
        <FormatSwitcher value={formato} onChange={onApplyFormat} />
        {onNavigateToCatalog && (
          <button
            type="button"
            onClick={onNavigateToCatalog}
            className="sm:ml-auto font-pixel text-[12px] text-[var(--mn-yellow)] hover:underline inline-flex items-center gap-1"
          >
            CATÁLOGO COMPLETO <ArrowRight size={13} aria-hidden="true" />
          </button>
        )}
      </div>
    </section>
  );
}

import { Heart } from 'lucide-react';
import { AppTab } from '../Header';

interface HeaderNavProps {
  currentTab: AppTab;
  favoritesCount: number;
  onNavigate: (tab: AppTab) => void;
}

export function HeaderNav({ currentTab, favoritesCount, onNavigate }: HeaderNavProps) {
  return (
    <nav className="hidden lg:flex items-center gap-2 2xl:gap-6">
      <button
        type="button"
        onClick={() => onNavigate('feed')}
        className={`px-3 py-1.5 font-display text-sm lg:text-base tracking-wider uppercase transition-all ${
          currentTab === 'feed'
            ? 'bg-[var(--mn-yellow)] text-[var(--mn-ink)] border-2 border-[var(--mn-ink)] shadow-[3px_3px_0_var(--mn-ink)]'
            : 'text-[var(--mn-paper)] hover:text-[var(--mn-yellow)] border-2 border-transparent'
        }`}
      >
        FEED &amp; LANÇAMENTOS
      </button>

      <button
        type="button"
        onClick={() => onNavigate('works')}
        className={`px-3 py-1.5 font-display text-sm lg:text-base tracking-wider uppercase transition-all ${
          currentTab === 'works'
            ? 'bg-[var(--mn-yellow)] text-[var(--mn-ink)] border-2 border-[var(--mn-ink)] shadow-[3px_3px_0_var(--mn-ink)]'
            : 'text-[var(--mn-paper)] hover:text-[var(--mn-yellow)] border-2 border-transparent'
        }`}
      >
        CATÁLOGO
      </button>

      <button
        type="button"
        onClick={() => onNavigate('about')}
        className={`px-3 py-1.5 font-display text-sm lg:text-base tracking-wider uppercase transition-all ${
          currentTab === 'about'
            ? 'bg-[var(--mn-yellow)] text-[var(--mn-ink)] border-2 border-[var(--mn-ink)] shadow-[3px_3px_0_var(--mn-ink)]'
            : 'text-[var(--mn-paper)] hover:text-[var(--mn-yellow)] border-2 border-transparent'
        }`}
      >
        SOBRE
      </button>

      <button
        type="button"
        onClick={() => onNavigate('library')}
        aria-label={favoritesCount > 0 ? `Biblioteca (${favoritesCount} obras)` : 'Biblioteca'}
        className={`px-3 py-1.5 font-display text-sm lg:text-base tracking-wider uppercase flex items-center gap-1.5 transition-all ${
          currentTab === 'library'
            ? 'bg-[var(--mn-yellow)] text-[var(--mn-ink)] border-2 border-[var(--mn-ink)] shadow-[3px_3px_0_var(--mn-ink)]'
            : 'text-[var(--mn-paper)] hover:text-[var(--mn-yellow)] border-2 border-transparent'
        }`}
      >
        <Heart size={14} className={currentTab === 'library' ? 'fill-[var(--mn-ink)]' : ''} />
        <span>BIBLIOTECA</span>
        {favoritesCount > 0 && <span>{`(${favoritesCount})`}</span>}
      </button>
    </nav>
  );
}

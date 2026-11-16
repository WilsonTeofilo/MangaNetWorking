import { BookOpen, Compass, Heart, Info, LayoutDashboard, User as UserIcon } from 'lucide-react';
import { AppTab } from '../Header';

interface HeaderMobileNavProps {
  currentTab: AppTab;
  isAuthenticated: boolean;
  isCreator?: boolean;
  onNavigate: (tab: AppTab) => void;
  onOpenLogin?: () => void;
}

export function HeaderMobileNav({
  currentTab,
  isAuthenticated,
  isCreator = false,
  onNavigate,
  onOpenLogin,
}: HeaderMobileNavProps) {
  return (
    <nav
      aria-label="Navegação rápida mobile"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[var(--mn-ink)] border-t-2 border-[var(--mn-line)] flex justify-around items-center h-16 select-none"
    >
      <button
        type="button"
        onClick={() => onNavigate('feed')}
        className={`flex flex-col items-center justify-center w-14 h-14 ${
          currentTab === 'feed' ? 'text-[var(--mn-yellow)]' : 'text-[var(--mn-mute)]'
        }`}
      >
        <Compass size={20} />
        <span className="font-pixel text-[12px] tracking-wider mt-1">FEED</span>
      </button>

      <button
        type="button"
        onClick={() => onNavigate('works')}
        className={`flex flex-col items-center justify-center w-14 h-14 ${
          currentTab === 'works' ? 'text-[var(--mn-yellow)]' : 'text-[var(--mn-mute)]'
        }`}
      >
        <BookOpen size={20} />
        <span className="font-pixel text-[12px] tracking-wider mt-1">CATÁLOGO</span>
      </button>

      <button
        type="button"
        onClick={() => onNavigate('library')}
        className={`flex flex-col items-center justify-center w-14 h-14 ${
          currentTab === 'library' ? 'text-[var(--mn-yellow)]' : 'text-[var(--mn-mute)]'
        }`}
      >
        <Heart size={20} className={currentTab === 'library' ? 'fill-[var(--mn-yellow)]' : ''} />
        <span className="font-pixel text-[12px] tracking-wider mt-1">BIBLIO</span>
      </button>

      <button
        type="button"
        onClick={() => onNavigate('about')}
        className={`flex flex-col items-center justify-center w-14 h-14 ${
          currentTab === 'about' ? 'text-[var(--mn-yellow)]' : 'text-[var(--mn-mute)]'
        }`}
      >
        <Info size={20} />
        <span className="font-pixel text-[12px] tracking-wider mt-1">SOBRE</span>
      </button>

      {isAuthenticated && isCreator ? (
        <button
          type="button"
          onClick={() => onNavigate('creator-dashboard')}
          className={`flex flex-col items-center justify-center w-14 h-14 ${
            currentTab.startsWith('creator-') ? 'text-[var(--mn-yellow)]' : 'text-[var(--mn-mute)]'
          }`}
        >
          <LayoutDashboard size={20} />
          <span className="font-pixel text-[12px] tracking-wider mt-1">PAINEL</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() =>
            isAuthenticated ? onNavigate('account') : onOpenLogin ? onOpenLogin() : onNavigate('login')
          }
          className={`flex flex-col items-center justify-center w-14 h-14 ${
            currentTab === 'account' ? 'text-[var(--mn-yellow)]' : 'text-[var(--mn-mute)]'
          }`}
        >
          <UserIcon size={20} />
          <span className="font-pixel text-[12px] tracking-wider mt-1">PERFIL</span>
        </button>
      )}
    </nav>
  );
}

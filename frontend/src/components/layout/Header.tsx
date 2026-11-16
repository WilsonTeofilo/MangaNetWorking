import { useAuth } from '../../context/AuthContext';
import { HeaderBrand } from './header/HeaderBrand';
import { HeaderNav } from './header/HeaderNav';
import { HeaderUserMenu } from './header/HeaderUserMenu';
import { HeaderMobileNav } from './header/HeaderMobileNav';

export type AppTab =
  | 'feed'
  | 'works'
  | 'library'
  | 'about'
  | 'login'
  | 'moderation'
  | 'account'
  | 'reader-profile'
  | 'onboarding'
  | 'become-writer'
  | 'public-profile'
  | 'creator-dashboard'
  | 'creator-missions'
  | 'creator-analytics'
  | 'creator-works'
  | 'creator-chapters'
  | 'creator-monetization';

interface HeaderProps {
  currentTab: AppTab;
  setCurrentTab: (tab: AppTab) => void;
  onOpenLogin?: () => void;
  /** Username aberto na página pública (usado no item "Minha conta"). */
  publicProfileUsername?: string;
}

/**
 * Cabeçalho da banca MangaNetWorking.
 * Decomposto em submódulos especializados sob `src/components/layout/header/`:
 * - HeaderBrand: logo símbolo oficial em adesivo com link ao feed
 * - HeaderNav: links e tabs para desktop (Feed, Catálogo, Sobre, Biblioteca)
 * - HeaderUserMenu: perfil do usuário, dropdown de criador/leitor, badges e logout
 * - HeaderMobileNav: barra de navegação rápida inferior para mobile
 */
export function Header({
  currentTab,
  setCurrentTab,
  onOpenLogin,
  publicProfileUsername,
}: HeaderProps) {
  const { user, isAuthenticated } = useAuth();

  const handleNavigate = (tab: AppTab) => {
    setCurrentTab(tab);
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full min-h-[70px] md:min-h-[82px] flex items-center bg-[var(--mn-ink)] border-b-2 border-[var(--mn-line)] select-none">
        <div className="w-full max-w-[1440px] 2xl:max-w-[1680px] mx-auto px-3 sm:px-5 2xl:px-10 flex items-center justify-between gap-4 sm:gap-6 lg:gap-4">
          {/* Logo e Marca */}
          <HeaderBrand onGoHome={() => handleNavigate('feed')} />

          {/* Navegação Central Desktop */}
          <HeaderNav
            currentTab={currentTab}
            favoritesCount={user.favorites.length}
            onNavigate={handleNavigate}
          />

          {/* Menu de Usuário, Ações de Autenticação e Badges */}
          <HeaderUserMenu
            currentTab={currentTab}
            publicProfileUsername={publicProfileUsername}
            onNavigate={handleNavigate}
            onOpenLogin={onOpenLogin}
          />
        </div>
      </header>

      {/* Navegação Rápida Inferior para Mobile */}
      <HeaderMobileNav
        currentTab={currentTab}
        isAuthenticated={isAuthenticated}
        onNavigate={handleNavigate}
        onOpenLogin={onOpenLogin}
      />
    </>
  );
}

export default Header;

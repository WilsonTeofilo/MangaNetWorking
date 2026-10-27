import { Heart, BookOpen, Compass, Info, User as UserIcon, Crown, ShieldAlert, LogOut, ChevronDown, PenLine, LayoutDashboard, Trophy, BarChart3, BookMarked, Coins } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useModals } from '../../context/ModalContext';
import { NotificationBell } from './NotificationBell';
import logoSymbol from '../../assets/brand/logo-symbol.svg';

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
 * Cabeçalho da banca.
 *
 * Não existe mais a divisão "modo criador / modo leitor" no topo: o papel é do servidor e
 * a pessoa escolhe o que quer fazer pelo menu do próprio avatar (canto superior direito),
 * no mesmo formato do MangaTeofilo.
 */
export function Header({ currentTab, setCurrentTab, onOpenLogin, publicProfileUsername }: HeaderProps) {
  const { user, isAuthenticated, logout } = useAuth();
  const { openVip } = useModals();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  // O proprietário herda a operação de moderação no backend; a UI reflete o mesmo acesso.
  const canModerate = Boolean(user.isOwner || user.isModerator);

  useEffect(() => {
    if (!menuOpen) return;
    const onClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onEscape);
    };
  }, [menuOpen]);

  const go = (tab: AppTab) => {
    setMenuOpen(false);
    setCurrentTab(tab);
  };

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    setCurrentTab('feed');
  };

  const creatorMenu: { label: string; tab: AppTab; icon: typeof LayoutDashboard }[] = [
    { label: 'Workspace do criador', tab: 'creator-dashboard', icon: LayoutDashboard },
    { label: 'Minhas obras', tab: 'creator-works', icon: BookMarked },
    { label: 'Capítulos', tab: 'creator-chapters', icon: PenLine },
    { label: 'Missões & XP', tab: 'creator-missions', icon: Trophy },
    { label: 'Analytics', tab: 'creator-analytics', icon: BarChart3 },
    { label: 'Monetização', tab: 'creator-monetization', icon: Coins },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 w-full min-h-[70px] md:min-h-[82px] flex items-center bg-[var(--mn-ink)] border-b-2 border-[var(--mn-line)] select-none">
        {/* Container próprio da barra: mais largo que o mn-container (1200px) e com
            respiro crescente, no padrão do header do MangaTeofilo. */}
        <div className="w-full max-w-[1440px] 2xl:max-w-[1680px] mx-auto px-3 sm:px-5 2xl:px-10 flex items-center justify-between gap-4 sm:gap-6 lg:gap-4">

          {/* Brand Oficial com Logo em Adesivo */}
          <div
            className="flex items-center gap-2 sm:gap-3 cursor-pointer group shrink-0"
            onClick={() => go('feed')}
            title="MangaNetWorking — A Banca Digital do Mangá Independente"
          >
            <img
              src={logoSymbol}
              alt="MangaNetWorking"
              className="w-8 h-8 sm:w-10 sm:h-10 md:w-11 md:h-11 -rotate-2 group-hover:rotate-0 transition-transform duration-100"
            />
            <div>
              <span className="hidden min-[360px]:block font-logo text-base sm:text-xl md:text-2xl text-[var(--mn-yellow)] leading-none tracking-wide">
                MANGA<span className="text-[var(--mn-paper)]">NETWORKING</span>
              </span>
            </div>
          </div>

          {/* Navegação Central Oficial (Desktop: Anton 16px, Bloco Amarelo no Ativo) */}
          <nav className="hidden lg:flex items-center gap-2 2xl:gap-6">
            <button
              type="button"
              onClick={() => go('feed')}
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
              onClick={() => go('works')}
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
              onClick={() => go('about')}
              className={`px-3 py-1.5 font-display text-sm lg:text-base tracking-wider uppercase transition-all ${
                currentTab === 'about'
                  ? 'bg-[var(--mn-red)] text-[var(--mn-paper)] border-2 border-[var(--mn-ink)] shadow-[3px_3px_0_var(--mn-paper)]'
                  : 'text-[var(--mn-mute)] hover:text-[var(--mn-yellow)] border-2 border-transparent'
              }`}
            >
              SOBRE
            </button>

            <button
              type="button"
              onClick={() => go('library')}
              aria-label={`Biblioteca (${user.favorites.length} obras)`}
              className={`px-3 py-1.5 font-display text-sm lg:text-base tracking-wider uppercase flex items-center gap-1.5 transition-all ${
                currentTab === 'library'
                  ? 'bg-[var(--mn-yellow)] text-[var(--mn-ink)] border-2 border-[var(--mn-ink)] shadow-[3px_3px_0_var(--mn-ink)]'
                  : 'text-[var(--mn-paper)] hover:text-[var(--mn-yellow)] border-2 border-transparent'
              }`}
            >
              <Heart size={14} className={currentTab === 'library' ? 'fill-[var(--mn-ink)]' : ''} />
              <span className="hidden xl:inline">BIBLIOTECA</span>
              ({user.favorites.length})
            </button>
          </nav>

          {/* Ações da Direita Dirigidas pelo Estado de Sessão */}
          <div className="flex items-center gap-2.5 lg:gap-4 shrink-0">
            {/* Identidade administrativa explícita; autorização real continua no backend. */}
            {user.isOwner && (
              <div
                className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 bg-[var(--mn-red)] text-[var(--mn-paper)] border-2 border-[var(--mn-ink)] shadow-[2px_2px_0_var(--mn-paper)] font-pixel text-[12px] uppercase font-bold tracking-wider"
                title="Proprietário da plataforma"
              >
                <ShieldAlert size={12} />
                <span>DONO</span>
              </div>
            )}

            {/* Central interna (persistida). Push real continua bloqueado por VAPID/HTTPS. */}
            <NotificationBell />

            {/* VIP Status / Assinar VIP */}
            {user.isVip ? (
              <div
                className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 bg-[var(--mn-yellow)] text-[var(--mn-ink)] border-2 border-[var(--mn-ink)] shadow-[2px_2px_0_var(--mn-paper)] font-pixel text-[12px] uppercase font-bold tracking-wider"
                title="Assinante VIP MangaNetWorking — 100% Livre de Anúncios"
              >
                <Crown size={12} className="fill-[var(--mn-ink)]" />
                <span>VIP</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={openVip}
                className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 border-2 border-[var(--mn-yellow)] text-[var(--mn-yellow)] hover:bg-[var(--mn-yellow)] hover:text-[var(--mn-ink)] font-pixel text-[12px] uppercase tracking-wider transition-all"
                title="Assinar VIP MangaNetWorking — Remova todos os anúncios da leitura"
              >
                <Crown size={12} />
                <span>VIP</span>
              </button>
            )}

            {/* O atalho é só conveniência; o servidor também valida o papel. */}
            {canModerate && (
              <button
                type="button"
                onClick={() => go('moderation')}
                className={`p-1.5 border-2 transition-all ${
                  currentTab === 'moderation'
                    ? 'bg-[var(--mn-red)] text-[var(--mn-paper)] border-[var(--mn-red)]'
                    : 'bg-[var(--mn-ink-2)] text-[var(--mn-mute)] border-[var(--mn-line)] hover:text-[var(--mn-red)] hover:border-[var(--mn-red)]'
                }`}
                title="Acessar Mesa de Moderação Editorial"
                aria-label="Acessar mesa de moderação editorial"
              >
                <ShieldAlert size={14} />
              </button>
            )}

            {isAuthenticated ? (
              /* Avatar redondo no canto: abre o menu da conta */
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen((open) => !open)}
                  className={`flex items-center gap-1.5 p-1 rounded-full border-2 transition-all ${
                    menuOpen
                      ? 'border-[var(--mn-yellow)] shadow-[3px_3px_0_var(--mn-yellow)]'
                      : 'border-[var(--mn-line)] hover:border-[var(--mn-yellow)]'
                  }`}
                  title="Minha conta"
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                >
                  {/* Avatar do header no tamanho do MangaTeofilo (54px, borda dourada, redondo) */}
                  <img
                    src={user.avatarUrl || '/avatar-placeholder.png'}
                    alt={user.name}
                    className="w-[54px] h-[54px] rounded-full object-cover bg-[var(--mn-ink-2)]"
                  />
                  <ChevronDown size={14} className={`text-[var(--mn-mute)] transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
                </button>

                {menuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 mt-2 w-60 border-2 border-[var(--mn-line)] bg-[var(--mn-ink)] shadow-[6px_6px_0_rgba(0,0,0,0.6)]"
                  >
                    <div className="border-b-2 border-[var(--mn-ink-2)] px-4 py-3">
                      <p className="font-display text-sm text-[var(--mn-paper)] uppercase truncate">{user.name}</p>
                      <p className="font-pixel text-[11px] text-[var(--mn-yellow)] mt-0.5">@{user.username || 'sem-username'}</p>
                    </div>

                    {/*
                      "Minha conta" é a casa do LEITOR (foto, privacidade, dados LGPD).
                      Para o escritor, o painel do autor tem o mesmo util (foto, bio,
                      links e perfil público), então a entrada some do menu para não
                      duplicar a mesma tela em dois lugares.
                    */}
                    {!user.isCreator && (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => go('account')}
                        className="w-full text-left px-4 py-2.5 font-body text-sm text-[var(--mn-paper)] hover:bg-[var(--mn-ink-2)] hover:text-[var(--mn-yellow)] transition-colors"
                      >
                        Minha conta
                      </button>
                    )}

                    {publicProfileUsername && (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => go('public-profile')}
                        className="w-full text-left px-4 py-2.5 font-body text-sm text-[var(--mn-paper)] hover:bg-[var(--mn-ink-2)] hover:text-[var(--mn-yellow)] transition-colors"
                      >
                        Ver minha página pública
                      </button>
                    )}

                    {user.isCreator && (
                      <>
                        <p className="px-4 pt-3 pb-1 font-pixel text-[11px] tracking-widest text-[var(--mn-mute)] uppercase">
                          Criador
                        </p>
                        {creatorMenu.map((item) => (
                          <button
                            key={item.tab}
                            type="button"
                            role="menuitem"
                            onClick={() => go(item.tab)}
                            className={`w-full text-left px-4 py-2.5 flex items-center gap-2 font-body text-sm transition-colors ${
                              currentTab === item.tab
                                ? 'bg-[var(--mn-yellow)] text-[var(--mn-ink)] font-semibold'
                                : 'text-[var(--mn-paper)] hover:bg-[var(--mn-ink-2)] hover:text-[var(--mn-yellow)]'
                            }`}
                          >
                            <item.icon size={14} />
                            {item.label}
                          </button>
                        ))}
                      </>
                    )}

                    {!user.isCreator && (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => go('become-writer')}
                        className="w-full text-left px-4 py-2.5 font-body text-sm text-[var(--mn-paper)] hover:bg-[var(--mn-ink-2)] hover:text-[var(--mn-yellow)] transition-colors"
                      >
                        Quero publicar como escritor
                      </button>
                    )}

                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2.5 flex items-center gap-2 font-body text-sm text-[var(--mn-red)] hover:bg-[var(--mn-ink-2)] transition-colors"
                    >
                      <LogOut size={14} />
                      Sair
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Usuário Deslogado: Mostra o Único CTA Primário da Tela */
              <button
                type="button"
                onClick={onOpenLogin || (() => go('login'))}
                className="px-3 sm:px-4 py-2 font-display text-sm sm:text-base tracking-wider uppercase bg-[var(--mn-yellow)] text-[var(--mn-ink)] border-2 border-[var(--mn-ink)] shadow-[4px_4px_0_var(--mn-ink)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_var(--mn-ink)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer"
              >
                <span className="sm:hidden">ENTRAR</span>
                <span className="hidden sm:inline">ENTRAR / CADASTRO</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Barra Inferior Fixa para Mobile (Alvos >= 44px e Silkscreen 11px) */}
      <nav
        aria-label="Navegação rápida mobile"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[var(--mn-ink)] border-t-2 border-[var(--mn-line)] flex justify-around items-center h-16 select-none"
      >
        <button
          type="button"
          onClick={() => go('feed')}
          className={`flex flex-col items-center justify-center w-14 h-14 ${
            currentTab === 'feed' ? 'text-[var(--mn-yellow)]' : 'text-[var(--mn-mute)]'
          }`}
        >
          <Compass size={20} />
          <span className="font-pixel text-[12px] tracking-wider mt-1">FEED</span>
        </button>

        <button
          type="button"
          onClick={() => go('works')}
          className={`flex flex-col items-center justify-center w-14 h-14 ${
            currentTab === 'works' ? 'text-[var(--mn-yellow)]' : 'text-[var(--mn-mute)]'
          }`}
        >
          <BookOpen size={20} />
          <span className="font-pixel text-[12px] tracking-wider mt-1">CATÁLOGO</span>
        </button>

        <button
          type="button"
          onClick={() => go('library')}
          className={`flex flex-col items-center justify-center w-14 h-14 ${
            currentTab === 'library' ? 'text-[var(--mn-yellow)]' : 'text-[var(--mn-mute)]'
          }`}
        >
          <Heart size={20} className={currentTab === 'library' ? 'fill-[var(--mn-yellow)]' : ''} />
          <span className="font-pixel text-[12px] tracking-wider mt-1">BIBLIO</span>
        </button>

        <button
          type="button"
          onClick={() => go('about')}
          className={`flex flex-col items-center justify-center w-14 h-14 ${
            currentTab === 'about' ? 'text-[var(--mn-yellow)]' : 'text-[var(--mn-mute)]'
          }`}
        >
          <Info size={20} />
          <span className="font-pixel text-[12px] tracking-wider mt-1">SOBRE</span>
        </button>

        <button
          type="button"
          onClick={() => (isAuthenticated ? go('account') : (onOpenLogin ? onOpenLogin() : go('login')))}
          className={`flex flex-col items-center justify-center w-14 h-14 ${
            currentTab === 'account' ? 'text-[var(--mn-yellow)]' : 'text-[var(--mn-mute)]'
          }`}
        >
          <UserIcon size={20} />
          <span className="font-pixel text-[12px] tracking-wider mt-1">PERFIL</span>
        </button>
      </nav>
    </>
  );
}

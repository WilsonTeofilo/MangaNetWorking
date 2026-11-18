import { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  Crown,
  LayoutDashboard,
  BookOpen,
  FileText,
  Award,
  BarChart3,
  Coins,
  LogOut,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useModals } from '../../../context/ModalContext';
import { NotificationBell } from '../NotificationBell';
import { AppTab } from '../Header';

interface HeaderUserMenuProps {
  currentTab: AppTab;
  publicProfileUsername?: string;
  onNavigate: (tab: AppTab) => void;
  onOpenLogin?: () => void;
  onOpenPublicProfile?: (username: string) => void;
}

export interface CreatorMenuItem {
  label: string;
  tab: AppTab;
  icon: typeof LayoutDashboard;
}

export const CREATOR_MENU: CreatorMenuItem[] = [
  { label: 'Visão Geral (Workspace)', tab: 'creator-dashboard', icon: LayoutDashboard },
  { label: 'Minhas Obras', tab: 'creator-works', icon: BookOpen },
  { label: 'Capítulos & Lançamento', tab: 'creator-chapters', icon: FileText },
  { label: 'Dashboard & Analytics', tab: 'creator-analytics', icon: BarChart3 },
  { label: 'Missões & XP', tab: 'creator-missions', icon: Award },
  { label: 'Monetização & Ganhos', tab: 'creator-monetization', icon: Coins },
];

export function HeaderUserMenu({
  currentTab,
  publicProfileUsername,
  onNavigate,
  onOpenLogin,
  onOpenPublicProfile,
}: HeaderUserMenuProps) {
  const { user, isAuthenticated, logout } = useAuth();
  const { openVip } = useModals();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

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

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    onNavigate('feed');
  };

  const handleCreatorNavigate = (tab: AppTab) => {
    setMenuOpen(false);
    onNavigate(tab);
  };

  return (
    <div className="flex items-center gap-2.5 lg:gap-4 shrink-0">
      {/* Central interna de notificações */}
      <NotificationBell />

      {isAuthenticated ? (
        /* Avatar redondo: abre menu de conta */
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
            <img
              src={user.avatarUrl || '/avatar-placeholder.png'}
              alt={user.name}
              className="w-12 h-12 md:w-14 md:h-14 rounded-full object-cover bg-[var(--mn-ink-2)]"
            />
            <ChevronDown
              size={16}
              className={`text-[var(--mn-mute)] transition-transform ${
                menuOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 mt-2 w-64 border-2 border-[var(--mn-line)] bg-[var(--mn-ink)] shadow-[6px_6px_0_rgba(0,0,0,0.6)]"
            >
              <div className="border-b-2 border-[var(--mn-ink-2)] px-4 py-3">
                <div className="flex items-center gap-3">
                  <img
                    src={user.avatarUrl || '/avatar-placeholder.png'}
                    alt={user.name}
                    className="w-12 h-12 rounded-full object-cover border-2 border-[var(--mn-yellow)] bg-[var(--mn-ink-2)] shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-sm text-[var(--mn-paper)] uppercase truncate">
                      {user.name}
                    </p>
                    <p className="font-pixel text-[11px] text-[var(--mn-yellow)] mt-0.5 truncate">
                      @{user.username || 'sem-username'}
                    </p>
                  </div>
                </div>

                {/* Crachás contextuais e status VIP dentro do dropdown */}
                <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                  {user.isOwner && (
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-[var(--mn-red)] text-[var(--mn-paper)] font-pixel text-[10px] uppercase font-bold tracking-wider"
                      title="Proprietário da plataforma"
                    >
                      <ShieldAlert size={10} />
                      <span>DONO</span>
                    </span>
                  )}

                  {user.isVip ? (
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-[var(--mn-yellow)] text-[var(--mn-ink)] font-pixel text-[10px] uppercase font-bold tracking-wider"
                      title="Assinante VIP MangaNetWorking — 100% Livre de Anúncios"
                    >
                      <Crown size={10} className="fill-[var(--mn-ink)]" />
                      <span>VIP</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        openVip();
                      }}
                      className="inline-flex items-center gap-1 px-2 py-0.5 border border-[var(--mn-yellow)] text-[var(--mn-yellow)] hover:bg-[var(--mn-yellow)] hover:text-[var(--mn-ink)] font-pixel text-[10px] uppercase tracking-wider transition-colors cursor-pointer"
                      title="Assinar VIP MangaNetWorking — Remova todos os anúncios da leitura"
                    >
                      <Crown size={10} />
                      <span>Assinar VIP</span>
                    </button>
                  )}
                </div>
              </div>

              {/* "Minha conta" disponível para todos (leitores e criadores têm perfil e segurança) */}
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onNavigate('account');
                }}
                className={`w-full text-left px-4 py-2.5 font-body text-sm transition-colors ${
                  currentTab === 'account'
                    ? 'bg-[var(--mn-yellow)] text-[var(--mn-ink)] font-semibold'
                    : 'text-[var(--mn-paper)] hover:bg-[var(--mn-ink-2)] hover:text-[var(--mn-yellow)]'
                }`}
              >
                Minha conta
              </button>

              {/* Acesso direto ao perfil público do próprio usuário */}
              {(user.username || publicProfileUsername) && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    const targetUsername = user.username || publicProfileUsername || '';
                    if (targetUsername && onOpenPublicProfile) {
                      onOpenPublicProfile(targetUsername);
                    } else {
                      onNavigate('public-profile');
                    }
                  }}
                  className={`w-full text-left px-4 py-2.5 font-body text-sm transition-colors ${
                    currentTab === 'public-profile'
                      ? 'bg-[var(--mn-yellow)] text-[var(--mn-ink)] font-semibold'
                      : 'text-[var(--mn-paper)] hover:bg-[var(--mn-ink-2)] hover:text-[var(--mn-yellow)]'
                  }`}
                >
                  Ver meu perfil público
                </button>
              )}

              {canModerate && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    onNavigate('moderation');
                  }}
                  className={`w-full text-left px-4 py-2.5 flex items-center gap-2 font-body text-sm transition-colors ${
                    currentTab === 'moderation'
                      ? 'bg-[var(--mn-red)] text-[var(--mn-paper)] font-semibold'
                      : 'text-[var(--mn-paper)] hover:bg-[var(--mn-ink-2)] hover:text-[var(--mn-red)]'
                  }`}
                >
                  <ShieldAlert
                    size={14}
                    className={currentTab === 'moderation' ? 'text-[var(--mn-paper)]' : 'text-[var(--mn-red)]'}
                  />
                  Mesa de moderação editorial
                </button>
              )}

              {user.isCreator && (
                <>
                  <p className="px-4 pt-3 pb-1 font-pixel text-[11px] tracking-widest text-[var(--mn-mute)] uppercase">
                    Criador
                  </p>
                  {CREATOR_MENU.map((item) => {
                    const isItemActive = currentTab === item.tab;

                    return (
                      <button
                        key={item.tab}
                        type="button"
                        role="menuitem"
                        onClick={() => handleCreatorNavigate(item.tab)}
                        className={`w-full text-left px-4 py-2.5 flex items-center gap-2 font-body text-sm transition-colors ${
                          isItemActive
                            ? 'bg-[var(--mn-yellow)] text-[var(--mn-ink)] font-semibold'
                            : 'text-[var(--mn-paper)] hover:bg-[var(--mn-ink-2)] hover:text-[var(--mn-yellow)]'
                        }`}
                      >
                        <item.icon size={14} />
                        {item.label}
                      </button>
                    );
                  })}
                </>
              )}

              {!user.isCreator && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    onNavigate('become-writer');
                  }}
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
        /* Usuário Deslogado: Botão CTA */
        <button
          type="button"
          onClick={onOpenLogin || (() => onNavigate('login'))}
          className="px-3 sm:px-4 py-2 font-display text-sm sm:text-base tracking-wider uppercase bg-[var(--mn-yellow)] text-[var(--mn-ink)] border-2 border-[var(--mn-ink)] shadow-[4px_4px_0_var(--mn-ink)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_var(--mn-ink)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer"
        >
          <span className="sm:hidden">ENTRAR</span>
          <span className="hidden sm:inline">ENTRAR / CADASTRO</span>
        </button>
      )}
    </div>
  );
}

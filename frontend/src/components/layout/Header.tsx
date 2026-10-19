import { Heart, BookOpen, Compass, User as UserIcon, Crown, ShieldAlert, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useModals } from '../../context/ModalContext';
import logoSymbol from '../../assets/brand/logo-symbol.svg';

interface HeaderProps {
  currentTab: 'feed' | 'works' | 'library' | 'creator-workspace' | 'reader-profile' | 'login' | 'moderation';
  setCurrentTab: (tab: 'feed' | 'works' | 'library' | 'creator-workspace' | 'reader-profile' | 'login' | 'moderation') => void;
  onOpenLogin?: () => void;
}

export function Header({ currentTab, setCurrentTab, onOpenLogin }: HeaderProps) {
  const { user, isAuthenticated, toggleCreatorMode, logout } = useAuth();
  const { openVip } = useModals();
  const isLoggedIn = isAuthenticated;

  const handleLogout = async () => {
    await logout();
    setCurrentTab('feed');
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full min-h-[70px] md:min-h-[82px] flex items-center bg-[#0B0B0C] border-b-2 border-[#34343A] select-none">
        {/* Container próprio da barra: mais largo que o mn-container (1200px) e com
            respiro crescente, no padrão do header do MangaTeofilo. */}
        <div className="w-full max-w-[1440px] 2xl:max-w-[1680px] mx-auto px-4 sm:px-5 2xl:px-10 flex items-center justify-between gap-6">
          
          {/* Brand Oficial com Logo em Adesivo */}
          <div
            className="flex items-center gap-3 cursor-pointer group shrink-0"
            onClick={() => setCurrentTab('feed')}
            title="MangaNetWorking — A Banca Digital do Mangá Independente"
          >
            <img
              src={logoSymbol}
              alt="MangaNetWorking"
              className="w-10 h-10 md:w-11 md:h-11 -rotate-2 group-hover:rotate-0 transition-transform duration-100"
            />
            <div>
              <span className="font-logo text-xl md:text-2xl text-[#FFD400] leading-none block tracking-wide">
                MANGA<span className="text-[#F4EFE3]">NETWORKING</span>
              </span>
              <span className="font-body text-[12px] text-[#A9A59A] block font-medium mt-0.5">
                por MangaTeofilo Editorial
              </span>
            </div>
          </div>

          {/* Navegação Central Oficial (Desktop: Anton 16px, Bloco Amarelo no Ativo) */}
          <nav className="hidden md:flex items-center gap-2 lg:gap-4 2xl:gap-6">
            <button
              type="button"
              onClick={() => setCurrentTab('feed')}
              className={`px-3 py-1.5 font-display text-sm lg:text-base tracking-wider uppercase transition-all ${
                currentTab === 'feed'
                  ? 'bg-[#FFD400] text-[#0B0B0C] border-2 border-[#0B0B0C] shadow-[3px_3px_0_#0B0B0C]'
                  : 'text-[#F4EFE3] hover:text-[#FFD400] border-2 border-transparent'
              }`}
            >
              FEED &amp; LANÇAMENTOS
            </button>

            <button
              type="button"
              onClick={() => setCurrentTab('works')}
              className={`px-3 py-1.5 font-display text-sm lg:text-base tracking-wider uppercase transition-all ${
                currentTab === 'works'
                  ? 'bg-[#FFD400] text-[#0B0B0C] border-2 border-[#0B0B0C] shadow-[3px_3px_0_#0B0B0C]'
                  : 'text-[#F4EFE3] hover:text-[#FFD400] border-2 border-transparent'
              }`}
            >
              CATÁLOGO
            </button>

            <button
              type="button"
              onClick={() => setCurrentTab('library')}
              className={`px-3 py-1.5 font-display text-sm lg:text-base tracking-wider uppercase flex items-center gap-1.5 transition-all ${
                currentTab === 'library'
                  ? 'bg-[#FFD400] text-[#0B0B0C] border-2 border-[#0B0B0C] shadow-[3px_3px_0_#0B0B0C]'
                  : 'text-[#F4EFE3] hover:text-[#FFD400] border-2 border-transparent'
              }`}
            >
              <Heart size={14} className={currentTab === 'library' ? 'fill-[#0B0B0C]' : ''} />
              BIBLIOTECA ({user.favorites.length})
            </button>
          </nav>

          {/* Ações da Direita Dirigidas pelo Estado de Sessão */}
          <div className="flex items-center gap-2.5 lg:gap-4 shrink-0">
            {/* Alternar Modo Criador / Leitor (Secondary button) */}
            <button
              type="button"
              onClick={toggleCreatorMode}
              className="hidden xl:inline-flex items-center px-3.5 py-1.5 border-2 border-[#34343A] bg-[#151517] text-[#F4EFE3] hover:border-[#FFD400] font-pixel text-[12px] uppercase tracking-wider transition-all whitespace-nowrap"
              title="Alternar entre perfil de criador e leitor"
            >
              {user.isCreator ? 'MODO CRIADOR' : 'MODO LEITOR'}
            </button>

            {/* VIP Status / Assinar VIP */}
            {user.isVip ? (
              <div
                className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#FFD400] text-[#0B0B0C] border-2 border-[#0B0B0C] shadow-[2px_2px_0_#F4EFE3] font-pixel text-[12px] uppercase font-bold tracking-wider"
                title="Assinante VIP MangaNetWorking — 100% Livre de Anúncios"
              >
                <Crown size={12} className="fill-[#0B0B0C]" />
                <span>VIP</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={openVip}
                className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 border-2 border-[#FFD400] text-[#FFD400] hover:bg-[#FFD400] hover:text-[#0B0B0C] font-pixel text-[12px] uppercase tracking-wider transition-all"
                title="Assinar VIP MangaNetWorking — Remova todos os anúncios da leitura"
              >
                <Crown size={12} />
                <span>VIP</span>
              </button>
            )}

            {/* O atalho é só conveniência; o servidor também valida o papel. */}
            {user.isModerator && (
              <button
                type="button"
                onClick={() => setCurrentTab('moderation')}
                className={`p-1.5 border-2 transition-all ${
                  currentTab === 'moderation'
                    ? 'bg-[#E8402F] text-[#F4EFE3] border-[#E8402F]'
                    : 'bg-[#151517] text-[#A9A59A] border-[#34343A] hover:text-[#E8402F] hover:border-[#E8402F]'
                }`}
                title="Acessar Mesa de Moderação Editorial"
                aria-label="Acessar mesa de moderação editorial"
              >
                <ShieldAlert size={14} />
              </button>
            )}

            {isLoggedIn ? (
              /* Usuário Autenticado: Avatar com Borda de Adesivo + Sair */
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentTab(user.isCreator ? 'creator-workspace' : 'reader-profile')}
                  className="flex items-center gap-2 p-1 bg-[#151517] border-2 border-[#34343A] hover:border-[#FFD400] shadow-[3px_3px_0_#FFD400] transition-all cursor-pointer"
                  title={`Perfil de ${user.name}`}
                >
                  <img
                    src={user.avatarUrl}
                    alt={user.name}
                    className="w-8 h-8 object-cover border border-[#0B0B0C]"
                  />
                  <span className="hidden xl:inline font-display text-sm text-[#F4EFE3] uppercase pr-1.5">
                    {user.name.split(' ')[0]}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="p-2 bg-[#151517] border-2 border-[#34343A] text-[#A9A59A] hover:text-[#FFD400] hover:border-[#FFD400] transition-all cursor-pointer"
                  title="Sair da conta"
                  aria-label="Sair da conta"
                >
                  <LogOut size={14} />
                </button>
              </div>
            ) : (
              /* Usuário Deslogado: Mostra o Único CTA Primário da Tela */
              <button
                type="button"
                onClick={onOpenLogin || (() => setCurrentTab('login'))}
                className="px-4 py-2 font-display text-base tracking-wider uppercase bg-[#FFD400] text-[#0B0B0C] border-2 border-[#0B0B0C] shadow-[4px_4px_0_#0B0B0C] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_#0B0B0C] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer"
              >
                ENTRAR / CADASTRO
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Barra Inferior Fixa para Mobile (Alvos >= 44px e Silkscreen 11px) */}
      <nav
        aria-label="Navegação rápida mobile"
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0B0B0C] border-t-2 border-[#34343A] flex justify-around items-center h-16 select-none"
      >
        <button
          type="button"
          onClick={() => setCurrentTab('feed')}
          className={`flex flex-col items-center justify-center w-14 h-14 ${
            currentTab === 'feed' ? 'text-[#FFD400]' : 'text-[#A9A59A]'
          }`}
        >
          <Compass size={20} />
          <span className="font-pixel text-[12px] tracking-wider mt-1">FEED</span>
        </button>

        <button
          type="button"
          onClick={() => setCurrentTab('works')}
          className={`flex flex-col items-center justify-center w-14 h-14 ${
            currentTab === 'works' ? 'text-[#FFD400]' : 'text-[#A9A59A]'
          }`}
        >
          <BookOpen size={20} />
          <span className="font-pixel text-[12px] tracking-wider mt-1">CATÁLOGO</span>
        </button>

        <button
          type="button"
          onClick={() => setCurrentTab('library')}
          className={`flex flex-col items-center justify-center w-14 h-14 ${
            currentTab === 'library' ? 'text-[#FFD400]' : 'text-[#A9A59A]'
          }`}
        >
          <Heart size={20} className={currentTab === 'library' ? 'fill-[#FFD400]' : ''} />
          <span className="font-pixel text-[12px] tracking-wider mt-1">BIBLIO</span>
        </button>

        <button
          type="button"
          onClick={() => setCurrentTab(user.isCreator ? 'creator-workspace' : 'reader-profile')}
          className={`flex flex-col items-center justify-center w-14 h-14 ${
            currentTab === 'reader-profile' || currentTab === 'creator-workspace'
              ? 'text-[#FFD400]'
              : 'text-[#A9A59A]'
          }`}
        >
          <UserIcon size={20} />
          <span className="font-pixel text-[12px] tracking-wider mt-1">PERFIL</span>
        </button>
      </nav>
    </>
  );
}

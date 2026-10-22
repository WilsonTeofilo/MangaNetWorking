import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserProfile } from '../types';
import { authApi, SessionUserDto, userApi } from '../api/authApi';
import { creatorApi } from '../api/creatorApi';
import { monetizationApi } from '../api/monetizationApi';

interface AuthContextType {
  user: UserProfile;
  isAuthenticated: boolean;
  isMemberOf: (creatorId: string) => boolean;
  subscribeToCreator: (creatorId: string, idempotencyKey: string) => Promise<{ checkoutUrl: string; amountBrl: number }>;
  createVipCheckout: () => Promise<{ checkoutUrl: string; priceBrl: number }>;
  /** Transição de leitor para escritor (exige vínculo social no servidor). */
  becomeWriter: (payload: { handle?: string; instagramUrl?: string; youtubeUrl?: string; portfolioUrl?: string; cpf?: string }) => Promise<{ message: string; creatorId: string; creatorHandle: string }>;
  /** Atualiza avatar/visibilidade do perfil e reidrata a sessão. */
  saveProfile: (payload: { avatarUrl?: string; isProfilePublic?: boolean }) => Promise<void>;
  toggleFavorite: (workId: string) => Promise<void>;
  /** Aviso amigável quando o favorito não pôde ser gravado (visitante ou falha de rede). */
  favoriteNotice: string | null;
  dismissFavoriteNotice: () => void;
  /** Incrementa quando a biblioteca muda no servidor (a página recarrega a lista). */
  libraryVersion: number;
  /** Recarrega a sessão a partir de `/auth/me` (mantém o estado atual se não houver sessão). */
  refreshSession: () => Promise<void>;
  /** Atualiza a apresentação local depois que o servidor confirmou a gravação do avatar. */
  updateAvatarUrl: (avatarUrl: string) => void;
  /** Encerra a sessão no servidor e volta ao estado de visitante. */
  logout: () => Promise<void>;
  acceptCurrentPrivacyPolicy: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const GUEST_USER: UserProfile = {
  uid: 'guest', name: 'Visitante', email: '', username: '', avatarUrl: '', isCreator: false,
  isModerator: false, isOwner: false, isVip: false, activeMemberships: {}, favorites: [],
};

/** Mescla os dados autoritativos da sessão no perfil, preservando apenas preferências de interface. */
function applySession(prev: UserProfile, session: SessionUserDto): UserProfile {
  return {
    ...prev,
    uid: session.id,
    name: session.name || prev.name,
    email: session.email || prev.email,
    username: session.username ?? prev.username,
    sex: (session.sex as UserProfile['sex']) ?? prev.sex,
    profilePublic: session.profilePublic ?? prev.profilePublic,
    profileOnboardingCompleted: session.profileOnboardingCompleted ?? prev.profileOnboardingCompleted,
    avatarUrl: session.avatarUrl || prev.avatarUrl,
    isCreator: session.isCreator,
    creatorId: session.creatorId || undefined,
    creatorHandle: session.creatorHandle || undefined,
    isModerator: Boolean(session.isModerator),
    isOwner: Boolean(session.isOwner),
    privacyConsentRequired: Boolean(session.privacyConsentRequired),
    privacyPolicyVersion: session.privacyPolicyVersion,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile>(GUEST_USER);
  const [favoriteNotice, setFavoriteNotice] = useState<string | null>(null);
  const [libraryVersion, setLibraryVersion] = useState(0);

  const isAuthenticated = Boolean(user.uid && user.uid !== 'guest');

  const isMemberOf = (creatorId: string): boolean => {
    const sub = user.activeMemberships[creatorId];
    if (!sub) return false;
    return sub.status === 'active';
  };

  const refreshSession = async () => {
    try {
      const session = await authApi.me();
      if (!session) {
        setUser(GUEST_USER);
        return;
      }
      setUser((prev) => ({ ...applySession(prev, session), isVip: session.isVip, vipExpiresAt: session.vipExpiresAt ?? undefined }));
      // A biblioteca é a fonte da verdade dos favoritos: sem isso o coração "esquece"
      // a obra a cada recarregamento da página (o estado local não é persistência).
      try {
        const library = await userApi.getLibrary();
        setUser((prev) => ({ ...prev, favorites: library.map((work) => work.id) }));
      } catch {
        // Biblioteca indisponível: mantém o estado atual em vez de apagar os favoritos.
      }
    } catch {
      setUser(GUEST_USER);
    }
  };

  // Hidrata a sessão real na primeira renderização (o papel de moderador/criador vem do servidor).
  useEffect(() => {
    void refreshSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logout = async () => {
    await authApi.logout();
    setUser(GUEST_USER);
  };

  const acceptCurrentPrivacyPolicy = async () => {
    const policy = await authApi.getPolicyVersion();
    await authApi.acceptPrivacyPolicy(policy.version);
    await refreshSession();
  };

  const updateAvatarUrl = (avatarUrl: string) => {
    setUser((prev) => ({ ...prev, avatarUrl }));
  };

  const subscribeToCreator = async (creatorId: string, idempotencyKey: string) => {
    return monetizationApi.createMembershipCheckout({ creatorId, idempotencyKey });
  };

  const createVipCheckout = async () => monetizationApi.createVipCheckout();


  /**
   * Transição real de leitor para escritor: o servidor exige pelo menos um vínculo social
   * (Instagram, YouTube ou portfólio). Depois da confirmação a sessão é recarregada,
   * porque o papel vem do servidor — nunca do cliente.
   */
  const becomeWriter = async (payload: {
    handle?: string;
    instagramUrl?: string;
    youtubeUrl?: string;
    portfolioUrl?: string;
    cpf?: string;
  }) => {
    // O servidor renova o cookie de sessao com o papel de escritor: nao e preciso deslogar.
    const result = await creatorApi.applyAsWriter(payload);
    await refreshSession();
    return result;
  };

  /** Atualiza o perfil (avatar, visibilidade) e reidrata a sessão com o que o servidor gravou. */
  const saveProfile = async (payload: { avatarUrl?: string; isProfilePublic?: boolean }) => {
    await userApi.updateProfile(payload);
    await refreshSession();
  };
  /**
   * Alterna o favorito no servidor (tabela user_liked_works) e reflete no estado.
   * A atualização é otimista: o coração responde na hora e volta atrás se a gravação falhar.
   */
  const toggleFavorite = async (workId: string) => {
    if (!isAuthenticated) {
      setFavoriteNotice('Entre na sua conta para salvar obras na biblioteca.');
      return;
    }
    const previous = user.favorites;
    const wasFavorite = previous.includes(workId);
    const next = wasFavorite
      ? previous.filter((id) => id !== workId)
      : [...previous, workId];

    setUser((prev) => ({ ...prev, favorites: next }));

    try {
      await userApi.toggleLibrary(workId);
      // Só depois da confirmação do servidor a lista da biblioteca é recarregada.
      setLibraryVersion((version) => version + 1);
    } catch {
      setUser((prev) => ({ ...prev, favorites: previous }));
      setFavoriteNotice('Não foi possível salvar na biblioteca agora. Tente novamente.');
    }
  };

  const dismissFavoriteNotice = () => setFavoriteNotice(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isMemberOf,
        subscribeToCreator,
        createVipCheckout,
        becomeWriter,
        saveProfile,
        toggleFavorite,
        favoriteNotice,
        dismissFavoriteNotice,
        libraryVersion,
        refreshSession,
        updateAvatarUrl,
        logout,
        acceptCurrentPrivacyPolicy,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

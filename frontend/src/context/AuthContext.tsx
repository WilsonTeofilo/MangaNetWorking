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
  toggleFavorite: (workId: string) => void;
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
    const result = await creatorApi.applyAsWriter(payload);
    await refreshSession();
    return result;
  };

  /** Atualiza o perfil (avatar, visibilidade) e reidrata a sessão com o que o servidor gravou. */
  const saveProfile = async (payload: { avatarUrl?: string; isProfilePublic?: boolean }) => {
    await userApi.updateProfile(payload);
    await refreshSession();
  };
  const toggleFavorite = (workId: string) => {
    setUser(prev => {
      const exists = prev.favorites.includes(workId);
      return {
        ...prev,
        favorites: exists 
          ? prev.favorites.filter(id => id !== workId)
          : [...prev.favorites, workId]
      };
    });
  };

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

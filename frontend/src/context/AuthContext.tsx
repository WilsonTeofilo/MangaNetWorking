import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserProfile, MembershipSubscription } from '../types';
import { CURRENT_USER } from '../data/mockData';
import { authApi, SessionUserDto } from '../api/authApi';
import { monetizationApi } from '../api/monetizationApi';

interface AuthContextType {
  user: UserProfile;
  isAuthenticated: boolean;
  isMemberOf: (creatorId: string) => boolean;
  subscribeToCreator: (creatorId: string, priceBrl: number) => Promise<void>;
  subscribeVip: () => Promise<void>;
  toggleCreatorMode: () => void;
  toggleFavorite: (workId: string) => void;
  /** Recarrega a sessão a partir de `/auth/me` (mantém o estado atual se não houver sessão). */
  refreshSession: () => Promise<void>;
  /** Encerra a sessão no servidor e volta ao estado de visitante. */
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** Mescla os dados autoritativos da sessão no perfil, preservando estado local (favoritos, avatar). */
function applySession(prev: UserProfile, session: SessionUserDto): UserProfile {
  return {
    ...prev,
    uid: session.id,
    name: session.name || prev.name,
    email: session.email || prev.email,
    isCreator: session.isCreator,
    creatorId: session.creatorId || undefined,
    isModerator: Boolean(session.isModerator),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile>(CURRENT_USER);

  const isAuthenticated = Boolean(user.uid && user.uid !== 'guest');

  const isMemberOf = (creatorId: string): boolean => {
    const sub = user.activeMemberships[creatorId];
    if (!sub) return false;
    return sub.status === 'active';
  };

  const refreshSession = async () => {
    const session = await authApi.me();
    // Sem sessão (401) ou backend indisponível: preserva o estado atual (modo demonstração).
    if (!session) return;
    setUser((prev) => applySession(prev, session));
  };

  // Hidrata a sessão real na primeira renderização (o papel de moderador/criador vem do servidor).
  useEffect(() => {
    void refreshSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logout = async () => {
    await authApi.logout();
    setUser((prev) => ({
      ...prev,
      uid: 'guest',
      name: 'Visitante',
      email: '',
      avatarUrl: '',
      isCreator: false,
      creatorId: undefined,
      isModerator: false,
      isVip: false,
      activeMemberships: {},
    }));
  };

  const subscribeToCreator = async (creatorId: string, priceBrl: number) => {
    try {
      // Identidade do assinante é resolvida pela sessão no servidor.
      await monetizationApi.subscribeMembership({ creatorId });
    } catch {
      // Fallback gracioso se backend não responder em dev
    }

    const newSub: MembershipSubscription = {
      creatorId,
      priceBrl,
      startedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
      status: 'active'
    };

    setUser(prev => ({
      ...prev,
      activeMemberships: {
        ...prev.activeMemberships,
        [creatorId]: newSub
      }
    }));
  };

  const subscribeVip = async () => {
    try {
      // Assinante VIP é resolvido pela sessão no servidor.
      await monetizationApi.subscribeVip({});
    } catch {
      // Fallback gracioso se backend não responder em dev
    }

    const expiresAt = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();
    setUser(prev => ({
      ...prev,
      isVip: true,
      vipExpiresAt: expiresAt,
    }));
  };

  const toggleCreatorMode = () => {
    setUser(prev => ({
      ...prev,
      isCreator: !prev.isCreator,
      creatorId: !prev.isCreator ? 'creator-teofilo' : undefined
    }));
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
        subscribeVip,
        toggleCreatorMode,
        toggleFavorite,
        refreshSession,
        logout,
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

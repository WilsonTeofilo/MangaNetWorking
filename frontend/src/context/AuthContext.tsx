import { createContext, useContext, useState, ReactNode } from 'react';
import { UserProfile, MembershipSubscription } from '../types';
import { CURRENT_USER } from '../data/mockData';
import { monetizationApi } from '../api/monetizationApi';

interface AuthContextType {
  user: UserProfile;
  isMemberOf: (creatorId: string) => boolean;
  subscribeToCreator: (creatorId: string, priceBrl: number) => Promise<void>;
  subscribeVip: () => Promise<void>;
  toggleCreatorMode: () => void;
  toggleFavorite: (workId: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile>(CURRENT_USER);

  const isMemberOf = (creatorId: string): boolean => {
    const sub = user.activeMemberships[creatorId];
    if (!sub) return false;
    return sub.status === 'active';
  };

  const subscribeToCreator = async (creatorId: string, priceBrl: number) => {
    try {
      await monetizationApi.subscribeMembership({
        creatorId,
        subscriberUserId: user.uid !== 'guest' ? user.uid : undefined,
        amountBrl: priceBrl,
      });
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
      await monetizationApi.subscribeVip({
        userId: user.uid !== 'guest' ? user.uid : undefined,
        userEmail: user.email,
        amountBrl: 23.00,
      });
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
        isMemberOf,
        subscribeToCreator,
        subscribeVip,
        toggleCreatorMode,
        toggleFavorite,
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

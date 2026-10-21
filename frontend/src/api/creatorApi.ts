import { request } from './client';

/**
 * Missão da Season do criador (`CreatorMissionDocument` no MongoDB).
 * Valores brutos do servidor — a UI não recalcula progresso nem recompensa.
 */
export interface CreatorMissionDto {
  id: string;
  creatorId?: string;
  title: string;
  description?: string;
  currentProgress: number;
  targetGoal: number;
  completed: boolean;
  boostRewardMultiplier?: number;
  boostDurationHours?: number;
  completedAt?: string | null;
  createdAt?: string | null;
}

/**
 * Painel do autor retornado por `GET /api/creators/workspace` (dado privado; exige sessão de criador).
 * Saldo, doações e nível são autoritativos do servidor.
 */
export interface CreatorWorkspaceDto {
  id: string;
  name: string;
  avatarUrl?: string | null;
  /** Bio do autor (preenchida no painel). */
  bio?: string | null;
  handle: string;
  /** Username da conta (identificador publico do autor). */
  username?: string;
  /** Vinculo social do autor (pelo menos um e obrigatorio). */
  instagramUrl?: string | null;
  youtubeUrl?: string | null;
  portfolioUrl?: string | null;
  monetizationLevel: number;
  monetizationUnlocked: boolean;
  walletBalanceBrl: number;
  totalDonationsBrl: number;
  monthlyMembersCount: number;
  membershipPriceBrl: number;
  pixKey?: string | null;
  pixKeyType?: string | null;
  hasActiveBoost: boolean;
  engagementBoostMul: number;
  missions: CreatorMissionDto[];
}

export interface CreatorWorkSummary {
  id: string;
  title: string;
  slug: string;
  synopsis?: string | null;
  coverUrl?: string | null;
  totalChapters: number;
  totalViews: number;
  totalLikes: number;
}

export interface CreatorPublicProfileDto {
  id: string;
  name: string;
  handle: string;
  bio?: string | null;
  avatarUrl?: string | null;
  instagramUrl?: string | null;
  youtubeUrl?: string | null;
  portfolioUrl?: string | null;
  membershipPriceBrl: number;
  isMonetized: boolean;
  works: CreatorWorkSummary[];
}

export const creatorApi = {
  /** Painel privado do autor (saldo, doações, nível e missões). */
  getWorkspace() {
    return request<CreatorWorkspaceDto>('/creators/workspace');
  },

  /** Perfil público de um autor pelo handle. */
  getPublicProfile(handle: string) {
    return request<CreatorPublicProfileDto>(`/creators/${handle}`);
  },

  /** Atualiza dados públicos do autor (nome, bio, redes, avatar). */
  updateProfile(payload: {
    name?: string;
    bio?: string;
    instagramUrl?: string;
    youtubeUrl?: string;
    portfolioUrl?: string;
    avatarUrl?: string;
  }) {
    return request('/creators/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  /** Atualiza o preço da assinatura de membros (R$ 7,99 – R$ 45,99). */
  updateMembershipPrice(priceBrl: number) {
    return request('/creators/membership-price', {
      method: 'PUT',
      body: JSON.stringify({ priceBrl }),
    });
  },

  /** Resgate da recompensa de uma missão da Season. */
  claimMission(missionId: string) {
    return request(`/creators/workspace/missions/${missionId}/claim`, {
      method: 'POST',
    });
  },
  /**
   * Transição de leitor para escritor: o servidor exige pelo menos um vínculo social
   * (Instagram, YouTube ou portfólio) e cria o perfil público de escritor.
   */
  applyAsWriter(payload: {
    handle?: string;
    instagramUrl?: string;
    youtubeUrl?: string;
    portfolioUrl?: string;
    cpf?: string;
  }) {
    return request<{ message: string; creatorId: string; creatorHandle: string }>('/creators/apply', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /** Seguir um escritor (só escritores têm seguidores). */
  followCreator(handle: string) {
    return request<{ followers: number; following: boolean }>(
      `/creators/${encodeURIComponent(handle)}/follow`,
      { method: 'POST' }
    );
  },

  unfollowCreator(handle: string) {
    return request<{ followers: number; following: boolean }>(
      `/creators/${encodeURIComponent(handle)}/follow`,
      { method: 'DELETE' }
    );
  },

  countFollowers(handle: string) {
    return request<{ followers: number }>(`/creators/${encodeURIComponent(handle)}/followers`, { method: 'GET' });
  },
};


import { ApiError, request } from './client';

/**
 * Usuário de sessão retornado por `/auth/me` e pelo 2FA.
 * Espelha `AuthSessionResponseDto`/`Map` do backend (identidade vem da sessão, nunca do cliente).
 */
export interface SessionUserDto {
  id: string;
  name: string;
  email: string;
  username?: string;
  sex?: string;
  profilePublic?: boolean;
  avatarUrl?: string;
  isCreator: boolean;
  creatorId?: string;
  creatorHandle?: string;
  isModerator?: boolean;
  isOwner?: boolean;
  isVip: boolean;
  vipExpiresAt?: string | null;
  privacyConsentRequired?: boolean;
  privacyPolicyVersion?: string;
}

export interface RegisterRequest {
  name: string;
  username: string;
  email: string;
  password: string;
  isCreator?: boolean;
  handle?: string;
  cpf?: string;
  isProfilePublic?: boolean;
  sex?: 'MASCULINO' | 'FEMININO' | 'OUTRO' | 'NAO_INFORMADO';
  instagramUrl?: string;
  youtubeUrl?: string;
  portfolioUrl?: string;
  termsAccepted: boolean;
  privacyPolicyVersion: string;
  birthDate?: string;
}

/** Login aceita e-mail **ou** username — a segunda via de acesso da conta. */
export interface LoginRequest {
  identifier: string;
  password: string;
}

export interface Verify2faRequest {
  identifier: string;
  code: string;
}

/** Resposta de `/auth/login`, `/auth/register` e `/auth/google`: desafio 2FA pendente. */
export interface TwoFactorChallengeResponse {
  status: string;
  message?: string;
  email: string;
}

/** Resposta de `/auth/2fa/verify` após criar a sessão (cookie HttpOnly). */
export interface AuthenticatedResponse {
  status: 'AUTHENTICATED';
  user: SessionUserDto;
}

export const authApi = {
  getPolicyVersion() {
    return request<{ version: string }>('/auth/policy', { method: 'GET' });
  },

  acceptPrivacyPolicy(version: string) {
    return request('/users/me/consent', { method: 'POST', body: JSON.stringify({ version }) });
  },

  requestPasswordReset(email: string) {
    return request<{ status: string; message: string }>('/auth/password-reset/request', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  confirmPasswordReset(payload: { token: string; newPassword: string }) {
    return request<void>('/auth/password-reset/confirm', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  register(payload: RegisterRequest) {
    return request<TwoFactorChallengeResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ isCreator: false, ...payload }),
    });
  },

  login(payload: LoginRequest) {
    return request<TwoFactorChallengeResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Confirma o código 2FA. O backend espera `{ email, code }` (o e-mail identifica o desafio)
   * e cria a sessão via cookie HttpOnly.
   */
  verify2fa(payload: Verify2faRequest) {
    return request<AuthenticatedResponse>('/auth/2fa/verify', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Sessão autenticada corrente. `null` representa exclusivamente ausência de sessão (HTTP 401).
   */
  async me(): Promise<SessionUserDto | null> {
    try {
      return await request<SessionUserDto>('/auth/me', { method: 'GET' });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        return null;
      }
      throw err;
    }
  },

  /**
   * Perfil público pelo username — a página que os demais visitam.
   * Perfil privado devolve apenas o username (regra aplicada no servidor).
   */
  getPublicProfile(username: string) {
    return request<{
      username: string;
      displayName: string | null;
      avatarUrl: string | null;
      isCreator: boolean;
      profilePublic: boolean;
      creatorHandle: string | null;
      bio: string | null;
      instagramUrl: string | null;
      youtubeUrl: string | null;
      portfolioUrl: string | null;
      followerCount: number;
      publicWorkCount: number;
      likedWorkCount: number;
      joinedAt: string | null;
    }>(`/users/${encodeURIComponent(username)}/public-profile`, { method: 'GET' });
  },

  logout() {
    // Sessão é cookie HttpOnly (ADR-002): o backend revoga e limpa o cookie.
    return request('/auth/logout', { method: 'POST' }).catch(() => ({}));
  },

  /**
   * Dev Outbox: recupera o último OTP emitido para o e-mail, permitindo concluir o 2FA
   * localmente. O endpoint só existe sob profile explícito `dev`/`test`/`local`
   * (`@Profile({"dev","test","local"})` — fail-closed); sem ele, retorna `null` (melhor esforço).
   */
  async fetchDevOtp(email: string): Promise<string | null> {
    try {
      const res = await request<{ otpCode?: string }>(
        `/dev/outbox/latest?email=${encodeURIComponent(email)}`,
        { method: 'GET' }
      );
      return res?.otpCode ?? null;
    } catch {
      return null;
    }
  },
};

export const userApi = {
  /** Perfil do leitor; visibilidade e avatar vêm do servidor, nunca de estado local presumido. */
  getProfile(userId: string) {
    return request<{
      id: string;
      name: string;
      avatarUrl?: string | null;
      isProfilePublic: boolean;
    }>(`/users/${encodeURIComponent(userId)}/profile`, { method: 'GET' });
  },

  /** Atualiza apenas os campos permitidos do perfil da sessão corrente. */
  updateProfile(payload: { avatarUrl?: string; isProfilePublic?: boolean; username?: string }) {
    return request('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Exportação dos dados do titular em JSON (Art. 18 LGPD).
   */
  exportMyData() {
    return request('/users/me/export', {
      method: 'GET',
    });
  },

  /**
   * Exclusão e anonimização de conta (LGPD).
   */
  deleteMyAccount() {
    return request('/users/me', {
      method: 'DELETE',
    });
  },

  /**
   * Alternar favorito/biblioteca no PostgreSQL.
   */
  toggleLibrary(workId: string) {
    return request(`/users/library/${workId}/toggle`, {
      method: 'POST',
    });
  },

  /**
   * Grava progresso de leitura em tempo real no MongoDB.
   * A contagem de anúncio (30 páginas) é decidida e creditada no servidor.
   * `totalPages` é obrigatório no contrato (`TrackPageRequestDto`); sem ele o backend responde 400.
   */
  trackReadingProgress(payload: {
    workId: string;
    chapterId: string;
    page: number;
    totalPages: number;
  }) {
    return request('/users/reading-progress/track', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};

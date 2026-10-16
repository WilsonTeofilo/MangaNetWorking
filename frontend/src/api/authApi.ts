import { ApiError, request } from './client';

/**
 * Usuário de sessão retornado por `/auth/me` e pelo 2FA.
 * Espelha `AuthSessionResponseDto`/`Map` do backend (identidade vem da sessão, nunca do cliente).
 */
export interface SessionUserDto {
  id: string;
  name: string;
  email: string;
  isCreator: boolean;
  creatorId?: string;
  creatorHandle?: string;
  isModerator?: boolean;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  isCreator?: boolean;
  handle?: string;
  cpf?: string;
  isProfilePublic?: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface Verify2faRequest {
  email: string;
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
   * Sessão autenticada corrente. Retorna `null` para visitante (HTTP 401) ou backend indisponível.
   */
  async me(): Promise<SessionUserDto | null> {
    try {
      return await request<SessionUserDto>('/auth/me', { method: 'GET' });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        return null;
      }
      return null;
    }
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

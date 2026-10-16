import { request, setAuthToken } from './client';

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  role?: string;
  twoFactorEnabled?: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface Verify2faRequest {
  challengeId: string;
  code: string;
}

export const authApi = {
  register(payload: RegisterRequest) {
    return request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  login(payload: LoginRequest) {
    return request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  verify2fa(payload: Verify2faRequest) {
    return request('/auth/2fa/verify', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  logout() {
    setAuthToken(null);
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
   */
  trackReadingProgress(payload: {
    workId: string;
    chapterId: string;
    page: number;
    completed?: boolean;
  }) {
    return request('/users/reading-progress/track', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};

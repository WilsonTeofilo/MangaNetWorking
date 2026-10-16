import { request } from './client';

export interface CreateWorkPayload {
  title: string;
  originalTitle?: string;
  synopsis: string;
  coverUrl?: string;
  bannerUrl?: string;
  genres: string[];
  originalAuthorDeclaration: boolean;
}

export interface CreateChapterPayload {
  number: number;
  title: string;
  pages: string[];
  publicReleaseAt?: string;
}

export const workApi = {
  /**
   * Catálogo geral de obras.
   */
  getWorks(genre?: string) {
    const query = genre ? `?genre=${encodeURIComponent(genre)}` : '';
    return request(`/works${query}`);
  },

  getWorkById(workId: string) {
    return request(`/works/${workId}`);
  },

  /**
   * Feed com recomendações do MongoDB.
   */
  getFeed(sort: 'recommended' | 'trending' | 'fresh' = 'recommended', genre?: string) {
    const params = new URLSearchParams();
    if (sort) params.set('sort', sort);
    if (genre) params.set('genre', genre);
    return request(`/feed?${params.toString()}`);
  },

  /**
   * Publicar nova obra com declaração de autoria mandatória.
   */
  createWork(payload: CreateWorkPayload) {
    return request('/works', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Adicionar capítulo a uma obra.
   */
  createChapter(workId: string, payload: CreateChapterPayload) {
    return request(`/works/${workId}/chapters`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Leitura de capítulo com validação autoritativa de Early Access no servidor.
   */
  readChapter(workId: string, chapterId: string) {
    return request(`/works/${workId}/chapters/${chapterId}/read`);
  },

  /**
   * Resgate de missão da temporada de criadores com boost de algoritmo.
   */
  claimMission(missionId: string) {
    return request(`/creators/workspace/missions/${missionId}/claim`, {
      method: 'POST',
    });
  },
};

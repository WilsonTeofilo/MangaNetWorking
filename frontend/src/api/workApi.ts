import { request } from './client';

export interface CreateWorkPayload {
  title: string;
  originalTitle?: string;
  synopsis: string;
  coverUrl?: string;
  bannerUrl?: string;
  genres: string[];
  originalAuthorDeclaration: boolean;
  format?: 'MANGA' | 'LIGHT_NOVEL';
}

export interface CreateChapterPayload {
  chapterNumber: number;
  title: string;
  pages?: string[];
  publicReleaseAt: string;
  format?: 'IMAGE_PAGES' | 'PROSE';
  content?: string;
}

/** Projeção do item de feed (MongoDB) retornada por `GET /api/feed`. */
export interface FeedWorkDto {
  workId: string;
  title: string;
  slug: string;
  originalTitle?: string | null;
  synopsis: string;
  coverUrl?: string | null;
  bannerUrl?: string | null;
  authorId?: string | null;
  authorName?: string | null;
  authorHandle?: string | null;
  authorAvatarUrl?: string | null;
  genres: string[];
  status?: string | null;
  format?: 'MANGA' | 'LIGHT_NOVEL';
  totalViews?: number | null;
  totalLikes?: number | null;
  totalComments?: number | null;
  totalChapters?: number | null;
  latestChapterNumber?: number | null;
  latestChapterTitle?: string | null;
  latestChapterReleaseAt?: string | null;
  latestChapterIsEarlyAccess?: boolean;
  discoveryScore?: number | null;
  trendingScore?: number | null;
  freshRelease?: boolean;
  creatorBoostMul?: number | null;
  updatedAt?: string | null;
}

export interface ChapterSummaryDto {
  id: string;
  chapterNumber: number;
  title: string;
  coverUrl?: string | null;
  publicReleaseAt?: string | null;
  isEarlyAccess: boolean;
  views: number;
  likes: number;
  format?: 'IMAGE_PAGES' | 'PROSE';
}

export interface AuthorSummaryDto {
  authorId: string;
  authorName: string;
  authorHandle: string;
  authorAvatarUrl?: string | null;
  membershipPriceBrl: number;
  isMonetized: boolean;
}

/** `GET /api/works/{slug}` */
export interface WorkDetailsDto {
  id: string;
  title: string;
  slug: string;
  originalTitle?: string | null;
  synopsis: string;
  coverUrl?: string | null;
  bannerUrl?: string | null;
  status?: string | null;
  format?: 'MANGA' | 'LIGHT_NOVEL';
  genres: string[];
  totalChapters: number;
  totalViews: number;
  totalLikes: number;
  author?: AuthorSummaryDto | null;
  chapters: ChapterSummaryDto[];
}

/** `GET /api/works/{slug}/chapters/{chapterNumber}` */
export interface ChapterReadDto {
  locked: boolean;
  chapterId: string;
  workTitle: string;
  chapterNumber: number;
  chapterTitle: string;
  pagesJson: string | null;
  format: 'IMAGE_PAGES' | 'PROSE';
  content?: string | null;
  likes: number;
  authorHandle: string;
  authorId?: string | null;
}

/**
 * Comentário da obra (espelha `WorkCommentResponseDto`).
 * `displayName` e `avatarUrl` vêm nulos quando o autor mantém o perfil privado.
 */
export interface WorkCommentDto {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  profilePublic: boolean;
  isCreator: boolean;
  body: string;
  createdAt: string | null;
}
export const workApi = {
  /**
   * Feed de descoberta (MongoDB): recomendado, em alta ou lançamentos recentes.
   */
  getFeed(sort: 'recommended' | 'trending' | 'fresh' = 'recommended', genre?: string, size?: number) {
    const params = new URLSearchParams();
    params.set('sort', sort);
    if (genre) params.set('genre', genre);
    if (size) params.set('size', String(size));
    return request<FeedWorkDto[]>(`/feed?${params.toString()}`);
  },

  /**
   * Catálogo por obra (alias do feed para manter compatibilidade).
   */
  getWorks(genre?: string) {
    return workApi.getFeed('recommended', genre, 50);
  },

  /**
   * Detalhe de uma obra pelo slug, incluindo a lista de capítulos.
   */
  getWorkBySlug(slug: string) {
    return request<WorkDetailsDto>(`/works/${slug}`);
  },

  getWorkById(workId: string) {
    return workApi.getWorkBySlug(workId);
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
   * Retorna HTTP 403 quando o capítulo está em acesso antecipado e o leitor não é membro.
   */
  readChapter(slug: string, chapterNumber: number) {
    return request<ChapterReadDto>(`/works/${slug}/chapters/${chapterNumber}`);
  },

  /**
   * Resgate de missão da temporada de criadores com boost de algoritmo.
   */
  claimMission(missionId: string) {
    return request('/creators/workspace/missions/' + missionId + '/claim', {
      method: 'POST',
    });
  },
  /**
   * Comentários da obra: leitura pública, escrita por qualquer conta autenticada.
   * O username do autor sempre aparece; nome e avatar só são expostos quando o
   * perfil do autor está público (regra decidida no servidor).
   */
  listComments(workId: string, limit = 50) {
    return request<WorkCommentDto[]>(`/works/${encodeURIComponent(workId)}/comments?limit=${limit}`, {
      method: 'GET',
    });
  },

  createComment(workId: string, body: string, chapterId?: string) {
    return request<WorkCommentDto>(`/works/${encodeURIComponent(workId)}/comments`, {
      method: 'POST',
      body: JSON.stringify({ body, chapterId: chapterId ?? null }),
    });
  },
};


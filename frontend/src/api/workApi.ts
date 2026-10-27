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
  coverUrl?: string;
  pages?: string[];
  publicReleaseAt: string;
  format?: 'IMAGE_PAGES' | 'PROSE';
  content?: string;
  blocksJson?: string;
  chapterType?: 'REGULAR' | 'PROLOGUE' | 'SPECIAL';
}

/** Resumo de uma obra na lista "Minhas obras" (espelha `CreatorWorkSummaryResponseDto`). */
export interface CreatorWorkSummaryDto {
  id: string;
  title: string;
  slug: string;
  synopsis?: string | null;
  genres?: string[];
  coverUrl?: string | null;
  bannerUrl?: string | null;
  status: string;
  /** Formato da obra: MANGA (paginas) ou LIGHT_NOVEL (prosa). */
  format?: 'MANGA' | 'LIGHT_NOVEL' | null;
  totalChapters: number;
  totalViews: number;
  totalLikes: number;
  totalFavorites?: number;
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
  totalFavorites?: number | null;
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
  totalFavorites: number;
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
  blocksJson?: string | null;
  chapterType?: 'REGULAR' | 'PROLOGUE' | 'SPECIAL' | null;
  likes: number;
  likedByMe?: boolean;
  authorHandle: string;
  authorId?: string | null;
  /** Apoio só aparece quando o autor é monetizado e o checkout tem credencial. */
  supportEnabled?: boolean;
  membershipPriceBrl?: number | null;
}

/**
 * Comentário da obra (espelha `WorkCommentResponseDto`).
 * `displayName` e `avatarUrl` vêm nulos quando o autor mantém o perfil privado.
 */
export interface WorkCommentDto {
  id: string;
  parentId: string | null;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  profilePublic: boolean;
  isCreator: boolean;
  /** Assinatura ativa do criador dono da obra, decidida no servidor. */
  subscriber: boolean;
  body: string;
  likesCount: number;
  replyCount: number;
  likedByMe: boolean;
  mine: boolean;
  edited: boolean;
  deleted: boolean;
  createdAt: string | null;
  editedAt: string | null;
  replies: WorkCommentDto[];
}

export interface CommentPageDto {
  items: WorkCommentDto[];
  page: number;
  size: number;
  total: number;
  hasMore: boolean;
}

export interface CommentLikeDto {
  liked: boolean;
  likesCount: number;
}

/** Formato público da obra (`MANGA` = páginas, `LIGHT_NOVEL` = prosa com blocos). */
export type WorkFormatDto = 'MANGA' | 'LIGHT_NOVEL';

/** Item de `GET /api/catalog` (allow-list explícito do backend). */
export interface CatalogWorkDto {
  id: string;
  slug: string;
  title: string;
  originalTitle?: string | null;
  synopsis?: string | null;
  coverUrl?: string | null;
  format?: WorkFormatDto | null;
  genres: string[];
  status?: string | null;
  totalChapters: number;
  totalViews: number;
  totalFavorites: number;
  totalLikes: number;
  totalComments: number;
  authorName?: string | null;
  authorHandle?: string | null;
  authorAvatarUrl?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

/** Página do catálogo com contadores por formato (mesmo recorte, sem o eixo de formato). */
export interface CatalogPageDto {
  items: CatalogWorkDto[];
  page: number;
  size: number;
  total: number;
  totalPages: number;
  totalAll: number;
  totalManga: number;
  totalLightNovel: number;
}

export interface CatalogQuery {
  formato?: 'manga' | 'light-novel';
  genero?: string[];
  status?: 'ongoing' | 'completed' | 'hiatus';
  publico?: 'shonen' | 'seinen';
  q?: string;
  ordem?: 'relevance' | 'recent' | 'updated' | 'views' | 'title';
  ilustracoes?: boolean;
  page?: number;
  size?: number;
}

/** Lançamento já público (`GET /api/catalog/releases`). */
export interface CatalogReleaseDto {
  workId: string;
  workSlug: string;
  workTitle: string;
  coverUrl?: string | null;
  format?: WorkFormatDto | null;
  chapterId: string;
  chapterNumber: number;
  chapterTitle: string;
  chapterType?: 'REGULAR' | 'PROLOGUE' | 'SPECIAL' | null;
  publishedAt: string;
  totalChapters?: number;
  totalViews?: number;
  totalFavorites?: number;
}

export const workApi = {
  /**
   * Feed de descoberta (MongoDB): recomendado, em alta ou lançamentos recentes.
   * `formato` separa os trilhos: em "Tudo" o front pede os dois recortes.
   */
  getFeed(
    sort: 'recommended' | 'trending' | 'fresh' = 'recommended',
    genre?: string,
    size?: number,
    formato?: 'manga' | 'light-novel'
  ) {
    const params = new URLSearchParams();
    params.set('sort', sort);
    if (genre) params.set('genre', genre);
    if (size) params.set('size', String(size));
    if (formato) params.set('formato', formato);
    return request<FeedWorkDto[]>(`/feed?${params.toString()}`);
  },

  /**
   * Catálogo com filtro de formato no servidor, contadores e paginação.
   * A fonte é o PostgreSQL: um filtro nunca depende do último sync do feed.
   */
  getCatalog(query: CatalogQuery) {
    const params = new URLSearchParams();
    if (query.formato) params.set('formato', query.formato);
    (query.genero ?? []).forEach((genero) => params.append('genero', genero));
    if (query.status) params.set('status', query.status);
    if (query.publico) params.set('publico', query.publico);
    if (query.q) params.set('q', query.q);
    if (query.ordem) params.set('ordem', query.ordem);
    if (query.ilustracoes) params.set('ilustracoes', 'true');
    params.set('page', String(query.page ?? 0));
    params.set('size', String(query.size ?? 24));
    return request<CatalogPageDto>(`/catalog?${params.toString()}`);
  },

  /** Lançamentos já públicos, mais recentes primeiro. */
  getReleases(formato?: 'manga' | 'light-novel', limit = 40) {
    const params = new URLSearchParams();
    if (formato) params.set('formato', formato);
    params.set('limit', String(limit));
    return request<CatalogReleaseDto[]>(`/catalog/releases?${params.toString()}`);
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

  /** As obras do próprio autor (tela "Minhas obras"). */
  listMyWorks() {
    return request<CreatorWorkSummaryDto[]>('/works/mine', { method: 'GET' });
  },

  /**
   * Configuração da obra: capa, banner, categorias, título, sinopse e estado.
   * Não mexe em capítulos — cada capítulo tem o próprio fluxo de publicação.
   */
  updateWork(workId: string, payload: {
    title: string;
    synopsis: string;
    coverUrl: string;
    bannerUrl?: string;
    genres?: string[];
    format?: string;
    status?: string;
  }) {
    return request(`/works/${encodeURIComponent(workId)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Edição de um capítulo pelo autor: páginas (nova ordem), capa, título, texto e
   * data de lançamento.
   */
  updateChapter(workId: string, chapterNumber: number, payload: {
    title: string;
    coverUrl?: string;
    pages?: string[];
    content?: string;
    blocksJson?: string;
    format?: 'IMAGE_PAGES' | 'PROSE';
    chapterType?: 'REGULAR' | 'PROLOGUE' | 'SPECIAL';
    publicReleaseAt?: string;
  }) {
    return request(`/works/${encodeURIComponent(workId)}/chapters/${chapterNumber}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  /** Exclui um capitulo do proprio autor. */
  deleteChapter(workId: string, chapterNumber: number) {
    return request(`/works/${encodeURIComponent(workId)}/chapters/${chapterNumber}`, {
      method: 'DELETE',
    });
  },

  /** Remove a obra do autor. */
  deleteWork(workId: string) {
    return request(`/works/${encodeURIComponent(workId)}`, { method: 'DELETE' });
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

  /** Curtida real do capítulo (coração). A obra agrega a soma das curtidas. */
  toggleChapterLike(workId: string, chapterNumber: number) {
    return request<{ liked: boolean; totalLikes: number }>(
      `/works/${encodeURIComponent(workId)}/chapters/${chapterNumber}/like`,
      { method: 'POST' },
    );
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
  listComments(
    workId: string,
    options: { chapterId?: string; page?: number; size?: number; sort?: 'top' | 'new' } = {},
  ) {
    const params = new URLSearchParams();
    if (options.chapterId) params.set('chapterId', options.chapterId);
    params.set('page', String(options.page ?? 0));
    params.set('size', String(options.size ?? 20));
    params.set('sort', options.sort ?? 'top');
    return request<CommentPageDto>(
      `/works/${encodeURIComponent(workId)}/comments?${params.toString()}`,
      { method: 'GET' },
    );
  },

  createComment(workId: string, body: string, chapterId?: string, parentId?: string) {
    return request<WorkCommentDto>(`/works/${encodeURIComponent(workId)}/comments`, {
      method: 'POST',
      body: JSON.stringify({ body, chapterId: chapterId ?? null, parentId: parentId ?? null }),
    });
  },

  editComment(workId: string, commentId: string, body: string) {
    return request<WorkCommentDto>(
      `/works/${encodeURIComponent(workId)}/comments/${encodeURIComponent(commentId)}`,
      { method: 'PUT', body: JSON.stringify({ body }) },
    );
  },

  deleteComment(workId: string, commentId: string) {
    return request<{ message: string }>(
      `/works/${encodeURIComponent(workId)}/comments/${encodeURIComponent(commentId)}`,
      { method: 'DELETE' },
    );
  },

  toggleCommentLike(workId: string, commentId: string) {
    return request<CommentLikeDto>(
      `/works/${encodeURIComponent(workId)}/comments/${encodeURIComponent(commentId)}/like`,
      { method: 'POST' },
    );
  },

  reportComment(workId: string, commentId: string, reason: string, details?: string) {
    return request<{ message: string }>(
      `/works/${encodeURIComponent(workId)}/comments/${encodeURIComponent(commentId)}/report`,
      { method: 'POST', body: JSON.stringify({ reason, details: details ?? null }) },
    );
  },
};


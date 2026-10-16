import { Work, Chapter } from '../types';
import { FeedWorkDto, WorkDetailsDto, ChapterSummaryDto } from '../api/workApi';

const VALID_GENRES = [
  'Ação',
  'Aventura',
  'Shonen',
  'Seinen',
  'Fantasia',
  'Sci-Fi',
  'Sobrenatural',
  'Mistério',
  'Drama',
  'Comédia',
] as const;

type ValidGenre = (typeof VALID_GENRES)[number];

/**
 * O backend serializa gêneros pelo nome do enum (`ACAO`, `SCI_FI`, ...).
 * Este mapa converte para o rótulo de exibição usado na UI.
 */
const GENRE_LABELS: Record<string, ValidGenre> = {
  ACAO: 'Ação',
  AVENTURA: 'Aventura',
  SHONEN: 'Shonen',
  SEINEN: 'Seinen',
  FANTASIA: 'Fantasia',
  SCI_FI: 'Sci-Fi',
  SOBRENATURAL: 'Sobrenatural',
  MISTERIO: 'Mistério',
  DRAMA: 'Drama',
  COMEDIA: 'Comédia',
};

/** Normaliza um gênero bruto para a chave do enum (espelha o GenreNormalizer do backend). */
function toGenreKey(raw: string): string {
  return raw
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[-\s]/g, '_');
}

/**
 * Converte o `pagesJson` (string JSON com um array de URLs) em uma lista de páginas.
 * Nunca lança: em caso de conteúdo inválido, retorna lista vazia.
 */
export function parsePagesJson(pagesJson: string | null | undefined): string[] {
  if (!pagesJson) return [];
  try {
    const parsed = JSON.parse(pagesJson);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === 'string');
  } catch {
    return [];
  }
}

function normalizeGenres(genres: string[] | null | undefined): ValidGenre[] {
  if (!Array.isArray(genres)) return [];
  const result: ValidGenre[] = [];
  for (const raw of genres) {
    if (typeof raw !== 'string') continue;
    const trimmed = raw.trim();
    // Aceita o nome do enum do backend (ex.: "SCI_FI") ou o rótulo de exibição (ex.: "Sci-Fi").
    const label =
      GENRE_LABELS[toGenreKey(trimmed)] ??
      ((VALID_GENRES as readonly string[]).includes(trimmed) ? (trimmed as ValidGenre) : undefined);
    if (label && !result.includes(label)) {
      result.push(label);
    }
  }
  return result;
}

function normalizeStatus(status: string | null | undefined): Work['status'] {
  if (status === 'completed') return 'completed';
  if (status === 'hiatus') return 'hiatus';
  return 'ongoing';
}

/** Mapeia um item do feed (MongoDB) para o tipo `Work` do frontend. */
export function mapFeedToWork(doc: FeedWorkDto): Work {
  return {
    id: doc.workId,
    slug: doc.slug,
    title: doc.title,
    originalTitle: doc.originalTitle ?? undefined,
    authorId: doc.authorId ?? '',
    authorName: doc.authorName ?? '',
    coverUrl: doc.coverUrl ?? '',
    bannerUrl: doc.bannerUrl ?? doc.coverUrl ?? '',
    synopsis: doc.synopsis ?? '',
    genres: normalizeGenres(doc.genres),
    status: normalizeStatus(doc.status),
    totalChapters: doc.totalChapters ?? 0,
    totalViews: doc.totalViews ?? 0,
    totalLikes: doc.totalLikes ?? 0,
    totalComments: doc.totalComments ?? 0,
    rating: 0,
    updatedAt: doc.updatedAt ?? doc.latestChapterReleaseAt ?? '',
    discoveryScore: doc.discoveryScore ?? undefined,
    trendingScore: doc.trendingScore ?? undefined,
    isFreshRelease: doc.freshRelease ?? undefined,
    activeBoostMul: doc.creatorBoostMul ?? undefined,
  };
}

/** Mapeia um resumo de capítulo (`ChapterSummaryDto`) para o tipo `Chapter` do frontend. */
export function mapChapterSummary(dto: ChapterSummaryDto, workId: string): Chapter {
  return {
    id: dto.id,
    workId,
    number: dto.chapterNumber,
    title: dto.title,
    coverUrl: dto.coverUrl ?? undefined,
    pages: [],
    createdAt: dto.publicReleaseAt ?? '',
    publicReleaseAt: dto.publicReleaseAt ?? '',
    views: dto.views ?? 0,
    likes: dto.likes ?? 0,
    commentsCount: 0,
  };
}

/** Mapeia o detalhe completo da obra (`GET /api/works/{slug}`) para o tipo `Work`. */
export function mapWorkDetailsToWork(dto: WorkDetailsDto): Work {
  const chapters = Array.isArray(dto.chapters)
    ? dto.chapters.map((c) => mapChapterSummary(c, dto.id))
    : [];

  return {
    id: dto.id,
    slug: dto.slug,
    title: dto.title,
    originalTitle: dto.originalTitle ?? undefined,
    authorId: dto.author?.authorId ?? '',
    authorName: dto.author?.authorName ?? (dto.author?.authorHandle ? '@' + dto.author.authorHandle : ''),
    coverUrl: dto.coverUrl ?? '',
    bannerUrl: dto.bannerUrl ?? dto.coverUrl ?? '',
    synopsis: dto.synopsis ?? '',
    genres: normalizeGenres(dto.genres),
    status: normalizeStatus(dto.status),
    totalChapters: dto.totalChapters ?? chapters.length,
    totalViews: dto.totalViews ?? 0,
    totalLikes: dto.totalLikes ?? 0,
    totalComments: 0,
    rating: 0,
    updatedAt: '',
    chapters,
  };
}

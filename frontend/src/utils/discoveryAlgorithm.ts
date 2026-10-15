import { Work, Creator, Chapter } from '../types';

export const PLATFORM_FEE_PERCENT = 0.17; // 17% fixo
export const CREATOR_SHARE_PERCENT = 0.83; // 83% repasse

/**
 * Verifica se o capítulo está em Early Access (acesso exclusivo para membros)
 */
export function isChapterEarlyAccess(chapter: Chapter, nowTs: number = Date.now()): boolean {
  if (!chapter.publicReleaseAt) return false;
  const releaseTime = new Date(chapter.publicReleaseAt).getTime();
  return releaseTime > nowTs;
}

/**
 * Formata tempo restante para liberação pública do capítulo
 */
export function formatTimeUntilPublic(publicReleaseAt: string): {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isUnlocked: boolean;
  formattedText: string;
} {
  const diffMs = new Date(publicReleaseAt).getTime() - Date.now();
  if (diffMs <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isUnlocked: true, formattedText: 'Liberado para o público' };
  }

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

  let text = '';
  if (days > 0) text = `Liberado em ${days}d ${hours}h`;
  else if (hours > 0) text = `Liberado em ${hours}h ${minutes}m`;
  else text = `Liberado em ${minutes}m ${seconds}s`;

  return { days, hours, minutes, seconds, isUnlocked: false, formattedText: text };
}

/**
 * Decaimento temporal logarítmico (estilo feed do YouTube/Facebook)
 */
export function feedTimeDecay(lastUpdateTs: number, nowTs: number = Date.now()): number {
  const ageHours = Math.max(0, (nowTs - lastUpdateTs) / 3600000);
  return 1 / (1 + ageHours / 36); // Suave decaimento após 36 horas
}

/**
 * Proporção de engajamento (Likes/Views) com piso anti-spam
 */
export function engagementQualityMul(likes: number, views: number): number {
  if (views < 40) return 1.0;
  const ratio = likes / views;
  if (ratio >= 0.08) return 1.25; // Alto engajamento orgânico
  if (ratio >= 0.04) return 1.1;
  return 0.9;
}

/**
 * Impulso de lançamento recente (se saiu nas últimas 24h a 7 dias)
 */
export function recentBoost(timestamp: number, nowTs: number = Date.now()): { points: number; isFresh: boolean } {
  const ageMs = Math.max(0, nowTs - timestamp);
  const hours = ageMs / (1000 * 60 * 60);

  if (hours <= 24) return { points: 220, isFresh: true };
  if (hours <= 72) return { points: 140, isFresh: true };
  if (hours <= 168) return { points: 80, isFresh: false };
  if (hours <= 336) return { points: 30, isFresh: false };
  return { points: 0, isFresh: false };
}

/**
 * Multiplicador de boost de algoritmo ganho pelo autor ao cumprir missões
 */
export function getCreatorBoostMul(creator?: Creator, nowTs: number = Date.now()): number {
  if (!creator?.engagementBoostMul || creator.engagementBoostMul <= 1) return 1.0;
  if (creator.engagementBoostUntil) {
    const untilTs = new Date(creator.engagementBoostUntil).getTime();
    if (untilTs < nowTs) return 1.0; // Expirado
  }
  return Math.min(2.5, creator.engagementBoostMul);
}

/**
 * Cálculo do Discovery Score de uma obra (Algoritmo Principal de Recomendação)
 */
export function computeWorkDiscoveryScore(
  work: Work,
  creator?: Creator,
  nowTs: number = Date.now()
): { score: number; isFresh: boolean; boostApplied: number } {
  const lastUpdateTs = new Date(work.updatedAt).getTime();
  
  // Base orgânica (Likes valem 3x views, comentários valem 5x)
  const organicBase = 
    work.totalViews * 1.0 + 
    work.totalLikes * 3.5 + 
    work.totalComments * 5.0 + 
    work.totalChapters * 3.0;

  const { points: boostPoints, isFresh } = recentBoost(lastUpdateTs, nowTs);
  const baseWithRecency = organicBase + boostPoints;

  const decay = feedTimeDecay(lastUpdateTs, nowTs);
  const quality = engagementQualityMul(work.totalLikes, work.totalViews);
  const creatorBoost = getCreatorBoostMul(creator, nowTs);

  const finalScore = Math.round(baseWithRecency * decay * quality * creatorBoost);

  return {
    score: Math.max(1, finalScore),
    isFresh,
    boostApplied: creatorBoost
  };
}

/**
 * Cálculo de "Em Alta" (Trending puro baseado no volume bruto de atenção recente)
 */
export function computeTrendingScore(work: Work): number {
  return work.totalViews + work.totalLikes * 3 + work.totalComments * 4;
}

/**
 * Processa e ordena o feed de obras de acordo com o algoritmo selecionado
 */
export function rankWorksFeed(
  works: Work[],
  creatorsMap: Record<string, Creator>,
  sortMode: 'algorithm' | 'fresh' | 'trending' | 'likes',
  selectedGenre?: string | null
): Work[] {
  const nowTs = Date.now();

  let filtered = [...works];
  if (selectedGenre && selectedGenre !== 'Todos') {
    filtered = filtered.filter(w => w.genres.includes(selectedGenre as any));
  }

  // Enriquecer obras com as métricas calculadas
  const enriched = filtered.map(work => {
    const creator = creatorsMap[work.authorId];
    const { score, isFresh, boostApplied } = computeWorkDiscoveryScore(work, creator, nowTs);
    const trend = computeTrendingScore(work);

    return {
      ...work,
      discoveryScore: score,
      trendingScore: trend,
      isFreshRelease: isFresh,
      activeBoostMul: boostApplied
    };
  });

  if (sortMode === 'algorithm') {
    return enriched.sort((a, b) => (b.discoveryScore || 0) - (a.discoveryScore || 0));
  }
  if (sortMode === 'fresh') {
    return enriched.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }
  if (sortMode === 'trending') {
    return enriched.sort((a, b) => (b.trendingScore || 0) - (a.trendingScore || 0));
  }
  if (sortMode === 'likes') {
    return enriched.sort((a, b) => b.totalLikes - a.totalLikes);
  }

  return enriched;
}

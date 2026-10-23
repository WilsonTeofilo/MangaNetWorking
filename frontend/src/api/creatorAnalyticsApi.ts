/**
 * Analytics do criador (espelha `CreatorAnalyticsResponseDto`).
 * Dados reais: eventos de leitura/descoberta no Mongo e lançamentos no ledger financeiro.
 */
export interface CreatorAnalyticsDto {
  windowDays: number;
  from: string;
  to: string;
  viewsPerDay: { date: string; views: number; uniqueReaders: number }[];
  pageRetention: { page: number; readers: number; retentionPercent: number }[];
  netDonationsBrl: number;
  netMembershipsBrl: number;
  netWithdrawalsBrl: number;
  netEarningsBrl: number;
  walletBalanceBrl: number;
  monthlyMembersCount: number;
  totals?: {
    views: number;
    uniqueReaders: number;
    impressions: number;
    openings: number;
    attributedOpenings: number;
    ctrPercent: number | null;
  };
  comparison?: {
    from: string;
    to: string;
    views: number;
    uniqueReaders: number;
    viewsPerDay: { date: string; views: number }[];
  };
  funnel?: {
    impressions: number;
    openings: number;
    attributedOpenings: number;
    qualifiedStarts: number;
    completions: number | null;
  };
  audienceHeatmap?: {
    timezone: string;
    days: number;
    sampleSize: number;
    cells: { weekday: number; hour: number; views: number }[];
  };
  viewsLast48Hours?: { hour: string; views: number }[];
  works?: {
    workId: string;
    title: string;
    slug: string;
    coverUrl?: string | null;
    status?: string | null;
    views: number;
    uniqueReaders: number;
    impressions: number;
    attributedOpenings: number;
    ctrPercent: number | null;
    completionRatePercent: number | null;
    completedReaders: number;
    chapters: {
      chapterId: string;
      chapterNumber: number;
      title: string;
      views: number;
      uniqueReaders: number;
      completionRatePercent: number | null;
      completedReaders: number;
    }[];
  }[];
}

export interface SeasonStatusDto {
  seasonId?: string;
  currentDay?: number;
  totalDays?: number;
  daysRemaining?: number;
  level?: number;
  xp?: number;
  nextLevelXp?: number;
  missionsCompleted?: number;
  missionsTotal?: number;
  multiplier?: number;
}

export const creatorAnalyticsApi = {
  getAnalytics(days = 28) {
    return request<CreatorAnalyticsDto>(`/creators/analytics?days=${days}`, { method: 'GET' });
  },

  /** CSV agregado, gerado no servidor com os mesmos filtros e fórmulas da tela. */
  downloadCsv(days = 28) {
    return downloadFile(`/creators/analytics/export.csv?days=${days}`, `analytics-${days}-dias.csv`);
  },

  getSeasonStatus() {
    return request<SeasonStatusDto>('/creators/season', { method: 'GET' });
  },
};

// Reexporta o cliente para manter a importação única no front.
import { downloadFile, request } from './client';

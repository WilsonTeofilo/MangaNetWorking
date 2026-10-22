/**
 * Analytics do criador (espelha `CreatorAnalyticsResponseDto`).
 * Dados reais: eventos de leitura no Mongo e lançamentos no ledger financeiro.
 */
export interface CreatorAnalyticsDto {
  windowDays: number;
  from: string;
  to: string;
  readsPerDay: { date: string; reads: number; uniqueReaders: number }[];
  pageRetention: { page: number; readers: number; retentionPercent: number }[];
  netDonationsBrl: number;
  netMembershipsBrl: number;
  netWithdrawalsBrl: number;
  netEarningsBrl: number;
  walletBalanceBrl: number;
  monthlyMembersCount: number;
  totals?: { reads: number; uniqueReaders: number };
  readsLast48Hours?: { hour: string; reads: number }[];
  works?: {
    workId: string;
    title: string;
    slug: string;
    coverUrl?: string | null;
    status?: string | null;
    reads: number;
    uniqueReaders: number;
    chapters: {
      chapterId: string;
      chapterNumber: number;
      title: string;
      reads: number;
      uniqueReaders: number;
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
  getAnalytics(days = 30) {
    return request<CreatorAnalyticsDto>(`/creators/analytics?days=${days}`, { method: 'GET' });
  },

  getSeasonStatus() {
    return request<SeasonStatusDto>('/creators/season', { method: 'GET' });
  },
};

// Reexporta o cliente para manter a importação única no front.
import { request } from './client';

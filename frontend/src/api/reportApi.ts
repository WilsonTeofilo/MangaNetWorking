import { request } from './client';
import { ReportPayload } from '../types';

export interface PendingReportItem {
  id: string;
  workId: string;
  workTitle: string;
  workCoverUrl: string;
  chapterId?: string;
  chapterNumber?: number;
  reason: string;
  description: string;
  status: string;
  createdAt: string;
}

export const reportApi = {
  /**
   * Envia denúncia de violação de direitos autorais (pirataria), pornografia/hentai ou abuso.
   */
  submitReport(payload: ReportPayload) {
    return request('/reports', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Lista denúncias pendentes para a mesa de moderação editorial (Backoffice).
   */
  getPendingReports(): Promise<PendingReportItem[]> {
    return request('/reports/pending', {
      method: 'GET',
    });
  },

  /**
   * Suspensão cautelar imediata de obra denunciada.
   */
  suspendWork(workId: string, reason: string = 'Violação confirmada dos Termos de Uso / Pirataria') {
    return request(`/reports/moderate/suspend/${workId}`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  /**
   * Arquivamento / Rejeição de denúncia improcedente.
   */
  dismissReport(reportId: string, notes: string = 'Denúncia improcedente arquivada após análise.') {
    return request(`/reports/moderate/dismiss/${reportId}`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    });
  },
};

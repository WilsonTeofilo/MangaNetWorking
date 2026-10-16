import { request } from './client';
import { ReportPayload } from '../types';

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
};

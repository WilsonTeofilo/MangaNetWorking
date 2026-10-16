import { request } from './client';

export interface DonateRequest {
  creatorId: string;
  donorName: string;
  donorEmail?: string;
  amountBrl: number;
  message?: string;
  paymentMethod: 'pix' | 'credit_card';
  paymentExternalId?: string;
}

export interface MembershipSubscribeRequest {
  creatorId: string;
  subscriberUserId?: string;
  amountBrl: number;
  paymentExternalId?: string;
}

export interface VipSubscribeRequest {
  userId?: string;
  userEmail?: string;
  amountBrl?: number; // Default 23.00
  paymentMethod?: 'pix' | 'credit_card';
  paymentExternalId?: string;
}

export interface AdImpressionRequest {
  workId: string;
  creatorId: string;
  chapterId?: string;
  pagesRead?: number;
}

export const monetizationApi = {
  /**
   * Envia doação avulsa para o criador (83% criador / 17% plataforma).
   */
  donate(payload: DonateRequest) {
    return request('/monetization/donate', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Assina o Clube de Membros de um criador específico (83% criador / 17% plataforma).
   * Desbloqueia capítulos em Early Access daquele criador.
   */
  subscribeMembership(payload: MembershipSubscribeRequest) {
    return request('/monetization/membership/subscribe', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Assina o VIP da Plataforma (~R$ 23,00 / 30 dias).
   * 100% sem anúncios, selo VIP cosmético e leitura offline no futuro app móvel.
   * Não dá acesso aos capítulos de membros dos criadores.
   */
  subscribeVip(payload: VipSubscribeRequest = {}) {
    return request('/monetization/vip/subscribe', {
      method: 'POST',
      body: JSON.stringify({
        amountBrl: 23.00,
        paymentMethod: 'pix',
        ...payload,
      }),
    });
  },

  /**
   * Registra impressão de anúncio a cada 30 páginas lidas (58% criador / 42% plataforma).
   */
  recordAdImpression(payload: AdImpressionRequest) {
    return request('/monetization/ad/impression', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Consulta saldo consolidado e extrato do criador.
   */
  getCreatorBalance(creatorId: string) {
    return request(`/monetization/creator/balance/${creatorId}`, {
      method: 'GET',
    });
  },
};

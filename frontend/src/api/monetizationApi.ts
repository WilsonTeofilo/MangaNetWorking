import { request } from './client';

/**
 * Doação avulsa. A identidade do doador é resolvida pela sessão no servidor —
 * por isso NÃO enviamos `donorUserId` (seria forjável pelo cliente).
 */
export interface DonateRequest {
  creatorId: string;
  workId?: string;
  chapterId?: string;
  amountBrl: number;
  message?: string;
  paymentExternalId?: string;
}

/**
 * Assinatura do Clube de Membros. O assinante é resolvido pela sessão no servidor.
 */
export interface MembershipSubscribeRequest {
  creatorId: string;
  paymentExternalId?: string;
}

/**
 * Assinatura VIP da plataforma (~R$ 23,00 / 30 dias). O usuário vem da sessão.
 */
export interface VipSubscribeRequest {
  paymentExternalId?: string;
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
   * 100% sem anúncios e selo VIP cosmético. Não dá acesso a capítulos de membros.
   */
  subscribeVip(payload: VipSubscribeRequest = {}) {
    return request('/monetization/vip/subscribe', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Extrato consolidado do criador (ledger append-only) — `GET /monetization/ledger/{creatorId}`.
   * O crédito de anúncios (30 páginas, 58%/42%) é calculado e gravado no servidor
   * durante o tracking de leitura, não por um endpoint de impressão no cliente.
   */
  getCreatorLedger(creatorId: string) {
    return request(`/monetization/ledger/${creatorId}`, {
      method: 'GET',
    });
  },
};

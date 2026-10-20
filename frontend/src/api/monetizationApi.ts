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
  idempotencyKey: string;
}

export interface SupportCheckoutResponse { checkoutUrl: string; amountBrl: number; }

/**
 * Assinatura VIP da plataforma (~R$ 23,00 / 30 dias). O usuário vem da sessão.
 */
export interface VipCheckoutResponse {
  checkoutUrl: string;
  priceBrl: number;
}

export const monetizationApi = {
  /**
   * Envia doação avulsa para o criador (83% criador / 17% plataforma).
   */
  createDonationCheckout(payload: DonateRequest & { idempotencyKey: string }) {
    return request<SupportCheckoutResponse>('/monetization/donations/checkout', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Assina o Clube de Membros de um criador específico (83% criador / 17% plataforma).
   * Desbloqueia capítulos em Early Access daquele criador.
   */
  createMembershipCheckout(payload: MembershipSubscribeRequest) {
    return request<SupportCheckoutResponse>('/monetization/membership/checkout', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /** Cria checkout no backend; valor, identidade e referência são definidos no servidor. */
  createVipCheckout() {
    return request<VipCheckoutResponse>('/monetization/mercadopago/vip/checkout', {
      method: 'POST',
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

import { useAuth } from '../../context/AuthContext';
import { DonateModal } from '../modals/DonateModal';
import { MembershipModal } from '../modals/MembershipModal';
import { EarlyAccessModal } from '../modals/EarlyAccessModal';
import { VipModal } from '../modals/VipModal';
import { ReportModal } from '../modals/ReportModal';

interface GlobalAppNoticesProps {
  paymentReturnStatus: string | null;
  onClearPaymentStatus: () => void;
}

export function GlobalAppNotices({ paymentReturnStatus, onClearPaymentStatus }: GlobalAppNoticesProps) {
  const { favoriteNotice, dismissFavoriteNotice } = useAuth();

  return (
    <>
      {favoriteNotice && (
        <div
          role="status"
          className="fixed inset-x-4 top-20 z-[100] mx-auto max-w-lg border-2 border-[var(--mn-yellow)] bg-[var(--mn-ink)] p-4 text-[var(--mn-paper)] shadow-[4px_4px_0_var(--mn-yellow)]"
        >
          <p className="font-display text-lg uppercase">Biblioteca</p>
          <p className="mt-1 text-sm">{favoriteNotice}</p>
          <button className="mt-3 underline focus-visible:outline" onClick={dismissFavoriteNotice}>
            Fechar aviso
          </button>
        </div>
      )}

      {paymentReturnStatus && (
        <div
          role="status"
          className="fixed inset-x-4 top-20 z-[100] mx-auto max-w-lg border-2 border-[var(--mn-yellow)] bg-[var(--mn-ink)] p-4 text-[var(--mn-paper)] shadow-[4px_4px_0_var(--mn-yellow)]"
        >
          <p className="font-display text-lg uppercase">
            {paymentReturnStatus === 'approved'
              ? 'Pagamento recebido'
              : paymentReturnStatus === 'pending'
              ? 'Pagamento pendente'
              : 'Pagamento não concluído'}
          </p>
          <p className="mt-1 text-sm">
            {paymentReturnStatus === 'approved'
              ? 'Estamos atualizando sua assinatura VIP após confirmação segura do Mercado Pago.'
              : paymentReturnStatus === 'pending'
              ? 'Aguarde a confirmação do Mercado Pago. Seu VIP não será ativado antes da aprovação.'
              : 'Nenhuma cobrança foi confirmada. Você pode tentar novamente.'}
          </p>
          <button className="mt-3 underline focus-visible:outline" onClick={onClearPaymentStatus}>
            Fechar aviso
          </button>
        </div>
      )}

      {/* Modais Globais */}
      <DonateModal />
      <MembershipModal />
      <EarlyAccessModal />
      <VipModal />
      <ReportModal />
    </>
  );
}

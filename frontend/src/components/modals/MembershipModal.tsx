import { useState } from 'react';
import { Sparkles, Check } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../ui/Button';
import { useModals } from '../../context/ModalContext';
import { useAuth } from '../../context/AuthContext';

export function MembershipModal() {
  const { membershipData, closeMembership } = useModals();
  const { subscribeToCreator } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  const creator = membershipData.creator;
  if (!creator) return null;

  const price = creator.membershipPriceBrl;

  const handleSubscribe = async () => {
    setErrorMessage(null);
    setIsLoading(true);
    try {
      const checkout = await subscribeToCreator(creator.id, idempotencyKey);
      window.location.assign(checkout.checkoutUrl);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Não foi possível iniciar a assinatura.');
    } finally { setIsLoading(false); }
  };

  return (
    <Modal
      isOpen={membershipData.isOpen}
      onClose={closeMembership}
      title="CLUBE_MEMBROS.EXE"
      subtitle={`Acesso Antecipado a todos os capítulos de ${creator.name}`}
    >
      <div className="space-y-5">
          {/* Preço e Destaque */}
          <div className="bg-[#0B0B0C] border-2 border-[#FFD400] p-4 text-center">
            <span className="font-pixel text-[12px] uppercase tracking-widest text-[#FFD400] block mb-1">
              PLANO OFICIAL DO CRIADOR
            </span>
            <div className="flex items-baseline justify-center gap-1">
              <span className="font-body text-sm font-bold text-[#A9A59A]">R$</span>
              <span className="font-display text-4xl font-bold text-[#F4EFE3] tabular-nums">
                {price.toFixed(2)}
              </span>
              <span className="font-pixel text-[12px] text-[#A9A59A]">/ MÊS</span>
            </div>
          </div>

          {/* Vantagens do Membro */}
          <div className="space-y-2">
            <h5 className="font-pixel text-[12px] uppercase tracking-wider text-[#A9A59A]">
              VANTAGENS INCLUSAS:
            </h5>
            <ul className="space-y-2 text-xs font-body text-[#F4EFE3]">
              <li className="flex items-start gap-2">
                <Check size={14} className="text-[#3DDC84] mt-0.5 shrink-0" />
                <span><strong>Acesso Antecipado:</strong> Leia novos capítulos até 7 dias antes do público geral.</span>
              </li>
              <li className="flex items-start gap-2">
                <Check size={14} className="text-[#3DDC84] mt-0.5 shrink-0" />
                <span><strong>Selo de Apoiador:</strong> Badge de membro exclusivo nos comentários da obra.</span>
              </li>
              <li className="flex items-start gap-2">
                <Check size={14} className="text-[#3DDC84] mt-0.5 shrink-0" />
                <span>Seu apoio ajuda o criador a continuar publicando.</span>
              </li>
            </ul>
          </div>

          <p className="font-body text-xs text-[var(--mn-mute)]">A assinatura de um mês só será ativada após a confirmação do pagamento.</p>

          <Button
            type="button"
            variant="primary"
            onClick={() => void handleSubscribe()}
            disabled={isLoading || !Number.isFinite(price) || price <= 0}
            className="w-full !min-h-[46px] !text-base flex items-center justify-center gap-2"
          >
            <Sparkles size={16} />
            <span>{isLoading ? 'CONECTANDO AO CHECKOUT…' : 'CONTINUAR PARA PAGAMENTO'}</span>
          </Button>
          {errorMessage && <p role="alert" className="text-sm text-[var(--mn-red)]">{errorMessage}</p>}
      </div>
    </Modal>
  );
}

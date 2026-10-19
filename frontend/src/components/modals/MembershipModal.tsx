import { useState } from 'react';
import { Sparkles, Check, CheckCircle2 } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../ui/Button';
import { useModals } from '../../context/ModalContext';
import { useAuth } from '../../context/AuthContext';

export function MembershipModal() {
  const { membershipData, closeMembership } = useModals();
  const { subscribeToCreator } = useAuth();
  const [isSuccess, setIsSuccess] = useState(false);

  const creator = membershipData.creator;
  if (!creator) return null;

  const price = creator.membershipPriceBrl || 23.0;
  const platformFee = Math.round(price * 0.17 * 100) / 100;
  const creatorNet = Math.round((price - platformFee) * 100) / 100;

  const handleSubscribe = () => {
    subscribeToCreator(creator.id, price);
    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      closeMembership();
    }, 2500);
  };

  return (
    <Modal
      isOpen={membershipData.isOpen}
      onClose={closeMembership}
      title="CLUBE_MEMBROS.EXE"
      subtitle={`Acesso Antecipado a todos os capítulos de ${creator.name}`}
    >
      {isSuccess ? (
        <div className="text-center py-6 space-y-3">
          <CheckCircle2 className="w-14 h-14 text-[#3DDC84] mx-auto animate-bounce" />
          <h4 className="font-display text-2xl uppercase text-[#FFD400]">
            VOCÊ AGORA É MEMBRO OFICIAL!
          </h4>
          <p className="font-body text-xs text-[#A9A59A]">
            Acesso antecipado desbloqueado imediatamente para todos os lançamentos de {creator.handle}.
          </p>
        </div>
      ) : (
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
                <span><strong>83% Direto ao Autor:</strong> Seu apoio financia a continuidade da história.</span>
              </li>
            </ul>
          </div>

          {/* Transparência Financeira */}
          <div className="bg-[#0B0B0C] border-2 border-[#34343A] p-2.5 text-xs text-[#A9A59A] flex justify-between tabular-nums">
            <span>Repasse líquido ao autor (83%):</span>
            <strong className="text-[#3DDC84]">R$ {creatorNet.toFixed(2)} / mês</strong>
          </div>

          <Button
            type="button"
            variant="primary"
            onClick={handleSubscribe}
            className="w-full !min-h-[46px] !text-base flex items-center justify-center gap-2"
          >
            <Sparkles size={16} />
            <span>CONFIRMAR ASSINATURA</span>
          </Button>
        </div>
      )}
    </Modal>
  );
}

import { useState } from 'react';
import { ApiError } from '../../api/client';
import { Sparkles, Check, ShieldAlert, Smartphone } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../ui/Button';
import { useModals } from '../../context/ModalContext';
import { useAuth } from '../../context/AuthContext';

export function VipModal() {
  const { vipData, closeVip } = useModals();
  const { user, createVipCheckout } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [priceBrl, setPriceBrl] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubscribe = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const checkoutResponse = await createVipCheckout();
      setPriceBrl(checkoutResponse.priceBrl);
      const checkout = new URL(checkoutResponse.checkoutUrl);
      if (checkout.protocol !== 'https:' || !/(^|\.)mercadopago\.com(\.br)?$/i.test(checkout.hostname)) {
        throw new Error('O servidor retornou um endereço de checkout inválido.');
      }
      window.location.assign(checkout.href);
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : 'Não foi possível iniciar o checkout. Tente novamente.');
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={vipData.isOpen}
      onClose={closeVip}
      title="ASSINATURA_VIP.EXE"
      subtitle="Experiência MangaNetWorking Pura & Sem Anúncios"
    >
      <div className="space-y-5">
          {/* Preço e Destaque Oficial */}
          <div className="bg-[#0B0B0C] border-2 border-[#FFD400] p-4 text-center shadow-[4px_4px_0_#FFD400]">
            <span className="font-pixel text-[12px] uppercase tracking-widest text-[#FFD400] block mb-1">
              PREMIUM GLOBAL DA PLATAFORMA
            </span>
            <div className="flex items-baseline justify-center gap-1">
              <span className="font-body text-sm font-bold text-[#A9A59A]">R$</span>
              <span className="font-display text-4xl font-bold text-[#F4EFE3] tabular-nums">
                {priceBrl === null ? '—' : new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(priceBrl)}
              </span>
              <span className="font-pixel text-[12px] text-[#A9A59A]">/ 30 DIAS</span>
            </div>
            <span className="font-body text-[12px] text-[#A9A59A] block mt-1">
              Cancele quando quiser · Pagamento via PIX ou Cartão
            </span>
          </div>

          {/* Vantagens Inclusas */}
          <div className="space-y-2">
            <h5 className="font-pixel text-[12px] uppercase tracking-wider text-[#A9A59A]">
              VANTAGENS EXCLUSIVAS VIP:
            </h5>
            <ul className="space-y-2 text-xs font-body text-[#F4EFE3]">
              <li className="flex items-start gap-2">
                <Check size={14} className="text-[#3DDC84] mt-0.5 shrink-0" />
                <span><strong>Zero Anúncios:</strong> Leitura 100% contínua sem nenhum banner ou interrupção publicitária.</span>
              </li>
              <li className="flex items-start gap-2">
                <Check size={14} className="text-[#3DDC84] mt-0.5 shrink-0" />
                <span><strong>Selo VIP Cosmético:</strong> Destaque oficial dourado no seu avatar e nos comentários.</span>
              </li>
              <li className="flex items-start gap-2">
                <Smartphone size={14} className="text-[#FFD400] mt-0.5 shrink-0" />
                <span><strong>Leitura Offline:</strong> assinantes VIP podem baixar capítulos no navegador (PWA) e ler sem internet. O download seguro dentro do app móvel chega na próxima fase.</span>
              </li>
            </ul>
          </div>

          {/* Alerta de Integridade Editorial (Respeito aos Criadores) */}
          <div className="bg-[#151517] border-2 border-[#E8402F] p-3 text-left space-y-1">
            <div className="flex items-center gap-1.5 text-[#E8402F] font-pixel text-[12px] uppercase font-bold">
              <ShieldAlert size={14} />
              <span>REGRA DE OURO EDITORIAL</span>
            </div>
            <p className="font-body text-[12px] text-[#A9A59A] leading-relaxed">
              O VIP da plataforma <strong>NÃO dá acesso antecipado</strong> aos capítulos exclusivos de criadores. Para ler capítulos antecipados de um autor específico, apoie diretamente o <strong>Clube de Membros</strong> dele (com 83% de repasse líquido para o artista).
            </p>
          </div>

          {/* CTA de Assinatura */}
          <div className="pt-2">
            <Button
              variant="primary"
              onClick={handleSubscribe}
              disabled={isLoading || user.isVip}
              className="w-full !py-3 !text-base flex items-center justify-center gap-2"
            >
              <Sparkles size={16} />
              <span>{isLoading ? 'CONECTANDO AO MERCADO PAGO…' : user.isVip ? 'VOCÊ JÁ É ASSINANTE VIP' : `ASSINAR VIA CHECKOUT PRO${priceBrl === null ? '' : ` — ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(priceBrl)}`}`}</span>
            </Button>
            {errorMessage && <p role="alert" className="mt-3 text-sm text-[var(--mn-red)]">{errorMessage}</p>}
          </div>
      </div>
    </Modal>
  );
}

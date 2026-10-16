import { useState } from 'react';
import { Sparkles, Check, CheckCircle2, ShieldAlert, Smartphone } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../ui/Button';
import { useModals } from '../../context/ModalContext';
import { useAuth } from '../../context/AuthContext';

export function VipModal() {
  const { vipData, closeVip } = useModals();
  const { user, subscribeVip } = useAuth();
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubscribe = async () => {
    setIsLoading(true);
    try {
      await subscribeVip();
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        closeVip();
      }, 2500);
    } finally {
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
      {isSuccess ? (
        <div className="text-center py-6 space-y-3">
          <CheckCircle2 className="w-14 h-14 text-[#3DDC84] mx-auto animate-bounce" />
          <h4 className="font-display text-2xl uppercase text-[#FFD400]">
            VOCÊ AGORA É VIP DA PLATAFORMA!
          </h4>
          <p className="font-body text-xs text-[#A9A59A]">
            Todos os anúncios foram removidos da sua leitura. Seu selo VIP já está ativo no seu perfil.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Preço e Destaque Oficial */}
          <div className="bg-[#0B0B0C] border-2 border-[#FFD400] p-4 text-center shadow-[4px_4px_0_#FFD400]">
            <span className="font-pixel text-[11px] uppercase tracking-widest text-[#FFD400] block mb-1">
              PREMIUM GLOBAL DA PLATAFORMA
            </span>
            <div className="flex items-baseline justify-center gap-1">
              <span className="font-body text-sm font-bold text-[#A9A59A]">R$</span>
              <span className="font-display text-4xl font-bold text-[#F4EFE3] tabular-nums">
                23,00
              </span>
              <span className="font-pixel text-xs text-[#A9A59A]">/ 30 DIAS</span>
            </div>
            <span className="font-body text-[11px] text-[#A9A59A] block mt-1">
              Cancele quando quiser · Pagamento via PIX ou Cartão
            </span>
          </div>

          {/* Vantagens Inclusas */}
          <div className="space-y-2">
            <h5 className="font-pixel text-xs uppercase tracking-wider text-[#A9A59A]">
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
                <span><strong>Leitura Offline (em breve):</strong> o download local seguro de capítulos chegará com o app móvel — ainda não está disponível.</span>
              </li>
            </ul>
          </div>

          {/* Alerta de Integridade Editorial (Respeito aos Criadores) */}
          <div className="bg-[#151517] border-2 border-[#E63946] p-3 text-left space-y-1">
            <div className="flex items-center gap-1.5 text-[#E63946] font-pixel text-[10px] uppercase font-bold">
              <ShieldAlert size={14} />
              <span>REGRA DE OURO EDITORIAL</span>
            </div>
            <p className="font-body text-[11px] text-[#A9A59A] leading-relaxed">
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
              <span>{user.isVip ? 'VOCÊ JÁ É ASSINANTE VIP' : 'ATIVAR VIP AGORA — R$ 23,00'}</span>
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

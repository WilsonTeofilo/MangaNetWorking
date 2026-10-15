import { useState, useEffect } from 'react';
import { Lock, Clock, Sparkles } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../ui/Button';
import { useModals } from '../../context/ModalContext';
import { formatTimeUntilPublic } from '../../utils/discoveryAlgorithm';

export function EarlyAccessModal() {
  const { earlyAccessData, closeEarlyAccess, openMembership } = useModals();
  const [countdown, setCountdown] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isUnlocked: false,
    formattedText: '',
  });

  const { chapter, creator } = earlyAccessData;

  useEffect(() => {
    if (!chapter?.publicReleaseAt) return;

    const updateTimer = () => {
      setCountdown(formatTimeUntilPublic(chapter.publicReleaseAt));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [chapter?.publicReleaseAt]);

  if (!chapter || !creator) return null;

  const handleUnlockClick = () => {
    closeEarlyAccess();
    openMembership(creator);
  };

  return (
    <Modal
      isOpen={earlyAccessData.isOpen}
      onClose={closeEarlyAccess}
      title="ACESSO_ANTECIPADO.EXE"
      subtitle={`Capítulo #${chapter.number} — ${chapter.title}`}
    >
      <div className="space-y-5 text-center">
        {/* Ícone de Bloqueio em Estilo Sticker */}
        <div className="w-16 h-16 bg-[#0B0B0C] border-2 border-[#FFD400] shadow-[4px_4px_0_#FFD400] flex items-center justify-center mx-auto text-[#FFD400]">
          <Lock size={30} />
        </div>

        <div>
          <h4 className="font-display text-2xl uppercase tracking-wider text-[#F4EFE3]">
            CAPÍTULO EXCLUSIVO PARA MEMBROS
          </h4>
          <p className="font-body text-xs text-[#A9A59A] mt-1.5 max-w-sm mx-auto">
            O autor <strong>{creator.handle}</strong> liberou este capítulo em
            primeira mão para os membros apoiadores.
          </p>
        </div>

        {/* Cronômetro Regressivo */}
        <div className="bg-[#0B0B0C] border-2 border-[#34343A] p-4 text-center space-y-1">
          <div className="flex items-center justify-center gap-1.5 text-xs text-[#A9A59A] font-pixel">
            <Clock size={14} className="text-[#FFD400]" />
            <span>LIBERAÇÃO PÚBLICA GRATUITA EM:</span>
          </div>
          <div className="font-display text-3xl text-[#FFD400] tracking-wider tabular-nums">
            {countdown.days > 0 && `${countdown.days}D `}
            {countdown.hours}H {countdown.minutes}M {countdown.seconds}S
          </div>
        </div>

        {/* Ação Primária de Membro */}
        <div className="space-y-2 pt-2">
          <Button
            type="button"
            variant="primary"
            onClick={handleUnlockClick}
            className="w-full !min-h-[46px] !text-base flex items-center justify-center gap-2"
          >
            <Sparkles size={16} />
            <span>VIRAR MEMBRO POR R$ {creator.membershipPriceBrl.toFixed(2)}/MÊS</span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={closeEarlyAccess}
            className="w-full !text-xs"
          >
            AGUARDAR LIBERAÇÃO GRATUITA
          </Button>
        </div>
      </div>
    </Modal>
  );
}

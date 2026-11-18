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
      title="ACESSO ANTECIPADO"
      subtitle={`Capítulo #${chapter.number} — ${chapter.title}`}
    >
      <div className="space-y-5 text-center">
        {/* Ícone de Bloqueio em Estilo Sticker */}
        <div className="w-16 h-16 bg-[var(--mn-ink)] border-2 border-[var(--mn-yellow)] shadow-[4px_4px_0_var(--mn-yellow)] flex items-center justify-center mx-auto text-[var(--mn-yellow)]">
          <Lock size={30} />
        </div>

        <div>
          <h4 className="font-display text-2xl uppercase tracking-wider text-[var(--mn-paper)]">
            CAPÍTULO EXCLUSIVO PARA MEMBROS
          </h4>
          <p className="font-body text-xs text-[var(--mn-mute)] mt-1.5 max-w-sm mx-auto">
            O autor <strong>{creator.handle}</strong> liberou este capítulo em
            primeira mão para os membros apoiadores.
          </p>
        </div>

        {/* Cronômetro Regressivo */}
        <div className="bg-[var(--mn-ink)] border-2 border-[var(--mn-line)] p-4 text-center space-y-1">
          <div className="flex items-center justify-center gap-1.5 text-xs text-[var(--mn-mute)] font-pixel">
            <Clock size={14} className="text-[var(--mn-yellow)]" />
            <span>LIBERAÇÃO PÚBLICA GRATUITA EM:</span>
          </div>
          <div className="font-display text-3xl text-[var(--mn-yellow)] tracking-wider tabular-nums">
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

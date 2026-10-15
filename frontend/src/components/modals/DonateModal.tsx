import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../ui/Button';
import { useModals } from '../../context/ModalContext';

export function DonateModal() {
  const { donateData, closeDonate } = useModals();
  const [amount, setAmount] = useState<number>(10);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  const presets = [5, 10, 25, 50];
  const activeAmount = customAmount ? parseFloat(customAmount) || 0 : amount;

  // Split: 17% Plataforma, 83% Repasse ao Autor
  const platformFee = Math.round(activeAmount * 0.17 * 100) / 100;
  const creatorNet = Math.round((activeAmount - platformFee) * 100) / 100;

  const handleDonate = () => {
    if (activeAmount < 1) return;
    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      closeDonate();
    }, 2500);
  };

  return (
    <Modal
      isOpen={donateData.isOpen}
      onClose={closeDonate}
      title="APOIAR_AUTOR.EXE"
      subtitle={`Doação direta para ${donateData.creatorName}`}
    >
      {isSuccess ? (
        <div className="text-center py-6 space-y-3">
          <CheckCircle2 className="w-14 h-14 text-[#3DDC84] mx-auto animate-bounce" />
          <h4 className="font-display text-2xl uppercase text-[#FFD400]">
            APOIO ENVIADO COM SUCESSO!
          </h4>
          <p className="font-body text-xs text-[#A9A59A] tabular-nums">
            R$ {activeAmount.toFixed(2)} transferido. 83% foi direto para a carteira do autor!
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {donateData.workTitle && (
            <div className="bg-[#0B0B0C] border-2 border-[#34343A] p-2.5 text-xs text-[#A9A59A]">
              Obra: <strong className="text-[#F4EFE3]">{donateData.workTitle}</strong>
            </div>
          )}

          {/* Seleção de Valores */}
          <div>
            <label className="block text-xs font-pixel uppercase tracking-wider text-[#A9A59A] mb-2">
              ESCOLHA O VALOR DO APOIO:
            </label>
            <div className="grid grid-cols-4 gap-2">
              {presets.map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => {
                    setAmount(val);
                    setCustomAmount('');
                  }}
                  className={`py-2 border-2 font-display text-base tracking-wider uppercase transition-all ${
                    !customAmount && amount === val
                      ? 'bg-[#FFD400] text-[#0B0B0C] border-[#0B0B0C] shadow-[2px_2px_0_#0B0B0C]'
                      : 'bg-[#0B0B0C] text-[#F4EFE3] border-[#34343A] hover:border-[#FFD400]'
                  }`}
                >
                  R$ {val}
                </button>
              ))}
            </div>
          </div>

          {/* Valor Personalizado */}
          <div>
            <label className="block text-xs font-pixel uppercase tracking-wider text-[#A9A59A] mb-1.5">
              OU DIGITE OUTRO VALOR:
            </label>
            <input
              type="number"
              min="1"
              step="1"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              placeholder="Ex: 15.00"
              className="w-full p-2.5 bg-[#0B0B0C] text-[#F4EFE3] font-body text-sm border-2 border-[#34343A] focus:border-[#FFD400] outline-none"
            />
          </div>

          {/* Mensagem de Apoio */}
          <div>
            <label className="block text-xs font-pixel uppercase tracking-wider text-[#A9A59A] mb-1.5">
              MENSAGEM DE INCENTIVO (OPCIONAL):
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={2}
              placeholder="Manda uma mensagem de força pro autor..."
              className="w-full p-2.5 bg-[#0B0B0C] text-[#F4EFE3] font-body text-sm border-2 border-[#34343A] focus:border-[#FFD400] outline-none"
            />
          </div>

          {/* Transparência do Split */}
          <div className="bg-[#0B0B0C] border-2 border-[#34343A] p-3 text-xs space-y-1.5 font-body">
            <div className="flex justify-between text-[#A9A59A]">
              <span>Taxa da Plataforma (17%):</span>
              <span className="tabular-nums">R$ {platformFee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[#3DDC84] font-semibold border-t border-[#34343A] pt-1">
              <span>Repasse Líquido ao Autor (83%):</span>
              <span className="tabular-nums">R$ {creatorNet.toFixed(2)}</span>
            </div>
          </div>

          {/* Botão de Confirmação */}
          <Button
            type="button"
            variant="primary"
            onClick={handleDonate}
            disabled={activeAmount < 1}
            className="w-full !min-h-[46px] !text-lg"
          >
            CONFIRMAR APOIO DE R$ {activeAmount.toFixed(2)} VIA PIX
          </Button>
        </div>
      )}
    </Modal>
  );
}

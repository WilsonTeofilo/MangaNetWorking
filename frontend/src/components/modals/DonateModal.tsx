import { useState } from 'react';
import { Modal } from '../common/Modal';
import { useModals } from '../../context/ModalContext';
import { monetizationApi } from '../../api/monetizationApi';

export function DonateModal() {
  const { donateData, closeDonate } = useModals();
  const [amount, setAmount] = useState<number>(10);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());

  const presets = [5, 10, 25, 50];
  const activeAmount = customAmount ? parseFloat(customAmount) || 0 : amount;

  const createCheckout = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const checkout = await monetizationApi.createDonationCheckout({
        creatorId: donateData.creatorId, workId: donateData.workId, amountBrl: activeAmount,
        message: message.trim() || undefined, idempotencyKey,
      });
      window.location.assign(checkout.checkoutUrl);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Não foi possível iniciar o checkout.');
    } finally { setIsLoading(false); }
  };

  return (
    <Modal
      isOpen={donateData.isOpen}
      onClose={closeDonate}
      title="APOIAR AUTOR"
      subtitle={`Doação direta para ${donateData.creatorName}`}
    >
      <div className="space-y-5">
          {donateData.workTitle && (
            <div className="bg-[var(--mn-ink)] border-2 border-[var(--mn-line)] p-2.5 text-xs text-[var(--mn-mute)]">
              Obra: <strong className="text-[var(--mn-paper)]">{donateData.workTitle}</strong>
            </div>
          )}

          {/* Seleção de Valores */}
          <div>
            <label className="block font-pixel text-[12px] uppercase tracking-wider text-[var(--mn-mute)] mb-2">
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
                    setIdempotencyKey(crypto.randomUUID());
                  }}
                  className={`py-2 border-2 font-display text-base tracking-wider uppercase transition-all ${
                    !customAmount && amount === val
                      ? 'bg-[var(--mn-yellow)] text-[var(--mn-ink)] border-[var(--mn-ink)] shadow-[2px_2px_0_var(--mn-ink)]'
                      : 'bg-[var(--mn-ink)] text-[var(--mn-paper)] border-[var(--mn-line)] hover:border-[var(--mn-yellow)]'
                  }`}
                >
                  R$ {val}
                </button>
              ))}
            </div>
          </div>

          {/* Valor Personalizado */}
          <div>
            <label className="block font-pixel text-[12px] uppercase tracking-wider text-[var(--mn-mute)] mb-1.5">
              OU DIGITE OUTRO VALOR:
            </label>
            <input
              type="number"
              min="1"
              step="1"
              value={customAmount}
              onChange={(e) => { setCustomAmount(e.target.value); setIdempotencyKey(crypto.randomUUID()); }}
              placeholder="Ex: 15.00"
              className="w-full p-2.5 bg-[var(--mn-ink)] text-[var(--mn-paper)] font-body text-sm border-2 border-[var(--mn-line)] focus:border-[var(--mn-yellow)] outline-none"
            />
          </div>

          {/* Mensagem de Apoio */}
          <div>
            <label className="block font-pixel text-[12px] uppercase tracking-wider text-[var(--mn-mute)] mb-1.5">
              MENSAGEM DE INCENTIVO (OPCIONAL):
            </label>
            <textarea
              value={message}
              onChange={(e) => { setMessage(e.target.value); setIdempotencyKey(crypto.randomUUID()); }}
              rows={2}
              placeholder="Manda uma mensagem de força pro autor..."
              className="w-full p-2.5 bg-[var(--mn-ink)] text-[var(--mn-paper)] font-body text-sm border-2 border-[var(--mn-line)] focus:border-[var(--mn-yellow)] outline-none"
            />
          </div>

          <p className="font-body text-xs text-[var(--mn-mute)]">O apoio só será registrado após confirmação segura do pagamento.</p>
          {errorMessage && <p role="alert" className="text-sm text-[var(--mn-red)]">{errorMessage}</p>}
          <button type="button" disabled={isLoading || activeAmount < 2} onClick={() => void createCheckout()} className="mn-on-yellow w-full min-h-11 border-2 border-[var(--mn-ink)] bg-[var(--mn-yellow)] px-4 py-2 font-display text-[var(--mn-ink)] disabled:opacity-50">{isLoading ? 'CONECTANDO AO CHECKOUT…' : 'CONTINUAR PARA PAGAMENTO'}</button>
      </div>
    </Modal>
  );
}

import { useState } from 'react';
import { ShieldAlert, X } from 'lucide-react';
import { Button } from '../../ui/Button';

export interface OriginalWorkDeclarationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
  accepted?: boolean;
}

/**
 * Modal contextual de conformidade legal e tolerância zero à pirataria.
 * Exibido no fluxo de lançamento e na declaração de autoria (Art. 184 do Código Penal).
 */
export function OriginalWorkDeclarationModal({
  isOpen,
  onClose,
  onAccept,
  accepted = false,
}: OriginalWorkDeclarationModalProps) {
  const [agreed, setAgreed] = useState(accepted);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!agreed) return;
    onAccept();
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-declaration-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none"
    >
      <div className="w-full max-w-xl border-2 border-[var(--mn-line)] bg-[var(--mn-ink-2)] shadow-[6px_6px_0_var(--mn-ink)] p-6 sm:p-8 space-y-6 relative">
        <div className="flex items-start justify-between gap-4 border-b-2 border-[var(--mn-line)] pb-4">
          <div className="flex items-center gap-2.5">
            <ShieldAlert size={22} className="text-[var(--mn-red)] shrink-0" />
            <h2
              id="legal-declaration-title"
              className="font-display text-lg sm:text-xl text-[var(--mn-paper)] uppercase tracking-wide"
            >
              AUTORIA ORIGINAL & CONFORMIDADE LEGAL
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 border border-[var(--mn-line)] flex items-center justify-center text-[var(--mn-mute)] hover:text-[var(--mn-paper)] hover:border-[var(--mn-paper)] transition-colors"
            aria-label="Fechar modal"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4 font-body text-xs sm:text-sm text-[var(--mn-paper)] leading-relaxed">
          <p>
            O MangaNetWorking opera sob diretriz estrita de <strong className="text-[var(--mn-yellow)]">tolerância zero à pirataria</strong>.
            É estritamente proibido o upload ou publicação de obras de terceiros, scans, mangás comerciais existentes
            (como <em>Bleach, Naruto, One Piece</em>) ou traduções não autorizadas.
          </p>

          <p className="border-l-2 border-[var(--mn-red)] pl-3 text-[var(--mn-mute)]">
            Infratores sofrerão remoção sumária do conteúdo e suspensão ou banimento definitivo da conta,
            sujeitando-se às sanções civis e criminais do <strong className="text-[var(--mn-paper)]">Art. 184 do Código Penal Brasileiro</strong>.
            Também é expressamente proibido conteúdo pornográfico explícito ou hentai.
          </p>
        </div>

        <div className="border-2 border-[var(--mn-line)] bg-[var(--mn-ink)] p-4 space-y-2">
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-1 w-4 h-4 accent-[var(--mn-yellow)] cursor-pointer"
            />
            <span className="font-display text-xs sm:text-sm text-[var(--mn-paper)] uppercase leading-snug">
              DECLARO QUE TODAS AS OBRAS E CAPÍTULOS PUBLICADOS NESTA CONTA SÃO DE MINHA AUTORIA ORIGINAL E ASSUMO RESPONSABILIDADE JURÍDICA INTEGRAL.
            </span>
          </label>
          <span className="font-body text-[11px] text-[var(--mn-mute)] block pl-7">
            Declaração com validade jurídica vinculada à conta de autor (Art. 184 CP).
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            CANCELAR
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={!agreed}
            onClick={handleConfirm}
            className="!px-6"
          >
            ENTENDI E ACEITO
          </Button>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

export function PrivacyConsentGate() {
  const { user, acceptCurrentPrivacyPolicy, logout } = useAuth();
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [privacyError, setPrivacyError] = useState('');

  return (
    <main className="min-h-screen bg-[var(--mn-ink)] p-6 text-[var(--mn-paper)]">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="privacy-reaccept-title"
        className="mx-auto mt-16 max-w-xl border-2 border-[var(--mn-yellow)] bg-[var(--mn-ink-2)] p-6 shadow-[6px_6px_0_var(--mn-yellow)]"
      >
        <h1 id="privacy-reaccept-title" className="font-display text-2xl uppercase">
          Política atualizada
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-[var(--mn-mute)]">
          A versão {user.privacyPolicyVersion} exige novo aceite antes de continuar. A versão anterior não será considerada aceite desta política.
        </p>
        <p className="mt-4 text-sm">
          Consulte a Política de Privacidade publicada pelo projeto antes de confirmar o aceite.
        </p>
        <label className="mt-5 flex items-start gap-3 text-sm">
          <input
            autoFocus
            type="checkbox"
            checked={privacyAccepted}
            onChange={(event) => setPrivacyAccepted(event.target.checked)}
            className="mt-1 h-4 w-4 accent-[var(--mn-yellow)]"
          />
          Li e aceito a versão {user.privacyPolicyVersion}.
        </label>
        {privacyError && (
          <p role="alert" className="mt-3 text-sm text-[var(--mn-red)]">
            {privacyError}
          </p>
        )}
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            disabled={!privacyAccepted}
            onClick={() =>
              void acceptCurrentPrivacyPolicy().catch(() =>
                setPrivacyError('Não foi possível registrar seu aceite. Tente novamente.')
              )
            }
            className="mn-on-yellow border-2 border-[var(--mn-yellow)] bg-[var(--mn-yellow)] px-4 py-2 font-pixel text-xs text-[var(--mn-ink)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            ACEITAR E CONTINUAR
          </button>
          <button
            onClick={() => void logout()}
            className="border-2 border-[var(--mn-paper)] px-4 py-2 font-pixel text-xs text-[var(--mn-paper)]"
          >
            SAIR
          </button>
        </div>
      </section>
    </main>
  );
}

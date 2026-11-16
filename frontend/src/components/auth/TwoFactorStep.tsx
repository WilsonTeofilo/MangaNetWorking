import { Button } from '../ui/Button';
import { OtpInput } from '../ui/OtpInput';
import { Win } from '../ui/Win';

export interface TwoFactorStepProps {
  email: string;
  challengeEmail: string;
  twoFactorCode: string;
  setTwoFactorCode: (val: string) => void;
  errorMessage: string;
  isLoading: boolean;
  devOtpHint: string;
  onSubmit: (e: React.FormEvent) => void;
  onBackToCredentials: () => void;
}

export function TwoFactorStep({
  email,
  challengeEmail,
  twoFactorCode,
  setTwoFactorCode,
  errorMessage,
  isLoading,
  devOtpHint,
  onSubmit,
  onBackToCredentials,
}: TwoFactorStepProps) {
  const displayEmail = challengeEmail || email;

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div>
        <span className="font-pixel text-[12px] text-[var(--mn-yellow)] tracking-wider block font-bold">
          AUTENTICAÇÃO EM 2 ETAPAS (2FA)
        </span>
        <h2 className="font-display text-3xl text-[var(--mn-paper)] uppercase">
          DIGITE O CÓDIGO
        </h2>
        <p className="font-body text-xs text-[var(--mn-mute)] mt-1">
          Enviamos um código de segurança de 6 dígitos para o e-mail{' '}
          <strong className="text-[var(--mn-paper)]">{displayEmail}</strong>.
        </p>
      </div>

      {/* 6 Caixas Dedicadas de OTP */}
      <div className="py-2">
        <OtpInput
          value={twoFactorCode}
          onChange={setTwoFactorCode}
          length={6}
          disabled={isLoading}
        />
      </div>

      {errorMessage && (
        <div className="p-2 border-2 border-[var(--mn-red)] bg-[var(--mn-red)]/10 font-body text-xs text-[var(--mn-red)]">
          {errorMessage}
        </div>
      )}

      <div className="space-y-3">
        <Button
          type="submit"
          variant="primary"
          disabled={isLoading}
          className="w-full !min-h-[48px] !text-lg"
        >
          {isLoading ? 'VALIDANDO...' : 'CONFIRMAR E ENTRAR'}
        </Button>

        <Button
          type="button"
          variant="ghost"
          onClick={onBackToCredentials}
          className="w-full !text-xs"
        >
          VOLTAR E TROCAR E-MAIL
        </Button>
      </div>

      {/* Dev Outbox em Janela Retrô <Win> (Apenas Fora de Prod) */}
      {devOtpHint && (
        <Win title="DEV_OUTBOX.EXE" className="mt-4">
          <div className="flex items-center justify-between text-xs">
            <span className="font-pixel text-[var(--mn-mute)]">CÓDIGO DE TESTE:</span>
            <button
              type="button"
              onClick={() => setTwoFactorCode(devOtpHint)}
              className="font-display text-base text-[var(--mn-yellow)] hover:underline"
              title="Clique para preencher automaticamente"
            >
              {devOtpHint} (COLAR)
            </button>
          </div>
        </Win>
      )}
    </form>
  );
}

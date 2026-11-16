import { ArrowLeft } from 'lucide-react';
import { LoginBrandingPanel } from '../components/auth/LoginBrandingPanel';
import { LoginForm } from '../components/auth/LoginForm';
import { RegisterForm } from '../components/auth/RegisterForm';
import { TwoFactorStep } from '../components/auth/TwoFactorStep';
import { PasswordRecoveryStep } from '../components/auth/PasswordRecoveryStep';
import { useAuthForm } from '../components/auth/useAuthForm';

export interface LoginPageProps {
  onBackToFeed: () => void;
  onLoginSuccess?: () => void;
}

export function LoginPage({ onBackToFeed, onLoginSuccess }: LoginPageProps) {
  const auth = useAuthForm({ onBackToFeed, onLoginSuccess });

  return (
    <div className="min-h-screen bg-[var(--mn-ink)] flex flex-col justify-center items-center p-4 sm:p-6 select-none relative">
      {/* Botão de Voltar ao Feed */}
      <button
        type="button"
        onClick={onBackToFeed}
        className="absolute top-6 left-6 flex items-center gap-2 font-display text-xs tracking-wider uppercase text-[var(--mn-paper)] hover:text-[var(--mn-yellow)] transition-colors z-20"
      >
        <ArrowLeft size={16} />
        <span>VOLTAR AO INÍCIO</span>
      </button>

      {/* Container Principal de 2 Colunas */}
      <div className="w-full max-w-4xl border-2 border-[var(--mn-ink)] shadow-[8px_8px_0_var(--mn-yellow)] overflow-hidden grid grid-cols-1 md:grid-cols-2">
        {/* Coluna Esquerda: Bloco Amarelo com Mascote e Manifesto */}
        <LoginBrandingPanel />

        {/* Coluna Direita: Formulários Ink */}
        <div className="bg-[var(--mn-ink-2)] text-[var(--mn-paper)] p-8 sm:p-12 flex flex-col justify-center space-y-6">
          {auth.passwordRecoveryStep !== 'none' ? (
            <PasswordRecoveryStep
              step={auth.passwordRecoveryStep}
              email={auth.email}
              setEmail={auth.setEmail}
              isLoading={auth.isLoading}
              errorMessage={auth.errorMessage}
              onSubmit={auth.handlePasswordResetRequest}
              onBackToLogin={auth.resetRecovery}
            />
          ) : auth.step === 'two-factor' ? (
            <TwoFactorStep
              email={auth.email}
              challengeEmail={auth.challengeEmail}
              twoFactorCode={auth.twoFactorCode}
              setTwoFactorCode={auth.setTwoFactorCode}
              errorMessage={auth.errorMessage}
              isLoading={auth.isLoading}
              devOtpHint={auth.devOtpHint}
              onSubmit={auth.handleTwoFactorSubmit}
              onBackToCredentials={() => auth.setStep('credentials')}
            />
          ) : auth.mode === 'login' ? (
            <LoginForm
              email={auth.email}
              setEmail={auth.setEmail}
              password={auth.password}
              setPassword={auth.setPassword}
              isLoading={auth.isLoading}
              errorMessage={auth.errorMessage}
              onSubmit={auth.handleCredentialsSubmit}
              onSwitchMode={auth.switchMode}
              onForgotPassword={() => auth.setPasswordRecoveryStep('request')}
            />
          ) : (
            <RegisterForm
              name={auth.name}
              setName={auth.setName}
              username={auth.username}
              setUsername={auth.setUsername}
              usernameValidation={auth.usernameValidation}
              usernameStatus={auth.usernameStatus}
              usernameSuggestion={auth.usernameSuggestion}
              email={auth.email}
              setEmail={auth.setEmail}
              password={auth.password}
              setPassword={auth.setPassword}
              confirmPassword={auth.confirmPassword}
              setConfirmPassword={auth.setConfirmPassword}
              birthDate={auth.birthDate}
              setBirthDate={auth.setBirthDate}
              sex={auth.sex}
              setSex={auth.setSex}
              termsAccepted={auth.termsAccepted}
              setTermsAccepted={auth.setTermsAccepted}
              privacyPolicyVersion={auth.privacyPolicyVersion}
              isLoading={auth.isLoading}
              errorMessage={auth.errorMessage}
              onSubmit={auth.handleCredentialsSubmit}
              onSwitchMode={auth.switchMode}
            />
          )}
        </div>
      </div>
    </div>
  );
}

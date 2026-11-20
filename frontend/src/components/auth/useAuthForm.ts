import { useEffect, useState } from 'react';
import { ApiError } from '../../api/client';
import { authApi } from '../../api/authApi';
import { useAuth } from '../../context/AuthContext';
import { assessPassword } from '../ui/PasswordInput';
import { validateUsername, type UsernameValidation } from '../../utils/usernameRules';

export type AuthMode = 'login' | 'register';
export type AuthStep = 'credentials' | 'two-factor';
export type PasswordRecoveryStep = 'none' | 'request' | 'sent';
export type SexOption = 'MASCULINO' | 'FEMININO' | 'OUTRO' | 'NAO_INFORMADO';
export type UsernameStatus = 'idle' | 'checking' | 'free' | 'taken';

export interface UseAuthFormOptions {
  onBackToFeed: () => void;
  onLoginSuccess?: () => void;
}

export function limitPasswordLength(value: string): string {
  return Array.from(value).slice(0, 64).join('');
}

export function useAuthForm({ onBackToFeed, onLoginSuccess }: UseAuthFormOptions) {
  const { refreshSession } = useAuth();
  const [mode, setMode] = useState<AuthMode>('login');
  const [step, setStep] = useState<AuthStep>('credentials');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const usernameValidation: UsernameValidation = validateUsername(username);
  /** Situação do username digitado no cadastro (evita erro seco de 'já está em uso'). */
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle');
  /** Alternativa livre oferecida pelo servidor. */
  const [usernameSuggestion, setUsernameSuggestion] = useState<string | null>(null);
  const [sex, setSex] = useState<SexOption>('NAO_INFORMADO');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyPolicyVersion, setPrivacyPolicyVersion] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [passwordRecoveryStep, setPasswordRecoveryStep] = useState<PasswordRecoveryStep>('none');

  // E-mail que identifica o desafio 2FA emitido pelo servidor.
  const [challengeEmail, setChallengeEmail] = useState('');
  // Código 2FA para conveniência em desenvolvimento (Dev Outbox). Vazio em produção.
  const [devOtpHint, setDevOtpHint] = useState('');

  useEffect(() => {
    let cancelled = false;
    void authApi
      .getPolicyVersion()
      .then(({ version }) => {
        if (!cancelled) setPrivacyPolicyVersion(version);
      })
      .catch(() => {
        if (!cancelled) {
          setErrorMessage('Não foi possível carregar a versão atual da política. Tente novamente mais tarde.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const completeLogin = async () => {
    // Hidrata a sessão autoritativa criada após a validação 2FA no servidor.
    await refreshSession();
    if (onLoginSuccess) {
      onLoginSuccess();
    } else {
      onBackToFeed();
    }
  };

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setErrorMessage('');
  };

  const resetRecovery = () => {
    setPasswordRecoveryStep('none');
    setErrorMessage('');
  };

  // Verifica a disponibilidade do username enquanto o titular digita (com atraso) e
  // oferece uma alternativa concreta quando o nome desejado já existe.
  useEffect(() => {
    const candidate = username.trim().toLowerCase();
    if (mode !== 'register' || candidate.length < 3) {
      setUsernameStatus('idle');
      setUsernameSuggestion(null);
      return;
    }
    setUsernameStatus('checking');
    let cancelled = false;
    const timer = setTimeout(() => {
      authApi
        .checkUsername(candidate)
        .then((result) => {
          if (cancelled) return;
          setUsernameStatus(result.available ? 'free' : 'taken');
          setUsernameSuggestion(result.suggestion ?? null);
        })
        .catch(() => {
          if (!cancelled) setUsernameStatus('idle');
        });
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [username, mode]);

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setDevOtpHint('');

    if (mode === 'register') {
      if (!name.trim()) {
        setErrorMessage('Informe seu nome para criar a conta.');
        return;
      }
      const usernameCheck = validateUsername(username);
      if (!usernameCheck.valid) {
        setErrorMessage(usernameCheck.message);
        return;
      }
      if (Array.from(password).length < 8 || Array.from(password).length > 64) {
        setErrorMessage('A senha deve ter entre 8 e 64 caracteres.');
        return;
      }
      if (assessPassword(password).level === 'weak') {
        setErrorMessage('Senha fraca. Use uma senha média ou forte conforme os requisitos exibidos.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage('A confirmação da senha não corresponde.');
        return;
      }
      if (!termsAccepted) {
        setErrorMessage('É obrigatório aceitar os Termos de Uso e a Política de Privacidade (LGPD).');
        return;
      }
      if (!privacyPolicyVersion) {
        setErrorMessage('A versão atual da Política de Privacidade ainda não foi carregada.');
        return;
      }
    }
    if (!email || password.length === 0) {
      setErrorMessage('Preencha seu e-mail e senha.');
      return;
    }
    if (Array.from(password).length > 64) {
      setErrorMessage('A senha deve ter no máximo 64 caracteres.');
      return;
    }

    setIsLoading(true);
    try {
      // Cadastro e login devolvem o mesmo desafio 2FA (o e-mail identifica o desafio).
      const challenge =
        mode === 'register'
          ? await authApi.register({
              name: name.trim(),
              username: username.trim(),
              email,
              password,
              isCreator: false,
              sex,
              termsAccepted: true,
              privacyPolicyVersion,
              birthDate: birthDate ? birthDate : undefined,
            })
          : await authApi.login({ identifier: email.trim(), password });

      const targetEmail = challenge.email || email;
      setChallengeEmail(targetEmail);
      setDevOtpHint((await authApi.fetchDevOtp(targetEmail)) ?? '');
      setStep('two-factor');
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status >= 400 && err.status < 500) {
        // O backend respondeu: credenciais inválidas, dados incompletos ou e-mail já cadastrado.
        const data = err.data as { message?: string } | undefined;
        setErrorMessage(data?.message || 'Não foi possível continuar. Verifique os dados informados.');
      } else {
        setErrorMessage('Não foi possível conectar ao serviço de autenticação. Tente novamente.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleTwoFactorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (twoFactorCode.length < 6) {
      setErrorMessage('Digite o código de 6 dígitos completo.');
      return;
    }

    setIsLoading(true);
    try {
      await authApi.verify2fa({ identifier: challengeEmail || email, code: twoFactorCode });
      await completeLogin();
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status >= 400 && err.status < 500) {
        const data = err.data as { message?: string } | undefined;
        setErrorMessage(data?.message || 'Código inválido ou expirado. Tente novamente.');
      } else {
        setErrorMessage('Não foi possível confirmar sua sessão. Entre novamente.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);
    try {
      await authApi.requestPasswordReset(email);
      setPasswordRecoveryStep('sent');
    } catch (err: unknown) {
      const data = err instanceof ApiError ? (err.data as { message?: string } | undefined) : undefined;
      setErrorMessage(data?.message || 'Não foi possível solicitar a recuperação agora. Tente novamente mais tarde.');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    mode,
    setMode,
    switchMode,
    step,
    setStep,
    passwordRecoveryStep,
    setPasswordRecoveryStep,
    resetRecovery,
    name,
    setName,
    username,
    setUsername,
    usernameValidation,
    usernameStatus,
    usernameSuggestion,
    sex,
    setSex,
    email,
    setEmail,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    twoFactorCode,
    setTwoFactorCode,
    errorMessage,
    setErrorMessage,
    isLoading,
    termsAccepted,
    setTermsAccepted,
    privacyPolicyVersion,
    birthDate,
    setBirthDate,
    challengeEmail,
    devOtpHint,
    handleCredentialsSubmit,
    handleTwoFactorSubmit,
    handlePasswordResetRequest,
  };
}

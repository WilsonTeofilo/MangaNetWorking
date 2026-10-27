import { useEffect, useState } from 'react';
import { ArrowLeft, Mail } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Field } from '../components/ui/Field';
import { assessPassword, PasswordInput } from '../components/ui/PasswordInput';
import { OtpInput } from '../components/ui/OtpInput';
import { Win } from '../components/ui/Win';
import { ApiError } from '../api/client';
import { authApi } from '../api/authApi';
import { useAuth } from '../context/AuthContext';
import { sanitizeUsernameInput, validateUsername } from '../utils/usernameRules';
import mascotSvg from '../assets/brand/mascot-placeholder.svg';
import logoWordmark from '../assets/brand/logo-wordmark.svg';

interface LoginPageProps {
  onBackToFeed: () => void;
  onLoginSuccess?: () => void;
}

/** OTP aleatório usado apenas no modo demonstração (backend indisponível). */
function randomOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function LoginPage({ onBackToFeed, onLoginSuccess }: LoginPageProps) {
  const { refreshSession } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [step, setStep] = useState<'credentials' | 'two-factor'>('credentials');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const usernameValidation = validateUsername(username);
  /** Situacao do username digitado no cadastro (evita erro seco de 'ja esta em uso'). */
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'free' | 'taken'>('idle');
  /** Alternativa livre oferecida pelo servidor. */
  const [usernameSuggestion, setUsernameSuggestion] = useState<string | null>(null);
  const [sex, setSex] = useState<'MASCULINO' | 'FEMININO' | 'OUTRO' | 'NAO_INFORMADO'>('NAO_INFORMADO');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyPolicyVersion, setPrivacyPolicyVersion] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [passwordRecoveryStep, setPasswordRecoveryStep] = useState<'none' | 'request' | 'sent'>('none');

  const limitPasswordLength = (value: string) => Array.from(value).slice(0, 64).join('');

  // E-mail que identifica o desafio 2FA no servidor e modo demonstração (sem backend).
  const [challengeEmail, setChallengeEmail] = useState('');
  const [isDemoMode, setIsDemoMode] = useState(false);
  // Código 2FA para conveniência em desenvolvimento (Dev Outbox). Vazio em produção.
  const [devOtpHint, setDevOtpHint] = useState('');

  useEffect(() => {
    void authApi.getPolicyVersion().then(({ version }) => setPrivacyPolicyVersion(version)).catch(() => {
      setErrorMessage('Não foi possível carregar a versão atual da política. Tente novamente mais tarde.');
    });
  }, []);


  const completeLogin = async () => {
    // Hidrata a sessão real (pode não haver sessão em modo demonstração).
    await refreshSession();
    if (onLoginSuccess) {
      onLoginSuccess();
    } else {
      onBackToFeed();
    }
  };

  const switchMode = (next: 'login' | 'register') => {
    setMode(next);
    setErrorMessage('');
  };

  // Verifica a disponibilidade do username enquanto o titular digita (com atraso) e
  // oferece uma alternativa concreta quando o nome desejado ja existe.
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
      setIsDemoMode(false);
      setDevOtpHint((await authApi.fetchDevOtp(targetEmail)) ?? '');
      setStep('two-factor');
    } catch (err) {
      if (err instanceof ApiError && err.status >= 400 && err.status < 500) {
        // O backend respondeu: credenciais inválidas, dados incompletos ou e-mail já cadastrado.
        const data = err.data as { message?: string } | undefined;
        setErrorMessage(data?.message || 'Não foi possível continuar. Verifique os dados informados.');
      } else {
        if (import.meta.env.DEV) {
          setIsDemoMode(true);
          setChallengeEmail(email);
          setDevOtpHint(randomOtp());
          setStep('two-factor');
        } else {
          setErrorMessage('Não foi possível conectar ao serviço de autenticação. Tente novamente.');
        }
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
      if (!isDemoMode) {
        await authApi.verify2fa({ identifier: challengeEmail || email, code: twoFactorCode });
      }
      await completeLogin();
    } catch (err) {
      if (err instanceof ApiError && err.status >= 400 && err.status < 500) {
        const data = err.data as { message?: string } | undefined;
        setErrorMessage(data?.message || 'Código inválido ou expirado. Tente novamente.');
      } else {
        if (import.meta.env.DEV) await completeLogin();
        else setErrorMessage('Não foi possível confirmar sua sessão. Entre novamente.');
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
    } catch (err) {
      const data = err instanceof ApiError ? err.data as { message?: string } | undefined : undefined;
      setErrorMessage(data?.message || 'Não foi possível solicitar a recuperação agora. Tente novamente mais tarde.');
    } finally {
      setIsLoading(false);
    }
  };

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

      {/* Container Principal de 2 Colunas (Seção 9.9) */}
      <div className="w-full max-w-4xl border-2 border-[var(--mn-ink)] shadow-[8px_8px_0_var(--mn-yellow)] overflow-hidden grid grid-cols-1 md:grid-cols-2">
        
        {/* Coluna Esquerda: Bloco Amarelo (var(--mn-yellow)) com Mascote e Manifesto */}
        <div className="bg-[var(--mn-yellow)] text-[var(--mn-ink)] p-8 sm:p-12 flex flex-col justify-between border-b-2 md:border-b-0 md:border-r-2 border-[var(--mn-ink)] relative overflow-hidden mn-grain">
          <div className="absolute inset-0 mn-halftone opacity-15 pointer-events-none" />

          <div className="relative z-10 space-y-4">
            <span className="font-pixel text-[12px] text-[var(--mn-ink)] font-bold tracking-widest block">
              PORTAL EDITORIAL INDEPENDENTE
            </span>
            <img src={logoWordmark} alt="MangaNetWorking" className="w-56 -rotate-1" />
            <p className="font-body text-sm text-[var(--mn-ink)] font-medium leading-relaxed mt-2">
              A banca digital onde você lê direto dos criadores e apoia as
              produções independentes nacionais com transparência.
            </p>
          </div>

          <div className="relative z-10 py-8 flex flex-col items-center">
            <img
              src={mascotSvg}
              alt="Mascote Nanquim"
              className="w-32 h-36 object-contain -rotate-3 hover:rotate-0 transition-transform duration-200"
            />
            <span className="font-pixel text-[12px] text-[var(--mn-ink)] font-bold mt-2">
              NANQUIM · MASCOTE OFICIAL
            </span>
          </div>

          <div className="relative z-10 border-t-2 border-[var(--mn-ink)] pt-3 font-pixel text-[12px] text-[var(--mn-ink)]">
            AUTORIA PROTEGIDA · ZERO PIRATARIA
          </div>
        </div>

        {/* Coluna Direita: Formulário Ink (var(--mn-ink-2)) */}
        <div className="bg-[var(--mn-ink-2)] text-[var(--mn-paper)] p-8 sm:p-12 flex flex-col justify-center space-y-6">
          
          {passwordRecoveryStep === 'request' ? (
            <form onSubmit={handlePasswordResetRequest} className="space-y-6">
              <div>
                <h2 className="font-display text-3xl text-[var(--mn-paper)] uppercase">RECUPERAR SENHA</h2>
              <p className="font-body text-xs text-[var(--mn-mute)] mt-1">Se o e-mail estiver cadastrado, enviaremos um link de recuperação.</p>
              </div>
              <Field label="E-MAIL" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              {errorMessage && <p role="alert" className="font-body text-xs text-[var(--mn-red)]">{errorMessage}</p>}
              <Button type="submit" variant="primary" disabled={isLoading} className="w-full !min-h-[48px]">{isLoading ? 'ENVIANDO…' : 'ENVIAR LINK'}</Button>
              <button type="button" onClick={() => { setPasswordRecoveryStep('none'); setErrorMessage(''); }} className="w-full font-pixel text-[10px] text-[var(--mn-mute)]">VOLTAR AO LOGIN</button>
            </form>
          ) : passwordRecoveryStep === 'sent' ? (
            <section className="space-y-6" aria-live="polite">
              <h2 className="font-display text-3xl text-[var(--mn-paper)] uppercase">CONFIRA SEU E-MAIL</h2>
              <p className="font-body text-sm text-[var(--mn-mute)]">Se o endereço estiver cadastrado, você receberá um link de validade limitada para redefinir sua senha.</p>
              <button type="button" onClick={() => { setPasswordRecoveryStep('none'); setErrorMessage(''); }} className="w-full font-pixel text-[10px] text-[var(--mn-mute)]">VOLTAR AO LOGIN</button>
            </section>
          ) : step === 'credentials' ? (
            /* Passo 1: Credenciais e Escolha de Papel */
            <form onSubmit={handleCredentialsSubmit} className="space-y-6">
              <div>
                <h2 className="font-display text-3xl sm:text-4xl text-[var(--mn-paper)] uppercase tracking-wide">
                  {mode === 'login' ? 'ENTRAR NA CONTA' : 'CRIAR CONTA'}
                </h2>
                <p className="font-body text-xs text-[var(--mn-mute)] mt-1">
                  {mode === 'login'
                    ? 'Acesse com seu e-mail e senha. O 2FA é obrigatório.'
                    : 'Cadastro com verificação em 2 etapas obrigatória.'}
                </p>
              </div>

              {/* Alternar entre Entrar e Criar Conta */}
              <div className="grid grid-cols-2 border-2 border-[var(--mn-line)]">
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className={`py-2 font-pixel text-[12px] uppercase tracking-wider transition-all ${
                    mode === 'login'
                      ? 'bg-[var(--mn-paper)] text-[var(--mn-ink)]'
                      : 'bg-[var(--mn-ink-3)] text-[var(--mn-mute)] hover:text-[var(--mn-paper)]'
                  }`}
                >
                  ENTRAR
                </button>
                <button
                  type="button"
                  onClick={() => switchMode('register')}
                  className={`py-2 font-pixel text-[12px] uppercase tracking-wider border-l-2 border-[var(--mn-line)] transition-all ${
                    mode === 'register'
                      ? 'bg-[var(--mn-paper)] text-[var(--mn-ink)]'
                      : 'bg-[var(--mn-ink-3)] text-[var(--mn-mute)] hover:text-[var(--mn-paper)]'
                  }`}
                >
                  CRIAR CONTA
                </button>
              </div>

              {/* Botões Grandes de Seleção de Papel (apenas no cadastro) */}
              {mode === 'register' && (
                <div className="space-y-2 border-2 border-[var(--mn-line)] bg-[var(--mn-ink-3)] p-3">
                  <span className="font-pixel text-[12px] text-[var(--mn-mute)] tracking-wider uppercase block">
                    TODAS AS CONTAS COMEÇAM COMO LEITOR
                  </span>
                  <p className="font-body text-xs text-[var(--mn-mute)] leading-relaxed">
                    Leitor lê, curte, comenta e usa a biblioteca. Depois do 2FA você escolhe a foto, a
                    visibilidade do perfil e, se quiser publicar, vira escritor em &quot;Minha conta&quot;
                    (é preciso declarar um link social: Instagram, YouTube ou portfólio).
                  </p>
                </div>
              )}

              <div className="space-y-4">
                {mode === 'register' && (
                  <Field
                    label="NOME"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome completo"
                    required
                  />
                )}

                {mode === 'register' && (
                  <>
                    <Field
                      label="USERNAME"
                      value={username}
                      onChange={(e) => setUsername(sanitizeUsernameInput(e.target.value))}
                      placeholder="ex.: teofilo"
                      helperText="Minúsculas, números, ponto e sublinhado. Não pode ter espaço, acento, símbolo no início/fim nem termo reservado."
                      required
                    />

                    {username.length > 0 && !usernameValidation.valid && (
                      <p className="font-body text-xs text-[var(--mn-red)]" role="alert">
                        {usernameValidation.message}
                      </p>
                    )}

                    {usernameStatus !== 'idle' && (
                      <p
                        className={`font-pixel text-[11px] uppercase ${
                          usernameStatus === 'free'
                            ? 'text-[var(--mn-teal)]'
                            : usernameStatus === 'taken'
                              ? 'text-[var(--mn-red)]'
                              : 'text-[var(--mn-mute)]'
                        }`}
                      >
                        {usernameStatus === 'checking' && 'verificando...'}
                        {usernameStatus === 'free' && `@${username.trim().toLowerCase()} está livre`}
                        {usernameStatus === 'taken' && (
                          <>
                            @{username.trim().toLowerCase()} já está em uso
                            {usernameSuggestion ? ` — use @${usernameSuggestion}` : ''}
                          </>
                        )}
                      </p>
                    )}
                  </>
                )}


                <Field
                  label={mode === 'register' ? 'E-MAIL' : 'E-MAIL OU USERNAME'}
                  type={mode === 'register' ? 'email' : 'text'}
                  inputMode={mode === 'register' ? 'email' : 'text'}
                  autoComplete={mode === 'register' ? 'email' : 'username'}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={mode === 'register' ? 'seu.email@exemplo.com' : 'seu.email@exemplo.com ou seu username'}
                  helperText={mode === 'register' ? undefined : 'Entre com o e-mail ou com o username que você criou.'}
                  required
                  childrenRight={<Mail size={16} className="text-[var(--mn-mute)]" />}
                />

                <PasswordInput
                  label="SENHA"
                  value={password}
                  onChange={(e) => setPassword(limitPasswordLength(e.target.value))}
                  placeholder="••••••••"
                  autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                  showStrength={mode === 'register'}
                  required
                />

                {mode === 'register' && (
                  <>
                    <p id="password-policy" className="font-body text-xs text-[var(--mn-mute)]">Use de 8 a 64 caracteres. Espaços, símbolos, acentos e emojis são aceitos.</p>
                    <PasswordInput
                      label="CONFIRMAR SENHA"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(limitPasswordLength(e.target.value))}
                      autoComplete="new-password"
                      aria-describedby="password-policy"
                      required
                    />
                  </>
                )}

                {mode === 'register' && (
                  <>
                    <Field
                      label="DATA DE NASCIMENTO"
                      type="date"
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      helperText="Necessário para controle de maioridade e proteção legal (LGPD)"
                    />

                    <div className="space-y-2">
                      <label htmlFor="sex" className="font-pixel text-[12px] text-[var(--mn-mute)] tracking-wider uppercase block">
                        SEXO
                      </label>
                      <select
                        id="sex"
                        value={sex}
                        onChange={(e) => setSex(e.target.value as typeof sex)}
                        className="w-full bg-[var(--mn-ink-3)] border-2 border-[var(--mn-line)] px-3 py-3 font-body text-sm text-[var(--mn-paper)] focus:border-[var(--mn-yellow)] focus:outline-none"
                      >
                        <option value="NAO_INFORMADO">Prefiro nao informar</option>
                        <option value="MASCULINO">Masculino</option>
                        <option value="FEMININO">Feminino</option>
                        <option value="OUTRO">Outro</option>
                      </select>
                    </div>

                    <div className="flex items-start gap-2 pt-2">
                      <input
                        type="checkbox"
                        id="termsAccepted"
                        checked={termsAccepted}
                        onChange={(e) => setTermsAccepted(e.target.checked)}
                        className="mt-1 h-4 w-4 rounded border-[var(--mn-line)] bg-[var(--mn-ink-3)] text-[var(--mn-yellow)] focus:ring-0 cursor-pointer"
                      />
                      <label htmlFor="termsAccepted" className="font-body text-xs text-[var(--mn-mute)] leading-relaxed cursor-pointer select-none">
                        Li e concordo com os <span className="text-[var(--mn-paper)] underline">Termos de Uso</span> e a{' '}
                        <span className="text-[var(--mn-paper)] underline">Política de Privacidade</span> (versão {privacyPolicyVersion || 'carregando'}; LGPD - Lei 13.709/2018).
                      </label>
                    </div>
                  </>
                )}
              </div>

              {errorMessage && (
                <div className="p-2 border-2 border-[var(--mn-red)] bg-[var(--mn-red)]/10 font-body text-xs text-[var(--mn-red)]">
                  {errorMessage}
                </div>
              )}


              <Button
                type="submit"
                variant="primary"
                disabled={isLoading}
                className="w-full !min-h-[48px] !text-lg"
              >
                {isLoading
                  ? 'VERIFICANDO...'
                  : mode === 'register'
                    ? 'CRIAR CONTA E ATIVAR 2FA'
                    : 'CONTINUAR COM 2FA'}
              </Button>
              {mode === 'login' && (
                <button type="button" onClick={() => { setPasswordRecoveryStep('request'); setErrorMessage(''); }} className="w-full font-pixel text-[10px] text-[var(--mn-mute)] hover:text-[var(--mn-yellow)]">
                  ESQUECI MINHA SENHA
                </button>
              )}
            </form>
          ) : (
            /* Passo 2: 2FA com OTP de 6 Caixas */
            <form onSubmit={handleTwoFactorSubmit} className="space-y-6">
              <div>
                <span className="font-pixel text-[12px] text-[var(--mn-yellow)] tracking-wider block font-bold">
                  AUTENTICAÇÃO EM 2 ETAPAS (2FA)
                </span>
                <h2 className="font-display text-3xl text-[var(--mn-paper)] uppercase">
                  DIGITE O CÓDIGO
                </h2>
                <p className="font-body text-xs text-[var(--mn-mute)] mt-1">
                  Enviamos um código de segurança de 6 dígitos para o e-mail{' '}
                  <strong className="text-[var(--mn-paper)]">{email}</strong>.
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
                  onClick={() => setStep('credentials')}
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
          )}

        </div>

      </div>

    </div>
  );
}

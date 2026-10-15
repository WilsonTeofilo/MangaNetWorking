import { useState } from 'react';
import { ArrowLeft, Mail, Lock } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Field } from '../components/ui/Field';
import { OtpInput } from '../components/ui/OtpInput';
import { Win } from '../components/ui/Win';
import mascotSvg from '../assets/brand/mascot-placeholder.svg';
import logoWordmark from '../assets/brand/logo-wordmark.svg';

interface LoginPageProps {
  onBackToFeed: () => void;
  onLoginSuccess?: () => void;
}

export function LoginPage({ onBackToFeed, onLoginSuccess }: LoginPageProps) {
  const [roleIntent, setRoleIntent] = useState<'reader' | 'creator'>('reader');
  const [step, setStep] = useState<'credentials' | 'two-factor'>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Simulação do código 2FA enviado para Dev Outbox
  const [mockDevOtp, setMockDevOtp] = useState('742891');

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (!email || !password) {
      setErrorMessage('Preencha seu e-mail e senha.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setMockDevOtp(Math.floor(100000 + Math.random() * 900000).toString());
      setStep('two-factor');
    }, 400);
  };

  const handleTwoFactorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (twoFactorCode.length < 6) {
      setErrorMessage('Digite o código de 6 dígitos completo.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      if (onLoginSuccess) {
        onLoginSuccess();
      } else {
        onBackToFeed();
      }
    }, 500);
  };

  return (
    <div className="min-h-screen bg-[#0B0B0C] flex flex-col justify-center items-center p-4 sm:p-6 select-none relative">
      
      {/* Botão de Voltar ao Feed */}
      <button
        type="button"
        onClick={onBackToFeed}
        className="absolute top-6 left-6 flex items-center gap-2 font-display text-xs tracking-wider uppercase text-[#F4EFE3] hover:text-[#FFD400] transition-colors z-20"
      >
        <ArrowLeft size={16} />
        <span>VOLTAR AO INÍCIO</span>
      </button>

      {/* Container Principal de 2 Colunas (Seção 9.9) */}
      <div className="w-full max-w-4xl border-2 border-[#0B0B0C] shadow-[8px_8px_0_#FFD400] overflow-hidden grid grid-cols-1 md:grid-cols-2">
        
        {/* Coluna Esquerda: Bloco Amarelo (#FFD400) com Mascote e Manifesto */}
        <div className="bg-[#FFD400] text-[#0B0B0C] p-8 sm:p-12 flex flex-col justify-between border-b-2 md:border-b-0 md:border-r-2 border-[#0B0B0C] relative overflow-hidden mn-grain">
          <div className="absolute inset-0 mn-halftone opacity-15 pointer-events-none" />

          <div className="relative z-10 space-y-4">
            <span className="font-pixel text-xs text-[#0B0B0C] font-bold tracking-widest block">
              PORTAL EDITORIAL INDEPENDENTE
            </span>
            <img src={logoWordmark} alt="MangaNetWorking" className="w-56 -rotate-1" />
            <p className="font-body text-sm text-[#0B0B0C] font-medium leading-relaxed mt-2">
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
            <span className="font-pixel text-[11px] text-[#0B0B0C] font-bold mt-2">
              NANQUIM · MASCOTE OFICIAL
            </span>
          </div>

          <div className="relative z-10 border-t-2 border-[#0B0B0C] pt-3 font-pixel text-[10px] text-[#0B0B0C]">
            AUTORIA PROTEGIDA · ZERO PIRATARIA
          </div>
        </div>

        {/* Coluna Direita: Formulário Ink (#151517) */}
        <div className="bg-[#151517] text-[#F4EFE3] p-8 sm:p-12 flex flex-col justify-center space-y-6">
          
          {step === 'credentials' ? (
            /* Passo 1: Credenciais e Escolha de Papel */
            <form onSubmit={handleCredentialsSubmit} className="space-y-6">
              <div>
                <h2 className="font-display text-3xl sm:text-4xl text-[#F4EFE3] uppercase tracking-wide">
                  ENTRAR / CADASTRO
                </h2>
                <p className="font-body text-xs text-[#A9A59A] mt-1">
                  Selecione como deseja navegar na plataforma:
                </p>
              </div>

              {/* Botões Grandes de Seleção de Papel */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRoleIntent('reader')}
                  className={`p-3 border-2 font-display text-base tracking-wider uppercase transition-all ${
                    roleIntent === 'reader'
                      ? 'bg-[#FFD400] text-[#0B0B0C] border-[#0B0B0C] shadow-[3px_3px_0_#F4EFE3]'
                      : 'bg-[#212125] text-[#A9A59A] border-[#34343A] hover:text-[#F4EFE3]'
                  }`}
                >
                  SOU LEITOR
                </button>

                <button
                  type="button"
                  onClick={() => setRoleIntent('creator')}
                  className={`p-3 border-2 font-display text-base tracking-wider uppercase transition-all ${
                    roleIntent === 'creator'
                      ? 'bg-[#FFD400] text-[#0B0B0C] border-[#0B0B0C] shadow-[3px_3px_0_#F4EFE3]'
                      : 'bg-[#212125] text-[#A9A59A] border-[#34343A] hover:text-[#F4EFE3]'
                  }`}
                >
                  SOU CRIADOR
                </button>
              </div>

              <div className="space-y-4">
                <Field
                  label="E-MAIL"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu.email@exemplo.com"
                  required
                  childrenRight={<Mail size={16} className="text-[#A9A59A]" />}
                />

                <Field
                  label="SENHA"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  childrenRight={<Lock size={16} className="text-[#A9A59A]" />}
                />
              </div>

              {errorMessage && (
                <div className="p-2 border-2 border-[#E8402F] bg-[#E8402F]/10 font-body text-xs text-[#E8402F]">
                  {errorMessage}
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                disabled={isLoading}
                className="w-full !min-h-[48px] !text-lg"
              >
                {isLoading ? 'VERIFICANDO...' : 'CONTINUAR COM 2FA'}
              </Button>
            </form>
          ) : (
            /* Passo 2: 2FA com OTP de 6 Caixas */
            <form onSubmit={handleTwoFactorSubmit} className="space-y-6">
              <div>
                <span className="font-pixel text-[11px] text-[#FFD400] tracking-wider block font-bold">
                  AUTENTICAÇÃO EM 2 ETAPAS (2FA)
                </span>
                <h2 className="font-display text-3xl text-[#F4EFE3] uppercase">
                  DIGITE O CÓDIGO
                </h2>
                <p className="font-body text-xs text-[#A9A59A] mt-1">
                  Enviamos um código de segurança de 6 dígitos para o e-mail{' '}
                  <strong className="text-[#F4EFE3]">{email}</strong>.
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
                <div className="p-2 border-2 border-[#E8402F] bg-[#E8402F]/10 font-body text-xs text-[#E8402F]">
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
              <Win title="DEV_OUTBOX.EXE" className="mt-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-pixel text-[#A9A59A]">CÓDIGO DE TESTE:</span>
                  <button
                    type="button"
                    onClick={() => setTwoFactorCode(mockDevOtp)}
                    className="font-display text-base text-[#FFD400] hover:underline"
                    title="Clique para preencher automaticamente"
                  >
                    {mockDevOtp} (COLAR)
                  </button>
                </div>
              </Win>
            </form>
          )}

        </div>

      </div>

    </div>
  );
}

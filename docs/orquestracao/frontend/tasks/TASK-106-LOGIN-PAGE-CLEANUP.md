# TASK-106 — Decomposição Modular e Anti-Monólito de LoginPage (Fluxo de Autenticação e 2FA)

**Status:** Especificada pelo Tech Lead Hermes  
**Executor:** OpenCode Frontend Worker  
**Escopo:** `frontend/src/pages/LoginPage.tsx` e `frontend/src/components/auth/`  

---

## 1. Contexto e Diagnóstico

`LoginPage.tsx` acumulou **545 linhas de código** e mais de **20 hooks `useState`** em um único componente monolítico. O arquivo atualmente acumula as seguintes responsabilidades concorrentes:
1. Painel de branding da Banca de Rua (coluna amarela com mascote Nanquim, logotipo e manifesto).
2. Lógica e debounce de verificação assíncrona de disponibilidade de username (`authApi.checkUsername`).
3. Busca assíncrona da versão ativa da Política de Privacidade para aceite de LGPD.
4. Formulário de login direto com identificador (e-mail ou username) e senha.
5. Formulário de registro com validações complexas de senha, termos de uso, controle de maioridade (data de nascimento) e gênero.
6. Passo de 2FA obrigatório com 6 caixas de OTP (`OtpInput`), emulação de modo demonstração e hint de `DevOutbox`.
7. Fluxo de recuperação de senha (formulário de envio de link e estado de confirmação).

**Meta:** Decompor `LoginPage.tsx` no mesmo padrão de excelência de `CreatorWorkspacePage.tsx` (TASK-100) e `CreatorWorksPage.tsx` (TASK-105), reduzindo a página para menos de 130 linhas.

---

## 2. Arquitetura Modular Proposta

Criar o diretório: `frontend/src/components/auth/` contendo:

### 1. `LoginBrandingPanel.tsx`
- Componente puro focado na coluna esquerda de branding da Banca de Rua:
  - Fundo amarelo oficial (`var(--mn-yellow)` com textura grain/halftone).
  - Logotipo Wordmark.
  - Mascote oficial Nanquim.
  - Slogans e manifesto de autoria protegida / zero pirataria.

### 2. `useAuthForm.ts`
- Hook customizado isolando toda a máquina de estados e integrações de API:
  - Estados de navegação: `mode` ('login' | 'register'), `step` ('credentials' | 'two-factor'), `passwordRecoveryStep` ('none' | 'request' | 'sent').
  - Estados do formulário: `name`, `username`, `usernameStatus`, `usernameSuggestion`, `sex`, `email`, `password`, `confirmPassword`, `twoFactorCode`, `birthDate`, `termsAccepted`, `privacyPolicyVersion`.
  - Estados operacionais: `errorMessage`, `isLoading`, `challengeEmail`, `isDemoMode`, `devOtpHint`.
  - Efeitos: carregamento da versão da política e verificação de disponibilidade de username com debounce e cleanup.
  - Ações: `switchMode`, `handleCredentialsSubmit`, `handleTwoFactorSubmit`, `handlePasswordResetRequest`, `resetRecovery`, `setStep`.
  - Retorno estritamente tipado.

### 3. `LoginForm.tsx`
- Formulário de login:
  - Alternador de abas ("ENTRAR" / "CRIAR CONTA").
  - Campo de identificador (e-mail ou username).
  - Campo de senha com controle de visibilidade.
  - Exibição de mensagem de erro.
  - Botão de submit primário com estado de carregamento.
  - Link "ESQUECI MINHA SENHA".

### 4. `RegisterForm.tsx`
- Formulário de cadastro de leitor:
  - Alternador de abas ("ENTRAR" / "CRIAR CONTA").
  - Box explicativo ("TODAS AS CONTAS COMEÇAM COMO LEITOR").
  - Campo Nome.
  - Campo Username com sanitização, mensagem de validação e feedback de disponibilidade/sugestão.
  - Campo E-mail.
  - Campo Senha com medidor de força (`assessPassword`) e texto explicativo da política.
  - Campo Confirmar Senha.
  - Campo Data de Nascimento e Seletor de Sexo.
  - Checkbox de consentimento com Termos e Política de Privacidade (LGPD).
  - Botão de submit ("CRIAR CONTA E ATIVAR 2FA").

### 5. `TwoFactorStep.tsx`
- Componente para o passo de desafio 2FA:
  - Título e instruções informando o e-mail de destino.
  - Componente de 6 caixas `OtpInput`.
  - Alerta de erro.
  - Botão de confirmação ("CONFIRMAR E ENTRAR").
  - Botão "VOLTAR E TROCAR E-MAIL".
  - Janela retrô `Win` com o código do Dev Outbox (apenas em ambiente de desenvolvimento).

### 6. `PasswordRecoveryStep.tsx`
- Componente para o fluxo de redefinição de senha:
  - Formulário para inserção do e-mail de recuperação.
  - Estado de confirmação ("CONFIRA SEU E-MAIL").
  - Botão de retorno ao login.

### 7. `LoginPage.tsx` (Orquestrador)
- Fica responsável apenas por:
  - Botão superior "VOLTAR AO INÍCIO".
  - Layout de 2 colunas responsivo.
  - Coluna esquerda: `LoginBrandingPanel`.
  - Coluna direita: roteamento dos formulários (`PasswordRecoveryStep`, `TwoFactorStep`, `LoginForm` ou `RegisterForm`).
  - **Meta:** menos de 130 linhas totais.

---

## 3. Critérios de Aceite

- [ ] `LoginPage.tsx` reduzido para < 130 linhas.
- [ ] Criação dos arquivos em `frontend/src/components/auth/`:
  - `LoginBrandingPanel.tsx`
  - `useAuthForm.ts`
  - `LoginForm.tsx`
  - `RegisterForm.tsx`
  - `TwoFactorStep.tsx`
  - `PasswordRecoveryStep.tsx`
- [ ] Preservação de 100% das regras de negócio: validação de username, cálculo de força de senha, 2FA, recuperação de senha e aceite de LGPD.
- [ ] Conformidade total com o Design System Oficial (tokens `var(--mn-*)`).
- [ ] Zero uso de `any` em tipagens ou capturas de erro (`catch (err: unknown)`).
- [ ] Compilação do Frontend aprovada: `Set-Location D:\Projetos\MangaNetWorking\frontend; npm.cmd run build` (0 erros).
- [ ] Relatório de entrega publicado em `docs/orquestracao/frontend/relatorios/RELATORIO-TASK-106.md`.

---
Assinado por: Hermes (Tech Lead / Gerente / Arquiteto)

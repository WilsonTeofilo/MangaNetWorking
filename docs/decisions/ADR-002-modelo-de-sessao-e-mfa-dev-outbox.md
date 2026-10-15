# ADR-002: Modelo de Sessão Segura e Dev Outbox para Autenticação 2FA

## Status
Aprovado

## Contexto
O MangaNetWorking exige autenticação robusta com 2FA obrigatório para todos os métodos de acesso (incluindo login com Google OAuth, semelhante ao fluxo de segurança da Epic Games).
Ao mesmo tempo:
1. Em desenvolvimento local, não dispomos de servidor SMTP ou gateway de SMS ativo nem devemos depender de credenciais de terceiros.
2. Não podemos vazar códigos OTP nos logs comuns da aplicação para evitar vulnerabilidades de Log Injection ou exposição em monitoramentos.
3. Não podemos armazenar tokens de sessão/JWT em `localStorage` ou `sessionStorage`, que são vulneráveis a ataques de Cross-Site Scripting (XSS).

## Decisão
1. **Segundo Fator Obrigatório (2FA / MFA):**
   - Todo fluxo de login (e-mail/senha ou Google) é dividido em duas etapas no servidor:
     - Etapa 1: Validação de credenciais ou token OAuth. O servidor cria uma sessão temporária de pré-autenticação (`PRE_2FA`) com validade de 5 minutos e dispara o desafio OTP.
     - Etapa 2: Validação do código de 6 dígitos no servidor. Somente após essa validação o servidor emite a sessão completa autorizada.
   - O cliente JAMAIS decide ou informa se o 2FA foi validado; o estado é 100% controlado no backend.

2. **Caixa de Saída de Desenvolvimento (Dev Outbox):**
   - Criação da interface `MfaNotificationSender` com a implementação `DevOutboxNotificationSender` ativa no perfil local.
   - Os códigos OTP gerados são armazenados em um repositório isolado em memória (`DevOutboxRepository`) acessível exclusivamente por endpoint protegido para desenvolvimento (`GET /api/dev/outbox/latest?email=...`).
   - Nenhum código OTP é impresso em logs de nível INFO ou ERROR.

3. **Armazenamento e Transporte de Sessão:**
   - A sessão final do usuário utiliza Cookie de Sessão seguro com atributos:
     - `HttpOnly`: Impede acesso por scripts JavaScript no navegador (proteção anti-XSS).
     - `SameSite=Lax`: Proteção contra Cross-Site Request Forgery (CSRF).
     - `Secure`: Ativado em ambientes de produção com HTTPS.
   - Para requisições que alteram estado (`POST`, `PUT`, `DELETE`), adota-se token CSRF de validação cruzada.

## Consequências
- Os desenvolvedores conseguem testar o fluxo completo de 2FA localmente sem configurar provedores externos.
- Segurança no estado da arte sem tokens expostos em `localStorage`.

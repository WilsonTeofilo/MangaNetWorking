# ROADMAP DE FASES — MangaNetWorking

> **Documento único de execução.** Substitui as pastas `backend/tasks/`, `frontend/tasks/` e os relatórios por worker.
> Estado verificado em 19/10/2026, contra o working tree real. Onde não houve execução, está marcado **NÃO VERIFICADO**.

Legenda: ✅ pronto · 🟡 parcial · 🔴 bloqueado/pendente · ⏸️ fora do escopo atual

---

## 0. Visão em uma tela

| Fase | Entrega | Estado |
|---|---|---|
| **F0** | Infra Docker First (Postgres 16, Mongo 7, rede, volumes) | 🔴 compose inválido |
| **F1** | Auth, 2FA por e-mail, Google OAuth, sessão, rate limit | 🟡 falta SMTP e verificação do token Google |
| **F2** | Perfis de leitor e criador, avatar, biblioteca | 🟡 base pronta, faltam bordas |
| **F3** | Obras, capítulos, storage e leitor webcomic | 🟡 base pronta |
| **F4** | Monetização, split 83/17 e 58/42, ledger, PIX | 🟡 step-up sem endpoint de envio |
| **F5** | Frontend "Banca de Rua" e remoção de dados falsos | 🟡 mocks residuais |
| **F6** | LGPD e AppSec (consentimento, exclusão, maioridade, uploads) | 🟡 implementação parcial |
| **F7** | QA, smoke E2E, CI e empacotamento de produção | 🔴 não validado |
| **F8** | Prontidão de produção (observabilidade, Redis, e-mail, backup) | ⏸️ depois do MVP |

---

## F0 — Infra Docker First

**Objetivo:** um comando sobe o ambiente inteiro e o backend conecta nos dois bancos.

**Estado real**
- Docker daemon disponível (server 29.7.2).
- `docker-compose.yml:13` usa `${POSTGRES_PASSWORD:manga_dev_local_secure_2026}` — sintaxe inválida no Compose. `docker compose ps` falha com `invalid interpolation format`. **Nada sobe.**
- `docker-compose.prod.yml` e Dockerfiles existem, mas não foram exercitados.
- V5 não foi confirmada em `flyway_schema_history` real.

**Aceite**
- [ ] `${POSTGRES_PASSWORD:-...}` (ou `.env` obrigatório) no compose local.
- [ ] `docker compose up -d` com Postgres e Mongo `healthy`.
- [ ] Backend sobe aplicando V1..V5; `GET /api/feed` responde 200.
- [ ] `docker compose down` sem perda de volume.

---

## F1 — Auth, 2FA e e-mail

**Objetivo:** cadastro/login com senha e Google, 2FA obrigatório por e-mail, sessão em cookie e recuperação de senha.

**Estado real**
- Cadastro, login, `/auth/2fa/verify`, `/auth/me`, `/auth/logout` existem.
- `TwoFactorAuthService` gera OTP de 6 dígitos, TTL 5 min, 5 tentativas, uso único, em memória.
- `MfaNotificationSender` é uma porta; a **única** implementação é `DevOutboxNotificationSender`.
- Não existe `spring-boot-starter-mail`, nem `spring.mail.*`, nem adapter SMTP.
- `loginWithGoogle` **não valida `googleToken`**: confia no `email` do corpo (`AuthApplicationService.java:115-126`).
- Não existe endpoint para pedir um OTP de step-up; `updatePixKey` exige um código que o usuário não consegue solicitar sem refazer login (`CreatorApplicationService.java:143`).
- OTP é guardado em texto puro no `ConcurrentHashMap` (`TwoFactorAuthService.java:25,39`); o `purpose` não é vinculado ao código.
- `register` revela e-mail já cadastrado (`AuthApplicationService.java:49-51`) e usa `privacyPolicyVersion` hardcoded.
- Sem recuperação de senha, sem verificação de e-mail independente, sem reenvio com cooldown.

**Aceite**
- [ ] Adapter SMTP real + Mailpit no dev; `DevOutbox` só em `dev/test/local`.
- [ ] `From` com nome de exibição da marca e domínio próprio autenticado (SPF/DKIM/DMARC).
- [ ] Token Google verificado no servidor; e-mail/nome/avatar derivados das claims.
- [ ] OTP armazenado como HMAC, vinculado a `purpose` (`LOGIN`, `STEP_UP_PIX`).
- [ ] `POST /api/auth/2fa/request` (autenticado) para step-up, com cooldown e limite por conta/IP.
- [ ] Reenvio: 1 por 60 s, no máximo 3 por 10 min; respostas genéricas contra enumeração.
- [ ] Fluxo de recuperação de senha com token de uso único e expiração curta.
- [ ] Testes: OTP expirado, reuso, 6ª tentativa, purpose trocado, Google token inválido.

---

## F2 — Perfis de leitor e criador

**Objetivo:** leitor escolhe perfil público/privado; criador tem página pública com bio, redes e avatar; biblioteca de curtidas.

**Estado real**
- Entidades e endpoints de perfil/workspace existem.
- Upload de avatar usa `FileStorageService` com magic bytes.
- Exclusão LGPD anonimiza criador e arquiva obras (`archived_lgpd`).
- Bordas a rever: validação de URLs de redes sociais, moderação de bio, limite de avatar, cache público.

**Aceite**
- [ ] Perfil privado bloqueia terceiros no servidor (não só na UI).
- [ ] URLs de redes validadas por allow-list de domínio (anti-SSRF/anti-phishing).
- [ ] Avatar redimensionado/recodificado no servidor (não confiar no cliente).
- [ ] Testes de ownership e de perfil privado.

---

## F3 — Obras, capítulos e leitor

**Objetivo:** metadados no Postgres, páginas no storage, progresso no Mongo, leitor vertical.

**Estado real**
- `chapter_files` (V4) e guard de acesso existem.
- Upload com MIME + magic bytes.
- `reading_progress` tem índice composto `userId + workId` e índices auxiliares.
- Falta validação de dimensão/quantidade de páginas e teste de carga do leitor.

**Aceite**
- [ ] Capítulo publicado só aparece se `publishedAt <= now` e obra ativa.
- [ ] Páginas servidas com `Content-Type` correto e sem execução.
- [ ] Progresso idempotente por `userId + workId`.
- [ ] Leitor não toma 429 ao virar capítulo (storage fora do bucket).

---

## F4 — Monetização e financeiro

**Objetivo:** doações/membros 83/17, anúncios 58/42, VIP, ledger idempotente e PIX com step-up.

**Estado real**
- Split com `BigDecimal` e constantes de plataforma.
- Ledger e webhook sandbox existem.
- `updatePixKey` valida OTP, mas não há endpoint para emitir o OTP de step-up (ver F1).
- Sem log de auditoria imutável para troca de PIX.
- Validação de maioridade só ocorre no `claimMissionReward` e é pulada se `birthDate == null`.

**Aceite**
- [ ] PIX só altera com OTP `STEP_UP_PIX` recém-emitido e auditado.
- [ ] Maioridade 18+ obrigatória e **não opcional** para monetizar.
- [ ] Webhook idempotente por `event_id` e assinatura HMAC.
- [ ] Valores e splits com teste de arredondamento.
- [ ] Nenhum saldo fictício na UI.

---

## F5 — Frontend "Banca de Rua"

**Objetivo:** identidade visual consistente, sem dados fabricados e com estados de tela reais.

**Estado real**
- Tokens `--mn-*` aplicados nos componentes base.
- `CreatorWorkspacePage` zera saldo/doações quando não há workspace (bom), mas ainda semeia nome, bio, handle e avatar de `MOCK_CREATORS` e exibe "modo demonstração".
- `AuthContext` preserva estado de demo quando `/auth/me` retorna 401.
- `App.tsx`, `BibliotecaPage` e `HomePage` ainda caem em `MOCK_*`.
- `XpBar.tsx` órfão.

**Aceite**
- [ ] Nenhum dado financeiro/identidade mock em rota de produção.
- [ ] 401 leva a estado deslogado, não a "modo demonstração".
- [ ] Remover ou isolar mocks atrás de `import.meta.env.DEV`.
- [ ] `npm run build` verde e checklist de acessibilidade/contraste.

---

## F6 — LGPD e AppSec

**Objetivo:** consentimento, exclusão, maioridade, minimização e uploads seguros.

**Estado real**
- V5 criou `terms_accepted_at`, `privacy_policy_version`, `birth_date` e índice.
- Cadastro exige `termsAccepted`.
- Exclusão revoga sessões, apaga avatar, anonimiza usuário/criador e arquiva obras.
- Magic bytes implementados para JPEG/PNG/WebP.
- Cookie `SameSite=Lax` + `Secure` configurável; filtros sem registro duplo.
- **Gaps:** backfill de consentimento em V5 (`terms_accepted_at = created_at`) sem base legal documentada; `birth_date` opcional e idade só validada se preenchida; CPF de criador vira `000.000.000-00` quando ausente; versão da política hardcoded; OTP em texto puro.

**Aceite**
- [ ] Política de consentimento versionada e reaceite quando a versão muda.
- [ ] Backfill de V5 documentado ou substituído por reaceite.
- [ ] Maioridade bloqueia monetização com `birthDate` nulo.
- [ ] CPF ausente não é substituído por valor fake; onboarding financeiro exige dado real.
- [ ] Portabilidade (`GET /api/users/me/export`) e exclusão com auditoria.
- [ ] Checklist LGPD do `D:\Projetos\Generico\GUIA-LGPD-E-PRIVACIDADE.md` aplicado.

---

## F7 — QA, E2E e CI

**Objetivo:** provar o fluxo completo em stack real.

**Estado real**
- Suíte unitária reportada em 189 testes (não reexecutada nesta rodada).
- 8 testes de integração dependem de Docker.
- Smoke script existe, mas o compose está inválido.
- CI em `.github/` existe, não validado.

**Aceite**
- [ ] `mvn -o test` verde com contagem registrada.
- [ ] `docker compose up -d` + testes de integração verdes.
- [ ] Smoke 12/12 com evidência.
- [ ] `npm run build` verde.
- [ ] CI rodando em PR.

---

## F8 — Prontidão de produção

- [ ] Redis para sessão/rate limit (hoje in-memory; escala horizontal não suportada).
- [ ] Observabilidade (logs estruturados, métricas, alertas de 2FA/e-mail).
- [ ] Backup/restore de Postgres, Mongo e storage.
- [ ] SMTP com domínio autenticado e monitoramento de bounce.
- [ ] Encarregado/DPO, registro de operações e política de retenção.
- [ ] Runbook de incidente e rotação de chaves.

---

## Fila única (ordem de execução)

| # | Item | Fase | Escopo de código | Critério |
|---|---|---|---|---|
| 1 | Corrigir interpolação do compose | F0 | `docker-compose.yml` | `docker compose ps` funciona |
| 2 | Subir stack e confirmar V5 | F0 | — | 2 containers healthy + Flyway |
| 3 | Verificar token Google no servidor | F1 | `AuthApplicationService`, `GoogleLoginRequestDto`, config | Token inválido = 401 |
| 4 | Adapter SMTP + Mailpit | F1 | `MfaNotificationSender`, novo adapter, `application.yml`, `pom.xml` | OTP chega no Mailpit |
| 5 | Endpoint de step-up OTP | F1/F4 | `AuthController`, `AuthApplicationService`, `TwoFactorAuthService` | PIX altera com código novo |
| 6 | OTP como HMAC + purpose | F1 | `TwoFactorAuthService` | Reuso/troca de purpose falha |
| 7 | Maioridade obrigatória | F6 | `CreatorApplicationService`, `AuthApplicationService` | `birthDate` nulo bloqueia |
| 8 | CPF real no onboarding | F6 | `AuthApplicationService`, DTO | Sem CPF fake |
| 9 | Consentimento versionado | F6 | V6, `RegisterRequestDto`, `AuthApplicationService` | Reaceite ao mudar versão |
| 10 | Remover mocks de produção | F5 | `CreatorWorkspacePage`, `AuthContext`, `App.tsx`, `BibliotecaPage` | Nenhum `MOCK_*` fora de DEV |
| 11 | Testes de integração + smoke | F7 | `smoke_test_e2e.ps1`, CI | 12/12 |
| 12 | Redis para sessão/rate limit | F8 | `SessionStore`, `RateLimitStore` | Duas instâncias compartilham estado |

---

## Regra de atualização

Ao concluir um item, atualize **esta tabela** e `AUDITORIA-ATUAL.md` no mesmo commit. Não crie relatório paralelo.

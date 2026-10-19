# AUDITORIA ATUAL — MangaNetWorking

> **Data:** 19/10/2026 · **Escopo:** working tree real (backend Spring Boot, frontend React, Docker, documentação).
> **Método:** leitura do código e do diff; nenhuma alteração de código foi feita nesta auditoria.
> **O que não foi executado:** suíte Maven, build do frontend, `docker compose up` e smoke E2E. Portanto, desempenho e runtime **não estão validados aqui**.

---

## 1. Resumo por severidade

| Severidade | Quantidade | Bloqueia produção? |
|---|---:|---|
| 🔴 Crítico | 5 | Sim |
| 🟠 Alto | 7 | Sim |
| 🟡 Médio | 9 | Não, mas corrói confiança/segurança |
| 🔵 Baixo | 6 | Não |

**Veredito:** o projeto tem uma base boa (camadas, DTOs, ownership, LGPD de exclusão, magic bytes), mas **não está pronto para produção**. Os bloqueios reais são: e-mail/2FA sem entrega, login Google sem validação de token, maioridade contornável, step-up de PIX sem emissão de OTP e compose local inválido.

---

## 2. 🔴 Críticos

### C1 — `loginWithGoogle` não verifica o token do Google

**Evidência:** `GoogleLoginRequestDto.java:8` recebe `googleToken`; `AuthApplicationService.java:115-136` usa apenas `dto.email()` e nunca lê o token.

**Impacto:** qualquer pessoa pode chamar `POST /api/auth/google` com o e-mail de outra pessoa. O servidor cria conta se não existir e envia OTP para o e-mail da vítima. Com Dev Outbox exposto por engano (perfil errado) ou SMTP comprometido, vira takeover. Mesmo sem isso, permite criação de contas e spam de OTP em nome de terceiros.

**Correção esperada:** validar o ID token no servidor (`GoogleIdTokenVerifier`, audience = client ID, issuer, expiração), extrair `email`, `name`, `picture` das claims verificadas e ignorar completamente os campos de identidade do corpo. Se o token for inválido, 401.

**Fase:** F1 · **Arquivos:** `AuthApplicationService.java`, `GoogleLoginRequestDto.java`, configuração do client ID.

---

### C2 — Maioridade é contornável com `birthDate` nulo

**Evidência:** `UserEntity.java:60` e `V5__lgpd_consent_and_work_archival.sql:10` deixam `birth_date` opcional; `CreatorApplicationService.java:190-200` só valida idade se `user.getBirthDate() != null`. Se for nulo, o criador sobe para nível 2 e monetiza.

**Impacto:** violação do Art. 14 da LGPD e da regra de negócio (18+ para dinheiro real). Também permite que o cadastro omita a data e nunca seja cobrado.

**Correção esperada:** exigir `birthDate` no cadastro de criador (e no onboarding de monetização), validar `>= 18` e rejeitar nulo. Idealmente `birth_date NOT NULL` para criadores após a V6, com backfill controlado.

**Fase:** F6 · **Arquivos:** `CreatorApplicationService.java`, `AuthApplicationService.java`, `RegisterRequestDto.java`, V6.

---

### C3 — Step-up de PIX exige OTP que o usuário não consegue pedir

**Evidência:** `CreatorApplicationService.java:143` valida `dto.twoFactorCode()`; `AuthController.java` não tem endpoint para solicitar um OTP de step-up. O único OTP emitido é no login/cadastro e é consumido no `/auth/2fa/verify`.

**Impacto:** a troca de PIX é funcionalmente inutilizável (ou o usuário precisa de um código que já foi gasto). Também não há como distinguir OTP de login de OTP de step-up: um código ainda não consumido pode ser usado para a operação financeira.

**Correção esperada:** `POST /api/auth/2fa/request` autenticado, com `purpose=STEP_UP_PIX`, cooldown de 60 s e limite por conta/IP. O `TwoFactorAuthService` deve armazenar o `purpose` e rejeitar código de propósito diferente. Auditar a troca de PIX.

**Fase:** F1/F4 · **Arquivos:** `AuthController.java`, `AuthApplicationService.java`, `TwoFactorAuthService.java`.

---

### C4 — Não existe envio real de e-mail; só Dev Outbox

**Evidência:** `MfaNotificationSender.java` é uma interface; a única implementação é `DevOutboxNotificationSender.java`. Não há `spring-boot-starter-mail`, `JavaMailSender` nem `spring.mail.*` no `application.yml`/`pom.xml`.

**Impacto:** em produção o 2FA obrigatório não entrega código; o login fica impossível. Se o perfil de dev for ativado por engano, o endpoint `/api/dev/outbox/latest` entrega OTP sem autenticação.

**Correção esperada:** adapter SMTP real (`SmtpMfaNotificationSender`) com profile `!dev & !test & !local`, Mailpit no dev, `DevOutbox` restrito a dev/test/local, envio assíncrono após commit e templates sem OTP em log.

**Fase:** F1 · **Detalhamento:** `docs/orquestracao/EMAIL-E-2FA.md`.

---

### C5 — `docker-compose.yml` inválido impede subir a stack

**Evidência:** `docker-compose.yml:13` usa `${POSTGRES_PASSWORD:manga_dev_local_secure_2026}`. O Compose responde `invalid interpolation format for services.postgres.environment.POSTGRES_PASSWORD`.

**Impacto:** `docker compose up -d` falha; sem Postgres/Mongo não há testes de integração, Flyway real nem smoke E2E. O status "smoke 12/12" do `PLANO_DE_FASES.md` não é reproduzível no estado atual.

**Correção esperada:** `${POSTGRES_PASSWORD:-manga_dev_local_secure_2026}` (ou `.env` obrigatório). Depois, subir e confirmar `flyway_schema_history` com V1..V5.

**Fase:** F0 · **Arquivo:** `docker-compose.yml`.

---

## 3. 🟠 Altos

### A1 — V5 presume consentimento retroativo

**Evidência:** `V5__lgpd_consent_and_work_archival.sql:13-16` faz `terms_accepted_at = created_at` e `privacy_policy_version = 'v1.0'` para todos os usuários existentes.

**Impacto:** registrar consentimento que não foi efetivamente dado é risco jurídico (Art. 8º). O correto é reaceite ou base legal diversa documentada.

**Correção:** manter nulo para legado e forçar reaceite no próximo login, ou registrar a base legal (execução de contrato) com nota formal. Não silenciar o problema no SQL.

---

### A2 — Criador sem CPF recebe CPF fake `000.000.000-00`

**Evidência:** `AuthApplicationService.java:78` grava `"000.000.000-00"` quando `dto.cpf()` é nulo.

**Impacto:** dado fiscal falso no banco, quebra de integridade e risco de fraude/pagamento. Também mascara a ausência de um dado obrigatório para monetização.

**Correção:** não criar criador monetizável sem CPF; usar estado explícito de onboarding (`PENDING_FINANCIAL_DATA`) e validar CPF (dígitos verificadores) antes de persistir.

---

### A3 — OTP em texto puro e sem vínculo de propósito

**Evidência:** `TwoFactorAuthService.java:25` guarda `String code` no mapa; `:39` grava o código; `:50` compara com `equals`. O `purpose` só é passado ao sender, não ao cache.

**Impacto:** vazamento de heap/log expõe códigos válidos; um OTP de login pode ser usado em step-up (e vice-versa), quebrando a separação de contexto.

**Correção:** armazenar HMAC-SHA-256 do código com pepper, comparar em tempo constante (`MessageDigest.isEqual`), incluir `purpose` na chave e invalidar ao trocar de propósito.

---

### A4 — Enumeração de e-mail no cadastro

**Evidência:** `AuthApplicationService.java:49-51` retorna `"E-mail já cadastrado na plataforma"`.

**Impacto:** permite descobrir quais e-mails têm conta (privacidade e base para phishing).

**Correção:** resposta genérica ("Se os dados estiverem corretos, enviaremos um código") e fluxo de verificação por e-mail; não revelar existência.

---

### A5 — Envio de OTP dentro da transação

**Evidência:** `AuthApplicationService.java:46` (`@Transactional`) e `:86` (`generateAndSendOtp` dentro do método).

**Impacto:** se o commit falhar depois do envio, o usuário recebe um código de uma conta que não existe; se o SMTP falhar, a transação inteira reverte. E-mail não é transacional.

**Correção:** persistir a intenção e enviar via `@TransactionalEventListener(phase = AFTER_COMMIT)` ou outbox com retry.

---

### A6 — Login Google cria conta sem consentimento nem maioridade

**Evidência:** `AuthApplicationService.java:118-125` cria `UserEntity` com e-mail/nome/avatar e `twoFactorEnabled=true`, sem `termsAcceptedAt`, `privacyPolicyVersion` ou `birthDate`.

**Impacto:** contas criadas por OAuth sem base legal registrada; criadores podem monetizar sem idade.

**Correção:** tratar primeiro login Google como cadastro: exigir aceite de termos e data de nascimento em tela de complemento antes de criar a sessão definitiva.

---

### A7 — Troca de PIX sem trilha de auditoria

**Evidência:** `CreatorApplicationService.java:132-151` altera `pixKey`/`pixKeyType` e salva, sem evento de auditoria.

**Impacto:** operação financeira crítica sem rastro de quem, quando, de qual IP e de qual valor antigo/novo. Dificulta investigação de fraude e atendimento LGPD.

**Correção:** gravar evento append-only (`audit_event`) com ator, IP, user-agent, valores mascarados e resultado.

---

## 4. 🟡 Médios

| # | Achado | Evidência | Correção |
|---|---|---|---|
| M1 | Construtor de conveniência do DTO assume `termsAccepted=true` e nascimento em 2000 | `RegisterRequestDto.java:36-38` | Mover para builder de teste; produção nunca defaulta consentimento |
| M2 | Versão da política hardcoded | `AuthApplicationService.java:66` | Constante/config versionada e reaceite |
| M3 | `terms_accepted_at` nullable e sem reaceite | V5:8 | `NOT NULL` para novos + checagem de versão |
| M4 | Frontend ainda semeia identidade mock | `CreatorWorkspacePage.tsx:8,21,76` | Usar somente API; mock atrás de `import.meta.env.DEV` |
| M5 | `AuthContext` mantém demo em 401 | `AuthContext.tsx:49` | 401 = deslogado; demo só em DEV |
| M6 | `App.tsx`/`BibliotecaPage`/`HomePage` caem em mock | `App.tsx:21,47`; `BibliotecaPage.tsx:4` | Isolar mocks em DEV |
| M7 | Avatar não é recodificado no servidor | `LocalFileStorageService.java:48-83` | Decodificar com ImageIO, limitar dimensões e reencodar |
| M8 | Sessão e rate limit só em memória | `InMemorySessionStore`, `InMemoryRateLimitStore` | Redis para múltiplas instâncias |
| M9 | Sem métrica/alerta de falha 2FA e bounce de e-mail | `TwoFactorAuthService` | Contadores, alerta e bloqueio progressivo |

---

## 5. 🔵 Baixos

| # | Achado | Evidência | Correção |
|---|---|---|---|
| B1 | Comparação de OTP não é constant-time | `TwoFactorAuthService.java:67` | `MessageDigest.isEqual` |
| B2 | Multiplicação de tamanho pode estourar `long` | `LocalFileStorageService.java:39` | `Math.multiplyExact` ou config em bytes |
| B3 | Documentação com contagem divergente (189 vs 197) | `HISTORICO_TAREFAS.md:49` vs `PLANO_DE_FASES.md:5` | Fonte única: saída real do Maven |
| B4 | Referências a `docs/reviews/` deletado | `README.md:8`, `PROMPT_ANTIGRAVITY.md:7` | Apontar para `docs/orquestracao/` |
| B5 | Skill de banco cita arquivos inexistentes | `database-design/SKILL.md:20,22` | Apontar para docs atuais |
| B6 | `XpBar.tsx` órfão | `frontend/src/components/ui/XpBar.tsx` | Remover em limpeza ou reutilizar |

---

## 6. O que está sólido (não mexer sem motivo)

- **Ownership server-side:** `CreatorController.java:31,39,48,58,70` usa `SecurityContextUtils.requireCurrentCreatorId()`, não ID do cliente.
- **DTOs explícitos:** entrada por `record` com Bean Validation; sem entidade JPA como request.
- **Exclusão LGPD:** revoga sessões, apaga avatar local com guarda de URL externa, anonimiza usuário e criador, arquiva obras e limpa Mongo (`UserProfileApplicationService.java:199-253`).
- **Magic bytes:** JPEG/PNG/WebP validados em `LocalFileStorageService.java:139-175`.
- **Índices Mongo:** `ReadingProgressDocument` tem composto único `userId+workId`; `CreatorMissionDocument` e `EngagementEventDocument` têm `@Indexed`.
- **Split financeiro:** `BigDecimal` + `HALF_UP`, constantes em `application.yml`.
- **Rate limit:** buckets separados, storage/OPTIONS fora do contador, `Retry-After` real.
- **Cookie:** `SameSite=Lax` + `Secure` configurável por `platform.security.cookie-secure`.
- **Migrações:** V1..V5 presentes; nenhuma tabela de rate limit criada (rate limit segue em memória, como decidido).

---

## 7. Não verificado nesta rodada

- [ ] `mvn -o test` e a contagem real (189? 197?).
- [ ] `npm run build`.
- [ ] `docker compose up -d` (bloqueado por C5).
- [ ] Flyway aplicado no Postgres real.
- [ ] Cookie emitido pelo Tomcat e ordem real dos filtros.
- [ ] Smoke E2E 12/12.

**Regra:** enquanto esses itens não tiverem saída de terminal, não podem ser declarados concluídos em nenhum documento.

---

## 8. Ordem de correção

A fila está em `docs/orquestracao/ROADMAP-FASES.md`. Resumo:

1. C5 (compose) → 2. C4 (SMTP) → 3. C1 (Google) → 4. C3 (step-up) → 5. C2 (idade) → 6. A2 (CPF) → 7. A1/M2/M3 (consentimento) → 8. A3 (OTP HMAC) → 9. M4–M6 (mocks) → 10. F7 (provas E2E).

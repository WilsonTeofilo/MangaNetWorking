# Plano de Fases e Entregas Verticais — MangaNetWorking

> **Referência Oficial:** `README.md`, `docs/PROMPT_ANTIGRAVITY.md` e ADRs em `docs/decisions/`  
> **Última Atualização:** 16 de Outubro de 2026  
> **Status do Repositório Git:** Branch `develop` sincronizada com `origin/develop` no commit `9a33fad` (`https://github.com/WilsonTeofilo/MangaNetWorking.git`). **Há trabalho local não commitado** (Fase 7 parcial + hardening do backend nos passes 4/5/6: segurança, OSIV `false`, transação do job de feed, achados da revisão independente) — ver `docs/reviews/IMPLEMENTATION_STATUS.md`. Suíte: **111 testes verdes**; smoke E2E da API: **23/23**.
>
> **Últimos Commits Relevantes:**
> - `9a33fad`: *docs: atualizar plano de fases com conclusao das fases 0 a 6, commits e roadmap detalhado*
> - `ced5bb3`: *feat(frontend): integrate API client, VIP modal with ad suppression and report modal for anti-piracy*
> - `c4d5097`: *feat(security): implement RateLimitingFilter, SecurityContextUtils, input sanitization, security headers and PlatformProperties*
> - `e94d44a`: *feat(backend): implement Phases 3-6 (LGPD, AES-256 crypto, work publication, anti-piracy moderation, discovery algorithm, VIP & monetization splits)*
> - `649fcf8`: *docs: banimento total de loja, especificacao do VIP sem anuncios, reuso mobile e ADR-006*
>
> **Diretrizes Imutáveis de Negócio (NUNCA VIOLAR):**
> 1. **ZERO Loja Física / Zero Merchandising / Zero Impressão sob Demanda (POD) / Zero Envio:** Plataforma 100% digital editorial para quadrinistas independentes.
> 2. **Divisão Financeira Justa e Transparente:**
>    - **Doações e Assinaturas de Membros:** 83% criador / 17% plataforma.
>    - **Monetização de Anúncios no Leitor (a cada 30 páginas lidas):** 58% criador / 42% plataforma.
> 3. **Assinatura VIP da Plataforma (~R$ 23,00 / 30 dias):**
>    - Remove 100% dos anúncios em toda a plataforma.
>    - Badge VIP dourado de apoiador no perfil e comentários.
>    - Habilita suporte futuro à leitura offline protegida no app mobile.
>    - **Regra de Ouro:** O VIP da plataforma **NÃO dá acesso antecipado** aos capítulos exclusivos de membros dos criadores (o criador mantém 100% do controle do seu fã-clube e 83% da receita).
> 4. **Tolerância Zero à Pirataria e Conteúdo Pornográfico/Hentai:**
>    - Declaração mandatória de autoria original no cadastro de obras (`originalAuthorDeclaration = true`).
>    - Fila de moderação com capacidade de suspensão cautelar imediata (`POST /api/reports/moderate/suspend/{workId}`).
> 5. **Conformidade Estrita com a LGPD:**
>    - Portabilidade de dados em JSON (`/api/users/me/export` - Art. 18).
>    - Direito ao esquecimento com exclusão e anonimização de cadastro (`DELETE /api/users/me`).
>    - Criptografia em repouso AES-256-GCM para dados sensíveis (CPF e chave PIX).
> 6. **Gamificação por Seasons de 60 Dias:** 4 níveis de criador, missões semanais e bônus algorítmico de visibilidade de 1.5x a 2.2x no feed por 24h a 72h.

---

## Legenda de Status
- `[ ]` **Não Iniciado:** Requisitos mapeados, aguardando início.
- `[~]` **Em Andamento:** Esqueleto implementado; em refinamento de integração.
- `[x]` **Concluído e Verificado:** Implementado no código, com critérios de aceite validados e testes automatizados 100% aprovados.

---

## FASE 0: Diagnóstico e Decisões de Arquitetura (ADRs)
**Objetivo:** Mapear o scaffold existente, registrar decisões arquiteturais duradouras e isolar fronteiras de tecnologia.

- [x] **0.1. Diagnóstico do Repositório:** Inventário de entidades JPA, coleções Mongo, componentes React e scripts de build (`mvn test` e `npm run build`).
- [x] **0.2. ADR-001 (Separação de Dados):** PostgreSQL 16 (port 25432) para transações ACID/relacionais; MongoDB 7 (port 27017) para telemetria de leitura e cache do algoritmo de feed; Filesystem local sanitizado (`./data/uploads/`) para binários de imagem.
- [x] **0.3. ADR-002 (Sessão Segura e Dev Outbox):** Sessão `HttpOnly` com proteção CSRF e caixa de saída local (`DevOutbox`) para visualização segura de códigos OTP 2FA em desenvolvimento (`/api/dev/outbox/latest`).
- [x] **0.4. ADR-003 (Adaptador de Pagamento Sandbox e Ledger Idempotente):** Isolamento de gateways externos com ledger append-only e controle estrito de idempotência por `paymentExternalId`.
- [x] **0.5. ADR-004 (Anti-Pirataria, LGPD e Gamificação de Seasons):** Termos editoriais, portabilidade/anonimização LGPD e temporadas de 60 dias para quadrinistas.
- [x] **0.6. ADR-005 (Segurança Intermediária e Anti-Spoofing):** Rate limiting em memória por IP, sanitização anti-XSS, extração autoritativa de identidade via `SecurityContextHolder` e eliminação de hardcoding via `PlatformProperties`.
- [x] **0.7. ADR-006 (Banimento Total de Loja e Especificação do VIP Digital):** Erradicação definitiva de qualquer menção a loja física, estoque ou merchandising, e formalização do VIP (~R$ 23/30 dias) focado em zero anúncios e app offline.

**Critério de Conclusão da Fase 0:** Documentos de ADR aprovados e commitados em `docs/decisions/`. (CONCLUÍDO)

---

## FASE 1: Fundação Local e Camadas Limpas (Backend)
**Objetivo:** Garantir execução local segura e desacoplamento formal de camadas (Clean Architecture / DDD Lite).

- [x] **1.1. Orquestração Local:** `docker-compose.yml` com PostgreSQL 16 (porta 25432) e MongoDB 7 (porta 27017) isolados de colisões de porta com outros projetos locais.
- [x] **1.2. Migrações de Banco Versionadas com Flyway:**
  - `V1__init_schema.sql`: Tabelas `users`, `creators`, `works`, `chapters`, `memberships`, `donations`, `ad_revenue_ledger`, `financial_ledger`.
  - `V2__add_vip_and_reports.sql`: Colunas de VIP (`is_vip`, `vip_expires_at`), tabela `reports` de moderação e ampliação do `financial_ledger` para taxas da plataforma.
  - `V3__add_moderator_flag.sql`: Coluna `is_moderator` em `users` (com índice parcial) para credenciar o backoffice de moderação. Papel nunca concedido pelo cliente — apenas via banco/processo interno.
- [x] **1.3. Abstração de Armazenamento Local Seguro (`FileStorageService`):**
  - Implementado `LocalFileStorageService` no filesystem local com validação de magic bytes, sanitização contra path traversal e allow-list de MIME types (JPEG, PNG, WebP).
  - Bloqueio estrito de armazenamento binário dentro de tabelas relacionais ou documentos Mongo.
- [x] **1.4. Refatoração em Camadas Limpas (Application Services):**
  - Controllers desacoplados: Validação estrita de DTOs e delegação de casos de uso para `AuthApplicationService`, `UserProfileApplicationService`, `WorkApplicationService`, `MonetizationService`, `ModerationApplicationService`.
  - Tratamento global de exceções padronizado com `@RestControllerAdvice` e DTOs Java Records.

**Critério de Conclusão da Fase 1:** Build do Maven passando limpo e testes unitários das camadas de infraestrutura aprovados. (CONCLUÍDO)

---

## FASE 2: Identidade, Sessão Segura e 2FA Obrigatório
**Objetivo:** Implementar o fluxo de autenticação e segurança defensiva no backend com 2FA obrigatório (inclusive para login social).

- [x] **2.1. Cadastro e Modelagem de Usuário:** Leitor ou Criador com hash `BCryptPasswordEncoder(12)`.
- [x] **2.2. Login com 2FA Obrigatório Estilo Epic Games:**
  - Desafio OTP de 6 dígitos no servidor com proteção anti-força bruta (bloqueio na 5ª tentativa falha).
  - Dev Outbox (`/api/dev/outbox/latest?email=...`) para testes locais sem expor segredos nos logs.
- [x] **2.3. Gestão de Sessão Segura:**
  - Emissão de cookie `HttpOnly`, `SameSite=Lax`, `Path=/` via `SessionService`.
  - Spring Security stateless com `SessionAuthenticationFilter` e endpoints `/api/auth/me` e `/api/auth/logout`.
- [x] **2.4. Hardening de Segurança Intermediária:**
  - `SecurityContextUtils`: Resolução de identidade autenticada direto do contexto da sessão, impedindo IDOR e falsificação de headers (`X-Current-User-Id` / `X-Creator-Id`).
  - `RateLimitingFilter`: Throttling por IP em memória (15 req/min em `/api/auth/**` e `/api/reports`; 120 req/min global) respondendo HTTP 429 Too Many Requests.
  - Headers HTTP defensivos: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `X-XSS-Protection`, `Referrer-Policy: strict-origin-when-cross-origin`.
  - `SanitizationUtils`: Higienização de strings contra Stored XSS em títulos, sinopses, bios e relatórios.
  - `PlatformProperties`: Centralização anti-hardcoded de taxas (17%, 58%, 83%), limites de rate limit, preços VIP e segredos.

**Critério de Conclusão da Fase 2:** Suíte de segurança aprovada cobrindo bypass de 2FA, força bruta, rate limit e IDOR. (CONCLUÍDO)

---

## FASE 3: Perfis, Visibilidade Autoritativa, Biblioteca e LGPD
**Objetivo:** Implementar perfis, controle de privacidade de dados, biblioteca e conformidade com a LGPD.

- [x] **3.1. Direitos do Titular da LGPD:**
  - Exportação de dados do titular em JSON (`/api/users/me/export` - Art. 18 de portabilidade).
  - Exclusão e anonimização de cadastro (`DELETE /api/users/me` - direito ao esquecimento).
- [x] **3.2. Criptografia em Repouso de Dados Sensíveis:**
  - CPF (`documentCpf`) e chave PIX (`pixKey`) criptografados com AES-256-GCM via `AesCryptoConverter`.
  - Omissão absoluta de dados sensíveis em qualquer DTO ou resposta pública da API.
- [x] **3.3. Biblioteca do Usuário e Marcador de Leitura:**
  - Curtir/descurtir obras adicionando à biblioteca (`/api/users/library/{workId}/toggle`).
  - Gravação rápida do progresso de leitura em tempo real no MongoDB (`reading_progress`).

**Critério de Conclusão da Fase 3:** Testes automatizados validando que perfil privado não vaza dados, que CPF/PIX são criptografados no banco e que a exclusão LGPD anonimiza registros. (CONCLUÍDO)

---

## FASE 4: Publicação, Leitor, Early Access e Moderação Anti-Pirataria
**Objetivo:** Permitir publicação de capítulos originais, leitura contínua, bloqueio de early access e combate ativo à pirataria e pornografia.

- [x] **4.1. Publicação de Obras e Capítulos Originais:**
  - Criador cadastra obra (`POST /api/works`) com declaração obrigatória de autoria original (`originalAuthorDeclaration = true`).
  - Upload e publicação de capítulos (`POST /api/works/{workId}/chapters`) com liberação pública agendada (`publicReleaseAt`).
- [x] **4.2. Módulo de Denúncias e Moderação Anti-Pirataria/Anti-Hentai:**
  - Endpoint de denúncia (`POST /api/reports`) com motivos: Violação de Direitos Autorais (`COPYRIGHT_PIRACY`), Conteúdo Pornográfico/Hentai (`PORNOGRAPHY_HENTAI`), Plágio e Abuso.
  - Suspensão cautelar imediata de obras investigadas (`POST /api/reports/moderate/suspend/{workId}`).
- [x] **4.3. Leitor de Mangá (Webtoon / Scroll):**
  - Páginas servidas pelo backend com validação de magic bytes e mime types seguros.
- [x] **4.4. Bloqueio Autoritativo de Early Access no Servidor:**
  - Leitura do capítulo (`GET /api/works/{slug}/chapters/{n}`) retorna 403 a não-membro antes de `publicReleaseAt`; coberto por teste.
  - **Imagens também protegidas:** `ChapterFileAccessGuard` resolve a página → capítulo (`ChapterRepository.findFirstByPagesJsonContaining`) e aplica o controle no `GET /api/storage/{filename}`: capa/banner/avatar (sem capítulo) continuam públicos; página de capítulo em early access exige assinatura ativa do autor; obra suspensa fica restrita ao autor e à moderação. Coberto por `ChapterFileAccessGuardTest` (9 casos) e `FileStorageControllerTest` (403).
  - **Ressalva de desempenho:** a checagem faz uma consulta `LIKE` por imagem servida; para catálogos grandes, avaliar índice/coluna dedicada (file → capítulo) ou cache.

**Critério de Conclusão da Fase 4:** Testes validando 403 na leitura do capítulo em early access, obrigatoriedade de autoria original e suspensão cautelar. **(CONCLUÍDO)** — o bloqueio cobre o JSON do capítulo e a URL binária da página.

---

## FASE 5: Descoberta, Algoritmo e Gamificação por Seasons
**Objetivo:** Implementar o algoritmo de recomendação e o sistema de missões dinâmicas e Seasons para quadrinistas.

- [x] **5.1. Algoritmo de Ranking no Servidor (`RecommendationAlgorithmService`):**
  - Fórmula: $Score = (BaseOrgânica + Recência) \times Decaimento \times Qualidade \times BoostMissão$.
  - Bônus de recência para novos lançamentos (< 72h: +220 pts).
- [x] **5.2. Cache e Sincronização do Feed no MongoDB:**
  - Sincronização em `feed_works` no MongoDB para respostas ultra-rápidas (< 15ms).
  - Endpoints de feed: `/api/feed?sort=recommended`, `/api/feed/trending`, `/api/feed/fresh` com filtros por gênero.
  - **Transação do job agendado (passe 5):** `scheduleFeedRecalculation()` ganhou `@Transactional(readOnly = true)`.
    Sem ela, o caminho `@Scheduled` (sem OSIV e com self-invocation) acessava `work.getAuthor()` sobre entidades
    desanexadas e lançava `LazyInitializationException` para toda obra, engolida pelo `try/catch` interno — o recálculo
    periódico era inócuo. A sincronização de obra/capítulo com o Mongo segue adiada para `afterCommit` (passe 4).
- [x] **5.3. Sistema de Seasons e Missões para Criadores:**
  - Temporadas de 60 dias integradas com 4 níveis de criador.
  - Resgate autoritativo de missões cumpridas (`POST /api/creators/workspace/missions/{missionId}/claim`) aplicando boost de 1.5x a 2.2x no feed por 24h a 72h.
  - Identidade do resgate vem **somente da sessão** (`SecurityContextUtils.requireCurrentCreatorId()` + `hasRole('CREATOR')`); o fallback `X-Creator-Id` foi removido.
  - Cobertura: `CreatorApplicationServiceTest` (missão inexistente, ownership, já resgatada, incompleta, boost aplicado + avanço de nível) e `RecommendationAlgorithmServiceTest` (boost de Season multiplica o `discoveryScore` e é limitado ao teto de 2.5x).

**Critério de Conclusão da Fase 5:** Testes do algoritmo validando decaimento temporal, bônus de recência e boosts da Season. **(CONCLUÍDO)** — decaimento, recência, qualidade e boost da Season cobertos (`RecommendationAlgorithmServiceTest`); resgate da missão coberto (`CreatorApplicationServiceTest`).

---

## FASE 6: Monetização Digital Justa (Sem Loja Física) e Integração Frontend
**Objetivo:** Implementar a divisão financeira digital, simulação de anúncios, assinatura VIP global e integrar todos os serviços no Frontend.

- [x] **6.1. Doações e Clube de Membros (`Membership` do Criador):**
  - Doações avulsas com split: 83% autor / 17% plataforma (`POST /api/monetization/donate`).
  - Assinaturas de membros: Faixas de R$ 7,99 a R$ 45,99 definidas pelo autor com split 83%/17% (`POST /api/monetization/membership/subscribe`).
- [x] **6.2. Anúncios no Leitor:**
  - Gatilho a cada 30 páginas lidas com split de 58% autor / 42% plataforma, gravando em `ad_revenue_ledger`.
  - Supressão total de anúncios para assinantes VIP da plataforma.
- [x] **6.3. Ledger Financeiro Append-Only e Idempotência:**
  - Registro imutável de transações com controle estrito por `paymentExternalId`, prevenindo double-spending.
- [x] **6.4. Assinatura VIP / Premium da Plataforma (~R$ 23,00 / 30 dias):**
  - Ativação via `POST /api/monetization/vip/subscribe`.
  - Remoção de 100% dos anúncios em toda a plataforma.
  - Badge VIP cosmético de apoiador da plataforma.
  - **Zero Loja:** Sem venda de produtos físicos, sem estoque e sem descontos de loja.
  - **Proteção ao Criador:** O VIP da plataforma **NÃO dá acesso antecipado** aos capítulos exclusivos de membros de autores.
- [x] **6.5. Integração dos Módulos no Frontend React 19:**
  - Camada de API tipada em `frontend/src/api/` (`client.ts`, `monetizationApi.ts`, `reportApi.ts`, `authApi.ts`, `workApi.ts`).
  - Componente e fluxo do `VipModal.tsx` integrado no Header e no Perfil do leitor.
  - Componente e fluxo do `ReportModal.tsx` integrado na página da obra e no leitor de mangá.
  - Leitor (`ReaderPage.tsx`) com telemetria contínua no MongoDB e supressão de anúncios para usuários VIP.
  - Perfil do leitor (`ReaderProfilePage.tsx`) com exportação JSON (Art. 18 LGPD) e exclusão/anonimização de conta.

**Critério de Conclusão da Fase 6:** Ledger validado, split exato de 17%/83% e 42%/58%, modais VIP e Denúncia operacionais e build do frontend (`npm run build`) passando limpo. (CONCLUÍDO)

---

## FASE 7: Upload Real de Arquivos e Backoffice de Moderação (CONCLUÍDA)
**Objetivo:** Permitir cadastro de obras reais com upload de imagens (capas, banners e páginas) no frontend e fornecer painel editorial de moderação cautelar.

- [x] **7.1. Upload Real de Obras no Workspace do Criador:**
  - Formulário com upload de arquivos de imagem locais: Capa vertical 2:3, Banner horizontal 16:9.
  - Upload via `multipart/form-data` → `FileStorageController` com `StoredFileResponseDto`, rejeição de vazio e limites (300 arquivos/lote; 15MB/arquivo; 200MB/requisição). `FileStorageControllerTest` cobre entrega/404/403 e `FileStorageUploadTest` cobre o fluxo ponta a ponta (multipart real → disco → entrega, lote e guard 403); o smoke E2E confirmou 3 uploads reais.
- [x] **7.2. Upload em Lote de Páginas do Capítulo:**
  - Seletor de arquivos múltiplos; arquivos associados aos capítulos via `createChapter`.
  - `ReaderPage` passa a consumir `workApi.readChapter(slug, n)` (rota real `GET /api/works/{slug}/chapters/{n}`) e renderiza `pagesJson`; HTTP 403 exibe o aviso de acesso antecipado. `WorkDetailPage` e `App` passam a resolver capítulos/obra pela API.
  - **Fallback:** quando a obra não existe no banco (dados de demonstração), cai nos `MOCK_*` para não quebrar a navegação.
- [x] **7.3. Painel Administrativo de Moderação Cautelar (Backoffice Editorial):**
  - `ModerationBackofficePage.tsx` gated por `user.isModerator`; `isModerator` exposto em `/auth/2fa/verify` e `/auth/me`.
  - Botão autoritativo "Suspender Obra Imediatamente" (`POST /api/reports/moderate/suspend/{workId}`).
  - **Cobertura (passe 3):** `BackofficeAuthorizationTest` valida a matriz no servidor — anônimo → **401**, leitor → **403**, moderador → **200** — em `GET /api/reports/pending` e `POST /api/reports/moderate/suspend/{workId}`, via infra de slice `@WebMvcTest` + `spring-security-test` (sem exigir DB).

**Critério de Conclusão da Fase 7:** Quadrinista faz upload de imagens reais, capítulo é lido no leitor com as páginas enviadas e denúncia aciona suspensão visível no catálogo. **Atingido no código, na cobertura de teste e no smoke real:** leitor consome as páginas reais da API (com fallback mock), o backoffice/upload existem, a sessão real (cadastro/login 2FA → `/auth/me` → `isModerator`) dirige a UI, o upload multipart é testado ponta a ponta (`FileStorageUploadTest`) e a autorização do backoffice tem cobertura (`BackofficeAuthorizationTest`). **Smoke E2E com stack real executado:** 23/23 via API (Postgres+Mongo+backend `dev`) e validado na UI (feed/detalhe/leitor).

---

## FASE 8: Roadmap do App Mobile & Leitura Offline Segura (PARCIAL)
**Objetivo:** Desenvolver o aplicativo móvel reutilizando 100% do backend atual (API REST stateless em Spring Boot + PostgreSQL + MongoDB), com sandbox local para leitura offline de assinantes VIP.

- [x] **8.1. Reutilização de API (Zero retrabalho de backend):**
  - O mesmo backend e banco atendem Web e Mobile. Backend de manifesto de leitura offline existe (`MobileOfflineController` + `MobileOfflineApplicationService` + testes), com identidade resolvida **somente pela sessão** (VIP + membro do autor).
  - Contrato alinhado: a autenticação é por **cookie de sessão HttpOnly** (ADR-002), não por "tokens JWT/Bearer" como este item sugeria. O Bearer/`localStorage` foi removido de `client.ts`/`storageApi`; todas as chamadas usam `credentials: 'include'`.
- [ ] **8.2. Leitura Offline Segura no App (Exclusivo VIP):**
  - Apenas o manifesto/contrato existe; `encryptionKeyId` é um UUID sem gestão de chave real. Implementação do app nativo (Android/iOS) **não iniciada** — fora do escopo deste repositório (apenas o backend é atendido aqui).
  - Bloqueio de capturas de tela e gravação com `FLAG_SECURE` nativo no Android e visualização protegida no iOS para prevenir vazamento e pirataria.
  - O usuário só pode baixar offline os capítulos que já tem permissão de leitura (capítulos públicos ou de criadores dos quais é membro).

---

## FASE 9: Homologação Final, Smoke Test E2E e Merge para a Main
**Objetivo:** Executar validação de ponta a ponta com Docker Compose ativo e realizar a mesclagem oficial da branch `develop` para a `main`.

- [x] **9.1. Teste de Fumaça de Ponta a Ponta (E2E Smoke Test):**
  - ✅ **Backend/API:** PostgreSQL (25432) + MongoDB (27017) + Backend (8085) ativos (profile `dev`); jornada completa via HTTP **23/23** — cadastro 2FA → upload multipart real → obra/capítulos → leitura + guard de early access/cache → `reading-progress` → doação/VIP → extrato → denúncia → feed Mongo (`afterCommit`). Evidências em `docs/reviews/IMPLEMENTATION_STATUS.md` (passe 6).
  - ✅ **Frontend (5180):** feed/detalhe/leitor consumindo a API real (feed do Mongo, gêneros/early-access/membro), guard + `Cache-Control` corretos e imagem decodificada. Via proxy same-origin (cookie `SameSite=Lax`).
  - ✅ **Concluído:** merge oficial via **PR #2** (mesclado na `main`) e tag de release publicada (ver 9.2).
- [x] **9.2. Pull Request e Merge Oficial Develop ➔ Main:**
  - ✅ **PR #2** (`develop` ➔ `main`) mesclado; `main` @ `e7aefec`, com árvore idêntica a `develop` (`git diff` vazio).
  - ✅ Tag **`v1.0.0-release`** publicada em `origin` (aponta para `e7aefec`).

---

## Resumo Técnico de Execução

| Camada | Tecnologia | Porta Local | Estado |
|---|---|---|---|
| **Backend API** | Spring Boot 3.4.2 / Java 26.0.1 | `8085` | 132 testes passando (0 falhas; inclui 6 de integração Testcontainers); OSIV desligado; **smoke E2E 23/23** (Postgres+Mongo) |
| **Banco Relacional** | PostgreSQL 16 (Docker) | `25432` | Flyway V1 + V2 + V3 aplicadas |
| **Banco NoSQL / Feed** | MongoDB 7 (Docker) | `27017` | Coleções `reading_progress` e `feed_works` ativas |
| **Storage de Imagens** | Local Filesystem Sanitizado | `./data/uploads/` | Magic bytes allow-list; **páginas de capítulo protegidas por `ChapterFileAccessGuard`** (capa/avatar públicos) |
| **Frontend Web** | React 19 / TypeScript / Vite | `5180` | Build aprovado; **leitor consome a API real** (`readChapter`) com fallback mock; descoberta/catálogo usam o feed real com fallback mock |
| **Git Repositório** | GitHub (`WilsonTeofilo/MangaNetWorking.git`) | Remoto | `develop` @ `a12e52e` (passes 10/11 publicados); `main` @ `e7aefec` (PR #2) com tag **`v1.0.0-release`**; `main` 5 commits atrás de `develop` |

---

## Pendências Conhecidas (priorizadas)

> Estado detalhado e evidências em `docs/reviews/IMPLEMENTATION_STATUS.md`.

**P0 — Segurança (RESOLVIDO neste passe):**
- ✅ `GET /api/creators/workspace` movido para `hasRole('CREATOR')` (antes do `permitAll` de `GET /api/creators/**`); identidade por sessão.
- ✅ Writes do `CreatorController` (`PUT /profile`, `PUT /membership-price`, `POST .../missions/claim`) migrados para `requireCurrentCreatorId()` + `hasRole('CREATOR')`.
- ✅ `GET /api/storage/**`: páginas de capítulo protegidas por `ChapterFileAccessGuard` (early access exige assinatura; obra suspensa restrita ao autor/moderação).
- ✅ Bearer/`localStorage` removido de `client.ts`/`storageApi`; sessão por cookie + `credentials: 'include'`.
- ⚠️ CSRF: mantido desabilitado, **decisão documentada** — o cookie é `SameSite=Lax`, as escritas são `POST/PUT/DELETE` e a API é consumida same-site via proxy; um token CSRF só se justifica se o frontend passar a ser servido de origem distinta (ver `SECURITY_REQUIREMENTS`).

**P1 — Fechar Fase 7 (E2E):** ✅ `ReaderPage`/`WorkDetailPage`/`App` consomem a API real (`getWorkBySlug`, `readChapter`); home/catálogo usam o feed real (`useCatalogWorks`) com fallback mock.

**P2 — Testes/lacunas:** ✅ `CreatorApplicationServiceTest` (claimMissionReward) e boost de Season no `RecommendationAlgorithmServiceTest`. ✅ (passe 3) Infra de slice `@WebMvcTest` + `spring-security-test` introduzida: `BackofficeAuthorizationTest` (401/403/200), `FileStorageUploadTest` (upload multipart real → disco → entrega, lote, 404, guard 403) e `UserProfileIdentityTest` (anti-IDOR).

**P2b — Contratos frontend ↔ backend (RESOLVIDO neste passe):** ✅ `authApi` (login/2FA/register) alinhado aos DTOs; `AuthContext` hidrata `/auth/me` + logout; `LoginPage` usa o fluxo 2FA real com fallback de demonstração; `Header` com ação de sair. ✅ Identidade de doação/assinatura resolvida pela sessão (`requireCurrentUserId`, novo + testado), sem `donorUserId`/`subscriberUserId` no corpo. ✅ Endpoint fantasma de anúncio removido (`recordAdImpression`); `getCreatorLedger` aponta para `/monetization/ledger/{id}`. ✅ `AuthorSummaryDto` (`authorId/authorName/authorHandle/authorAvatarUrl`) e gêneros (enum → rótulo) corrigidos no frontend. ✅ (passe 3) Tela de **cadastro real** no `LoginPage` (ENTRAR/CRIAR CONTA → `authApi.register` → 2FA) e `CreatorWorkspacePage` ligado a `GET /api/creators/workspace` via novo `creatorApi` (saldo, doações, nível, membros, boost e missões do servidor; demo apenas como fallback). ✅ Identidade de perfil só pela sessão (`UserProfileController` sem `X-Current-User-Id`) e **401 para anônimo** / 403 para papel insuficiente.

**P3 — Fases 8/9:** ⚠️ Offline real é app nativo (fora do escopo deste repositório; backend de manifesto pronto). ✅ **Fase 9 concluída:** E2E **23/23** (API) + validação na UI; merge oficial via **PR #2** e tag **`v1.0.0-release`** publicados. (Fase 8.2 nativa permanece fora do repositório.)

**P4/P5 — Hardening do backend (2026-10-16, commitado em `46edd46`):** ✅ Vazamento do extrato financeiro corrigido (`LedgerEntryResponseDto` + ownership por sessão + `@JsonIgnore` em CPF/PIX). ✅ Transação JPA×Mongo via `afterCommit`. ✅ `GlobalExceptionHandler` semântico (4xx/5xx) e `FilePolicyException`. ✅ Cache de página de capítulo `private, no-store`. ✅ Obra suspensa não exposta. ✅ CORS/rate-limit parametrizados. ✅ **OSIV desligado** (`open-in-view: false`) e job agendado de feed transacional. ✅ `mvn test` → 107 testes verdes.

**P6 — Achados da revisão independente incorporados (2026-10-16, commitado em `46edd46`):** ✅ **A1** contrato de `totalPages` (`ReaderPage`/`authApi` + 2 testes de contrato) — o tracking de leitura voltava 400 e o crédito de anúncio nunca disparava. ✅ **A2** Dev Outbox fail-closed (`@Profile({"dev","test","local"})` em vez de `!prod`; sem profile → **404** verificado em runtime; exige `SPRING_PROFILES_ACTIVE=dev` no run local — ver runbook abaixo). ✅ **B1** e-mail fora do log (LGPD). ✅ **B2** guarda de path unificada em `exists`/`deleteFile`. ✅ **B3** upload em lote fatiado no cliente (contagem + bytes). ✅ **M1** logs de `afterCommit` com causa. ✅ **M2** testes que protegem `@Transactional` do job e o adiamento para `afterCommit`. ✅ `mvn test` → **111 testes verdes**; `tsc --noEmit` + `npm run build` limpos; smoke **23/23** (API) + validação na UI (feed/detalhe/leitor).

**Runbook local (dev):**
- `SPRING_PROFILES_ACTIVE=dev` habilita `GET /api/dev/outbox/latest` (leitura do OTP 2FA sem log). Sem profile/`prod` o endpoint **não existe** (o 2FA continua válido; apenas o atalho local fica indisponível).
- `isModerator` é resolvido **no login**: promover alguém (`UPDATE users SET is_moderator = TRUE WHERE ...`) exige o usuário **relogar** (nada no servidor confia em UI/header).
- Nunca editar migração Flyway já aplicada (mudar o arquivo quebra o checksum e derruba o boot); para ajustar comentário, crie uma nova migração.

**Concluído recentemente (passes 8-11):** ✅ **Testcontainers** — integração real (PostgreSQL 16 + MongoDB 7 efêmeros): OSIV desligado, sync de feed em `afterCommit` (obra/capítulo com early access), reindexação sem `LazyInitializationException`, remoção do feed na suspensão por moderação e **não-ressurreição da obra suspensa na reindexação**; `api.version` parametrizável (`mvn -Ddocker.api.version=... test`); sem daemon Docker os testes de integração são ignorados (`disabledWithoutDocker = true` → `Skipped`). ✅ **P1 — Coerência funcional do feed (passe 10):** `syncWorkToFeed` **remove** obra suspensa do feed (antes o recálculo agendado a reinseria) e o feed público filtra `status != suspended` **na consulta do Mongo**, preservando o tamanho da página. ✅ **Robustez JPA×Mongo (passe 11):** o sync/remoção do feed saiu do `TransactionSynchronizationManager` manual para `@TransactionalEventListener(phase = AFTER_COMMIT)` (`FeedSynchronizationListener`); a sincronização abre a própria transação (`RecommendationAlgorithmService.syncWorkById`) e deixa de depender de a sessão JPA da requisição estar aberta na fase `afterCommit`. ✅ **Consistência de camadas (passe 12):** os read-models NoSQL deixaram de vazar como modelo — `FeedWorkResponseDto` (`GET /api/feed*`) e `ReadingProgressResponseDto` (histórico de leitura + exportação LGPD) espelham os nomes de campo do documento, logo o **contrato JSON do frontend não muda** (travado por testes que comparam a árvore JSON do DTO e do documento).

**Próximos passos priorizados (pós-passe 12).** Cada item é independente e verificável; nenhum bloqueia o release atual.

1. **Performance do guard (P2):** `ChapterFileAccessGuard` usa `LIKE %filename%` → relação dedicada `file → capítulo` com índice (exige nova migração Flyway + Postgres real).
2. **Escala (P3):** `RateLimitingFilter`/`SessionService` são **em memória** — store distribuído se houver múltiplas instâncias.
3. **Docker antigo (P3):** com API < 1.44 (Docker ≤ 24) a integração é ignorada em silêncio; rodar `mvn -Ddocker.api.version=<versão> test`.
4. **Frontend (P3):** substituir placeholders de XP/Season em `CreatorWorkspacePage` e alinhar `#E63946`/`text-white` à paleta `--color-red: #E8402F`.
5. **Higiene/segredos (P3):** remover/rotacionar a chave AES de fallback e a senha default do Postgres em `application.yml` (pré-existente, já público) para variáveis de ambiente.
6. **Fase 8.2 (bloqueada):** leitura offline nativa (Android/iOS) — app fora deste repositório; o backend de manifesto é o limite.
7. **Processo:** abrir PR `develop` ➔ `main` para alinhar a `main` (hoje 5 commits à frente — `017d2e0`, `80eec1c`, `37d2d75`, `15cc982`, `a12e52e`).

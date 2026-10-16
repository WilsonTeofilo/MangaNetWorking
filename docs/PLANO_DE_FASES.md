# Plano de Fases e Entregas Verticais — MangaNetWorking

> **Referência Oficial:** `README.md`, `docs/PROMPT_ANTIGRAVITY.md` e ADRs em `docs/decisions/`  
> **Última Atualização:** 16 de Outubro de 2026  
> **Status do Repositório Git:** Branch `develop` atualizada e sincronizada com `origin/develop` (`https://github.com/WilsonTeofilo/MangaNetWorking.git`)  
> **Últimos Commits Relevantes:**
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
  - Leitor não-membro recebe HTTP 403 Forbidden ao tentar acessar imagens antes da data pública (`publicReleaseAt`).

**Critério de Conclusão da Fase 4:** Testes validando 403 em early access, obrigatoriedade de autoria original e suspensão cautelar de obra denunciada. (CONCLUÍDO)

---

## FASE 5: Descoberta, Algoritmo e Gamificação por Seasons
**Objetivo:** Implementar o algoritmo de recomendação e o sistema de missões dinâmicas e Seasons para quadrinistas.

- [x] **5.1. Algoritmo de Ranking no Servidor (`RecommendationAlgorithmService`):**
  - Fórmula: $Score = (BaseOrgânica + Recência) \times Decaimento \times Qualidade \times BoostMissão$.
  - Bônus de recência para novos lançamentos (< 72h: +220 pts).
- [x] **5.2. Cache e Sincronização do Feed no MongoDB:**
  - Sincronização em `feed_works` no MongoDB para respostas ultra-rápidas (< 15ms).
  - Endpoints de feed: `/api/feed?sort=recommended`, `/api/feed/trending`, `/api/feed/fresh` com filtros por gênero.
- [x] **5.3. Sistema de Seasons e Missões para Criadores:**
  - Temporadas de 60 dias integradas com 4 níveis de criador.
  - Resgate autoritativo de missões cumpridas (`POST /api/creators/workspace/missions/{missionId}/claim`) aplicando boost de 1.5x a 2.2x no feed por 24h a 72h.

**Critério de Conclusão da Fase 5:** Testes do algoritmo validando decaimento temporal, bônus de recência e boosts da Season. (CONCLUÍDO)

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

## FASE 7: Upload Real de Arquivos e Backoffice de Moderação (PRÓXIMA PRIORIDADE)
**Objetivo:** Permitir cadastro de obras reais com upload de imagens (capas, banners e páginas) no frontend e fornecer painel editorial de moderação cautelar.

- [ ] **7.1. Upload Real de Obras no Workspace do Criador:**
  - Formulário com upload de arquivos de imagem locais: Capa vertical 2:3, Banner horizontal 16:9.
  - Validação no cliente e envio via `multipart/form-data` para o `FileStorageService` do backend.
- [ ] **7.2. Upload em Lote de Páginas do Capítulo:**
  - Seletor de arquivos múltiplos ordenados por número de página ou arquivo ZIP descompactado no servidor.
  - Gravação dos paths no PostgreSQL e exibição real no `ReaderPage`.
- [ ] **7.3. Painel Administrativo de Moderação Cautelar (Backoffice Editorial):**
  - Aba restrita para moderadores visualizarem denúncias abertas de pirataria e pornografia/hentai.
  - Botão autoritativo de 1 clique: "Suspender Obra Imediatamente" (`POST /api/reports/moderate/suspend/{workId}`) removendo-a do feed/catálogo.

**Critério de Conclusão da Fase 7:** Quadrinista faz upload de imagens reais, capítulo é lido no leitor com as páginas enviadas e denúncia aciona suspensão visível no catálogo.

---

## FASE 8: Roadmap do App Mobile & Leitura Offline Segura
**Objetivo:** Desenvolver o aplicativo móvel reutilizando 100% do backend atual (API REST stateless em Spring Boot + PostgreSQL + MongoDB), com sandbox local para leitura offline de assinantes VIP.

- [ ] **8.1. Reutilização de API (Zero retrabalho de backend):**
  - O mesmo backend e banco atendem Web e Mobile via JSON e tokens JWT/Bearer.
- [ ] **8.2. Leitura Offline Segura no App (Exclusivo VIP):**
  - Armazenamento encapsulado e criptografado na sandbox do aplicativo (sem acesso por USB ou exportação para PC).
  - Bloqueio de capturas de tela e gravação com `FLAG_SECURE` nativo no Android e visualização protegida no iOS para prevenir vazamento e pirataria.
  - O usuário só pode baixar offline os capítulos que já tem permissão de leitura (capítulos públicos ou de criadores dos quais é membro).

---

## FASE 9: Homologação Final, Smoke Test E2E e Merge para a Main
**Objetivo:** Executar validação de ponta a ponta com Docker Compose ativo e realizar a mesclagem oficial da branch `develop` para a `main`.

- [ ] **9.1. Teste de Fumaça de Ponta a Ponta (E2E Smoke Test):**
  - Subir PostgreSQL (25432) + MongoDB (27017) + Backend (8085) + Frontend (5180).
  - Realizar jornada completa: cadastro com 2FA -> publicação de obra -> leitura -> doação/assinatura VIP -> denúncia.
- [ ] **9.2. Pull Request e Merge Oficial Develop ➔ Main:**
  - Mesclagem limpa para `main` com tag `v1.0.0-release`.

---

## Resumo Técnico de Execução

| Camada | Tecnologia | Porta Local | Estado |
|---|---|---|---|
| **Backend API** | Spring Boot 3.4.2 / Java 26.0.1 | `8085` | 40 testes passando (0 falhas) |
| **Banco Relacional** | PostgreSQL 16 (Docker) | `25432` | Flyway V1 + V2 aplicadas |
| **Banco NoSQL / Feed** | MongoDB 7 (Docker) | `27017` | Coleções `reading_progress` e `feed_works` ativas |
| **Storage de Imagens** | Local Filesystem Sanitizado | `./data/uploads/` | Magic bytes allow-list |
| **Frontend Web** | React 19 / TypeScript / Vite | `5180` | Build de produção 100% aprovado |
| **Git Repositório** | GitHub (`WilsonTeofilo/MangaNetWorking.git`) | Remoto | Branch de trabalho: `develop` |

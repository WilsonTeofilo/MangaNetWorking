# Plano de Fases, Regras de Negócio & Estado de Implementação — MangaNetWorking

> **DOCUMENTO MESTRE DE PRODUTO & REGRAS DE NEGÓCIO**
>
> **Última Atualização:** 19 de Outubro de 2026
>
> **Escopo deste arquivo:** regras de produto, plano atual F0–F8 e histórico de decisões/fases antigas. A seção 4 resume o estado atual das fases; a fila detalhada e evidências de execução ficam sincronizadas em `docs/orquestracao/ROADMAP-FASES.md`. Fases legadas posteriores estão preservadas como histórico, não como status corrente. Achados abertos ficam em `docs/orquestracao/AUDITORIA-ATUAL.md` e o progresso anterior permanece em `docs/orquestracao/HISTORICO_TAREFAS.md`.
>
> ⚠️ **Fonte de estado:** a seção 4 é o mapa de produto F0–F8; para logs, comandos, resultados de teste e ordem exata da fila, consulte o roadmap/auditoria. O histórico abaixo não deve ser interpretado como status atual.
>
> **Migrações Flyway:** V1..V11 verificadas em Postgres local e em schema limpo via Testcontainers em 19/10/2026; versões aplicadas são imutáveis.
>
> **Ambiente e saúde da stack:** ver `ROADMAP-FASES.md`; não inferir que serviços estão rodando só porque o Compose existe.

---

## 1. Visão Geral do Produto e Arquitetura

O **MangaNetWorking** é uma plataforma editorial **100% digital** para conectar criadores independentes e leitores. A plataforma suporta mangás em páginas de imagem e light novels em capítulos de prosa, com leitura adequada a cada formato. A receita prevista vem de doações, membros e anúncios — sem venda de obras ou produtos físicos e sem logística.

### 1.1. Arquitetura de Software (Clean Architecture / DDD Lite)
- **Backend API:** Java 21, Spring Boot 3.4.x, Spring Security stateless com sessão via cookie seguro, Flyway para migrações relacionais.
- **Banco Relacional (PostgreSQL 16 - porta 25432):** Fonte da verdade para identidade, credenciais criptografadas, catálogo de obras e capítulos, controle de acesso e permissões, transações financeiras e ledger idempotente.
- **Banco Documental NoSQL (MongoDB 7 - porta 27017):** Telemetria e progresso de leitura em tempo real (`reading_progress`), cache materializado do feed de recomendações (`feed_works`) sincronizado via `@TransactionalEventListener(AFTER_COMMIT)`.
- **Armazenamento de Arquivos (`FileStorageService`):** Filesystem local sanitizado (`./data/uploads/`) para desenvolvimento. Binários nunca vão para o banco; o banco guarda apenas referências normalizadas. Páginas de capítulos são blindadas pelo `ChapterFileAccessGuard` por índice único indexado (`chapter_files.filename`).
- **Frontend Web:** React 19, TypeScript, Vite, Tailwind CSS v4, baseado no Design System autoral "Banca de Rua".

---

## 2. Diretrizes e Regras de Negócio Inegociáveis

> [!IMPORTANT]
> Estas regras são **LEI NO PROJETO**. Devem ser validadas autoritativamente no servidor (backend) e nunca delegadas à confiança da interface.

1. **ZERO Loja / ZERO Venda de Obras ou Produtos / ZERO Logística:**
   - Não há venda individual de mangás/capítulos, roupas, posters ou brindes; sem vitrine, carrinho, merchandising, impressão sob demanda, estoque, frete, correios ou despacho. A monetização permitida é por doações, membros e anúncios digitais.
2. **Divisão Financeira Justa (Splits):**
   - **Doações Diretas e Assinaturas de Membros do Autor:** **83% para o criador / 17% para a plataforma**.
   - **Bônus de Nível 4 do Criador:** A taxa da plataforma pode cair para 10% (90% para o criador) durante a janela de elegibilidade de 15 dias, controlada pelo servidor.
   - **Monetização de Anúncios no Leitor (a cada 30 páginas lidas):** **58% para o criador monetizado / 42% para a plataforma**.
   - Todo cálculo monetário utiliza `BigDecimal` com escala de 2 casas decimais e arredondamento `RoundingMode.HALF_UP` (ou `HALF_EVEN`).
3. **Assinatura VIP da Plataforma (~R$ 23,00 / 30 dias):**
   - Suprime 100% dos anúncios no leitor para o usuário.
   - Concede distintivo visual dourado no perfil e comentários.
   - Habilita o manifesto de leitura offline no futuro app móvel e PWA.
   - **Regra de Ouro:** O VIP da plataforma **NÃO dá acesso antecipado** aos capítulos exclusivos de membros do criador. O criador mantém 100% da autonomia do seu fã-clube.
4. **Requisitos de Monetização do Criador (Nível 2 + 18 anos + CPF/PIX):**
   - Apenas criadores no Nível 2 ou superior podem monetizar.
   - Exige cadastro de chave PIX e CPF válidos (criptografados em repouso com AES-256-GCM).
   - **Validação de Maioridade (LGPD Art. 14):** É obrigatório ter 18 anos completos para ativar a monetização. Menores de idade não podem receber repasses financeiros diretamente.
5. **Tolerância Zero à Pirataria e Conteúdo Adulto Explícito:**
   - Exigência mandatória de autoria original no cadastro de obras (`originalAuthorDeclaration = true`).
   - Fila de moderação com suspensão cautelar imediata (`POST /api/reports/moderate/suspend/{workId}`).
   - Proibição absoluta de scans, raws, traduções de terceiros ou pornografia/hentai explícito.
6. **Gamificação por Seasons de 60 Dias:**
   - 4 níveis de criador, missões com recompensas semanais e bônus temporário de visibilidade de 1.5x a 2.2x no feed por 24h a 72h.
7. **Senhas novas não podem ser fracas:**
   - Cadastro e redefinição aceitam 8–64 pontos de código Unicode, sem restringir espaços, acentos, símbolos ou emojis por tipo de caractere.
   - A interface explica força fraca/média/forte, mostra requisitos que faltam e permite revelar/ocultar senha por botão acessível.
   - Apenas senhas médias ou fortes são aceitas no servidor para cadastro e reset; senhas fracas comuns, sequenciais ou repetitivas são recusadas. O login não aplica o medidor para manter acesso a credenciais legadas válidas.
   - Classificação é heurística de produto, não consulta a uma base completa de senhas vazadas; usuário deve evitar reutilização e usar gerenciador.

---

## 3. Requisitos de Segurança & Conformidade LGPD

### 3.1. Autenticação, Sessão e Step-Up 2FA
- **Sessão por Cookie HttpOnly:** Cookie de sessão emitido com flags `HttpOnly`, `SameSite=Lax`, `Path=/` e `Secure` (ativado em produção). Bearer tokens e JWT em `localStorage` são expressamente proibidos (mitigação de XSS).
- **2FA Mandatório (Estilo Epic Games):** Desafio OTP de 6 dígitos no servidor com bloqueio anti-força bruta após 5 tentativas falhas.
- **Step-Up 2FA em Ações Críticas (OWASP):** A alteração de chave PIX do criador (`PUT /api/creators/pix-key`) exige a confirmação de código OTP do 2FA (`twoFactorCode`) antes de persistir a nova chave.
- **Dev Outbox:** Endpoint seguro (`/api/dev/outbox/latest`) restrito estritamente aos perfis `dev`, `test` e `local` para visualização dos códigos OTP sem vazamento em logs.
- **Anti-IDOR:** Identidade e papéis (Leitor, Criador, Moderador) extraídos exclusivamente do `SecurityContextHolder`. Proibido confiar em headers como `X-User-Id` ou dados passados pelo cliente.

### 3.2. Conformidade Estrita com a LGPD (Lei 13.709/2018)
- **Consentimento Auditável (Art. 7º, I e Art. 8º):** Registro explícito no banco (`terms_accepted_at`, `privacy_policy_version`, `birth_date` na tabela `users` via Flyway V5).
- **Direito à Portabilidade (Art. 18, V):** Endpoint `GET /api/users/me/export` gerando JSON estruturado com dados do usuário, perfil, histórico de leitura e transações.
- **Direito ao Esquecimento e Revogação Imediata (Art. 18, VI):** Endpoint `DELETE /api/users/me` realiza anonimização completa dos dados pessoais, revoga todas as sessões ativas em memória (`SessionStore.removeByUserId`), apaga arquivos físicos de avatar do storage e despublica obras ativas (`status = 'archived_lgpd'`).
- **Criptografia em Repouso:** CPF e chaves PIX cifrados com AES-256-GCM via `AesCryptoConverter`. Fail-fast obrigatório em produção se a chave `AES_SECRET_KEY` não for informada.

### 3.3. Upload e Segurança de Arquivos
- **Validação de Magic Bytes:** Checagem dos primeiros bytes do arquivo para JPEG (`FF D8 FF`), PNG (`89 50 4E 47`) e WebP (`RIFF` nos bytes 0..3 e `WEBP` nos bytes 8..11).
- **Proteção contra Path Traversal:** Rejeição de caminhos contendo `..`, caracteres de controle ou separadores externos. Nomes de arquivos gerados pelo servidor com UUID.
- **ChapterFileAccessGuard:** Páginas de capítulos são privadas e acessíveis apenas mediante validação de early access e status da obra através da tabela indexada `chapter_files`.

---

## 4. Plano atual — Fases F0 a F8

Este é o plano vigente do produto. Os critérios concluídos refletem implementação e validações já registradas; itens externos ou sem execução comprovada permanecem abertos. A fila operacional detalhada está em `docs/orquestracao/ROADMAP-FASES.md`.

### F0 — Infra Docker First · ✅ concluída
**Objetivo:** subir a stack local integrada e conectar backend a PostgreSQL e MongoDB.

- [x] Compose local válido; Postgres, Mongo, Redis, Mailpit, backend e frontend saudáveis; migrations aplicadas e `/api/feed` respondeu 200.
- [x] `docker compose down` sem remover volumes; dados persistentes preservados.

### F1 — Autenticação, 2FA, e-mail e senhas · 🟡 parcial
**Objetivo:** cadastro/login seguro, Google verificado no servidor, OTP por e-mail, sessão e recuperação de conta.

- [x] OTP HMAC com propósito para login/step-up PIX, limites de reenvio, SMTP/Mailpit e validação server-side do ID token Google implementados. Recuperação usa link/token SHA-256 persistido em PostgreSQL, TTL configurável de 5–60 min (padrão 30), uso único, resposta genérica, origem HTTPS validada, política de senha oficial e revogação de sessões; V13 criada.
- [x] OTP válido de login persiste a confirmação de posse do e-mail; redefinição de senha não confirma nem altera o e-mail. Google requer claim `email_verified=true`. V12 adiciona `email_verified_at` sem editar migrations anteriores.
- [x] Política de senha nova: 8–64 pontos de código Unicode; confirmação, revelar/ocultar acessível e medidor Fraca/Média/Forte; backend recusa senha fraca em cadastro/reset, sem bloquear login de contas legadas.
- [x] `PasswordPolicyTest` passou 4/4 e `AuthApplicationServiceTest` passou 10/10, incluindo o bloqueio de cadastro fraco; Mailpit E2E e testes OTP/Google inválidos estão cobertos conforme evidência no roadmap.
- [ ] Aplicar e validar V12/V13 em Postgres real; testar envio da recuperação por Mailpit e consumo concorrente. Testes focados de recuperação/controller/SMTP passaram 17/17 e a suíte completa 283/0/0 (12 ignorados); Mockito exigiu agente pré-carregado no runtime atual. Homologar ID token Google válido e configurar DNS autenticado SPF/DKIM/DMARC.

### F2 — Perfis de leitor e criador · ✅ concluída
**Objetivo:** perfis público/privado, página do criador, links, avatar e biblioteca com autorização no servidor.

- [x] Privacidade e ownership verificados no backend; links externos validados; bio sanitizada.
- [x] Avatar decodificado, limitado, redimensionado/recodificado no servidor e integrado às telas; respostas privadas sem cache compartilhado.

### F3 — Obras, capítulos e leitores de mangá/light novel · ✅ concluída
**Objetivo:** metadados no Postgres, arquivos seguros, progresso idempotente no Mongo e leitura adequada a imagem ou prosa.

- [x] Publicação futura/obra arquivada respeitam guard; páginas têm MIME correto, `nosniff`, sem cache compartilhado; progresso é idempotente.
- [x] Limites de páginas/dimensões e capítulos de prosa implementados sem quebrar o fluxo de páginas de mangá.
- [x] Carga HTTP com página real: 100/100 respostas 200, concorrência 10, p95 190 ms; detalhe e evidência no roadmap.

### F4 — Monetização e financeiro · 🟡 parcial
**Objetivo:** doações e Clube de Membros idempotentes, splits, ledger e PIX com step-up, sem saldo fictício.

- [x] Checkout idempotente, webhook validado e efeitos financeiros apenas após confirmação; UI não inventa saldo nem divide valores como autoridade.
- [ ] Homologar o fluxo completo no Mercado Pago Sandbox com credenciais e endpoint público de webhook.

### F5 — Frontend “Banca de Rua” · 🟡 parcial
**Objetivo:** interface acessível e responsiva, sem mocks de produção ou estados financeiros falsos.

- [x] Fixtures isoladas em desenvolvimento; sessão 401 vira deslogada; contraste estático, senha e Sobre Nós implementados; build de produção verde.
- [ ] Concluir inspeção visual e navegação por teclado em todas as rotas quando o navegador de QA estiver disponível.

### F6 — LGPD e AppSec · 🟡 parcial
**Objetivo:** consentimento versionado, direitos do titular, maioridade e segurança de dados/arquivos.

- [x] Reaceite server-side, auditoria append-only, exportação, exclusão, maioridade e checklist técnico aplicados; V11 substitui backfill inferido sem editar V5.
- [ ] Publicar a Política de Privacidade aprovada e definir/sanar os dados organizacionais e legados pendentes conforme procedimento controlado.

### F7 — QA, E2E e CI · 🟡 parcial
**Objetivo:** comprovar fluxos em stack real e automatizar validação em pull request.

- [x] Suíte backend em 20/10/2026: 283 testes, 0 falhas/erros e 12 ignorados por Docker indisponível; build frontend verde e smoke E2E 12/12 de execução local real previamente confirmado; workflow de CI configurado para pull requests.
- [ ] Obter uma execução remota observada em PR; depende de branch/PR e permissão de publicação.

### F8 — Prontidão de produção · 🟡 parcial
**Objetivo:** operar sessão/OTP distribuídos, observabilidade, backup, e-mail e resposta a incidentes.

- [x] Adapters Redis, métricas/logs/regras, scripts de backup/restore-check e runbook estão implementados; perfil de produção exige stores distribuídos e credenciais.
- [ ] Prova operacional atual de Redis e restore; ativar Alertmanager/canal de plantão; configurar destino cifrado; autenticar domínio e monitorar bounces; aprovar encarregado, inventário e retenção; exercitar runbook.

**Próxima sequência:** (1) passe visual/teclado F5; (2) obter execução de CI em PR; (3) com Docker acessível, provar Redis OTP e backup/restore; (4) fechar Sandbox, DNS/e-mail e decisões de governança F1/F4/F6/F8. O teste de serviço para senha fraca foi confirmado em `AuthApplicationServiceTest` (10/10). Não marcar dependências externas como concluídas sem evidência.

---

## 5. Histórico legado — fases 0 a 9 (não representa o estado atual)

### FASE 0: Diagnóstico e Decisões de Arquitetura (ADRs) `[CONCLUÍDO]`
- [x] **0.1.** Inventário completo de entidades, controllers, componentes e scripts de build.
- [x] **0.2. ADR-001:** Separação PostgreSQL 16 (ACID) + MongoDB 7 (telemetria/feed) + Filesystem local.
- [x] **0.3. ADR-002:** Sessão segura HttpOnly, CSRF e Dev Outbox para 2FA local.
- [x] **0.4. ADR-003:** Adaptador de pagamento Sandbox e Ledger com idempotência por chave externa.
- [x] **0.5. ADR-004:** Política anti-pirataria, LGPD e gamificação de seasons de 60 dias.
- [x] **0.6. ADR-005:** Identidade visual "Banca de Rua", tokens CSS e eliminação de design genérico.
- [x] **0.7. ADR-006:** Banimento total de lojas físicas, VIP R$23 sem anúncios e preparação mobile.

### FASE 1: Fundação Local e Camadas Limpas (Backend) `[CONCLUÍDO]`
- [x] **1.1.** Orquestração via `docker-compose.yml` (Postgres na porta 25432 e Mongo na 27017).
- [x] **1.2.** Migrações relacionais Flyway (V1 schema base, V2 VIP e denúncias, V3 flag de moderador).
- [x] **1.3.** Serviço `FileStorageService` local seguro com allow-list e validação de magic bytes.
- [x] **1.4.** Refatoração Clean Architecture com Application Services e DTOs Java Records.

### FASE 2: Identidade, Sessão Segura e 2FA Obrigatório `[CONCLUÍDO]`
- [x] **2.1.** Cadastro com BCrypt (fator de custo 12) para Leitor e Criador.
- [x] **2.2.** Fluxo 2FA OTP de 6 dígitos com Dev Outbox seguro para desenvolvimento.
- [x] **2.3.** Gestão de sessão por cookie HttpOnly com endpoints `/api/auth/me` e `/api/auth/logout`.
- [x] **2.4.** Hardening defensivo: `RateLimitingFilter`, headers HTTP de segurança e `SanitizationUtils`.

### FASE 3: Perfis, Visibilidade Autoritativa, Biblioteca e LGPD `[CONCLUÍDO]`
- [x] **3.1.** Direitos do titular LGPD (exportação em JSON e direito ao esquecimento com anonimização).
- [x] **3.2.** Criptografia em repouso AES-256-GCM para CPF e chave PIX do criador.
- [x] **3.3.** Perfil público obrigatório para criador e biblioteca pública/privada para leitores.

### FASE 4: Catálogo, Obras, Capítulos e Moderação Anti-Pirataria `[CONCLUÍDO]`
- [x] **4.1.** Cadastro de obras com declaração mandatória de autoria original.
- [x] **4.2.** Publicação de capítulos com suporte a acesso antecipado exclusivo para membros.
- [x] **4.3.** Fila de denúncias e painel de moderação com suspensão cautelar imediata de obras.

### FASE 5: Leitor Web, Telemetria de Progresso e Algoritmo de Feed `[CONCLUÍDO]`
- [x] **5.1.** Leitor web vertical com registro contínuo de página lida no MongoDB.
- [x] **5.2.** Algoritmo de feed com pontuação de engajamento, popularidade e boosts de season.
- [x] **5.3.** Sincronização assíncrona pós-commit entre Postgres e MongoDB via listeners de eventos.

### FASE 6: Doações, Membros, Monetização de Anúncios e VIP `[CONCLUÍDO]`
- [x] **6.1.** Doações diretas e Clube de Membros com split 83% criador / 17% plataforma.
- [x] **6.2.** Split de receita de anúncios (58% criador / 42% plataforma) a cada 30 páginas lidas.
- [x] **6.3.** Assinatura VIP (~R$ 23/30 dias) com supressão de anúncios e badge cosmético.

### FASE 7: Upload Real, Integração Frontend e Backoffice `[CONCLUÍDO]`
- [x] **7.1.** Upload real multipart de capas e páginas com vinculação segura a obras e capítulos.
- [x] **7.2.** Leitor React consumindo páginas reais da API (`/api/works/.../chapters/.../read`).
- [x] **7.3.** Backoffice de moderação funcional para usuários com papel `ROLE_MODERATOR`.

### FASE 8: Roadmap do App Mobile & Leitura Offline `[PARCIAL]`
- [x] **8.1. Reutilização de API (Backend):** Endpoints do manifesto de leitura offline (`MobileOfflineController`) prontos e validados via sessão.
- [ ] **8.2. App Mobile Nativo:** Desenvolvimento do app Android/iOS com sandbox e `FLAG_SECURE` (roadmap futuro).

### FASE 9: Homologação Final, Smoke Test E2E e Release v1.0.0 `[CONCLUÍDO]`
- [x] **9.1.** Teste de fumaça E2E (12/12 etapas validadas via script automatizado contra PostgreSQL 16 e MongoDB 7 reais: cadastro LGPD, 2FA, Step-Up PIX, upload multipart, obra, capítulo, doação 83/17, exportação e anonimização imediata).
- [x] **9.2.** Mesclagem oficial na branch `main` via PR #2 e tag `v1.0.0-release` anotada.

---

## 6. Histórico legado — fases 10 a 17

### FASE 10: Dockerização de Produção, Deploy & CI/CD `[CONCLUÍDO]`
**Objetivo:** Empacotar o ecossistema completo em containers prontos para produção com builds multi-stage e pipeline automatizada no GitHub Actions.

- [x] **10.1. Dockerfile Multi-Stage do Backend:**
  - Build Maven em container isolado + imagem final mínima com Eclipse Temurin 21 JRE Alpine.
  - Execução como usuário não-root (`appuser`), JVM tuning (`-XX:+UseG1GC`, `-XX:MaxRAMPercentage=75`). Imagem testada e construída localmente.
- [x] **10.2. Dockerfile Multi-Stage do Frontend & Nginx:**
  - Compilação Node 22 (`npm run build`) + Nginx Alpine servindo assets estáticos.
  - Configuração de proxy reverso `/api/` -> `backend:8085`, roteamento SPA (`try_files $uri /index.html`) e cache imutável de fontes/imagens. Imagem testada e construída localmente.
- [x] **10.3. Orquestração de Produção (`docker-compose.prod.yml`):**
  - Integração de `postgres`, `mongodb`, `backend` e `frontend` com rede interna protegida e volumes externos.
- [x] **10.4. Pipeline de CI/CD (GitHub Actions):**
  - Workflow automatizado `.github/workflows/ci.yml` em pull requests e branches principais: `mvn test` (com Testcontainers) + `npm run build` + build das imagens Docker.

### FASE 11: Leitura Offline PWA (Web) para Assinantes VIP `[CONCLUÍDO]`
**Objetivo:** Permitir que assinantes VIP façam download de capítulos selecionados diretamente no navegador para leitura sem internet.

- [x] **11.1. Service Worker & Cache Storage (PWA):**
  - Registro de Service Worker (`sw.js`) para cache da aplicação e assets com estratégia Stale-While-Revalidate e Cache-First para páginas de capítulos (`/api/storage/`).
  - Módulo de download e armazenamento offline no CacheStorage e metadados no localStorage (`offlineStorage.ts`).
- [x] **11.2. Integração com Manifesto Offline:**
  - Consumo do endpoint `/api/mobile/offline/download-manifest/{chapterId}` (`mobileOfflineApi.ts`) validando status VIP no leitor web.
  - Botão de download e indicador visual no card de capítulo (`WorkDetailPage.tsx`): `[OFFLINE ✓]`.
  - Leitor web (`ReaderPage.tsx`) com fallback automático para CacheStorage quando offline ou quando a requisição de rede falhar.

### FASE 12: Observabilidade, Métricas & Transição para Redis `[CONCLUÍDO]`
**Objetivo:** Preparar a aplicação para escala horizontal sem estado em múltiplos servidores.

- [x] **12.1. Spring Boot Actuator & Prometheus:**
  - Métricas de requisições HTTP, contagem de páginas consumidas (`manganetworking.pages.read.total`), anúncios engatilhados a cada 30 páginas (`manganetworking.ads.impression.total`) via Micrometer.
  - Healthchecks granulares (`/actuator/health/readiness` e `liveness`) liberados no `SecurityConfig.java` para orquestradores de container.
- [x] **12.2. Implementação do Store Redis Distribuído:**
  - Implementado `RedisSessionStore` com TTL atômico e índice reverso por `userId` para revogação em massa LGPD Art. 18.
  - Implementado `RedisRateLimitStore` com contador atômico (`INCR`) e auto-expurgo em 120 segundos.
  - Anotações `@ConditionalOnProperty` garantindo alternância transparente entre `inmemory` (dev/testes) e `redis` (produção).
  - Orquestração no `docker-compose.prod.yml` com container `redis:7-alpine` e healthcheck nativo.

### FASE 13: Validação de Serviços & Checkout Pro Sandbox `[BLOQUEADA POR CONFIGURAÇÃO EXTERNA]`
**Objetivo:** Validar o envio real de códigos de autenticação e homologar o Checkout Pro VIP em Sandbox. Este plano descreve o produto; estado detalhado e próxima tarefa ficam na fila única de `docs/orquestracao/ROADMAP-FASES.md`.

- [x] **13.1. Configuração local de SMTP e Mercado Pago:**
  - O backend importa `.env` quando iniciado pela raiz ou por `backend/`; o template versionado usa placeholders e `.env` permanece ignorado pelo Git.
  - SMTP está implementado com `SmtpMfaNotificationSender`; Mailpit local recebeu e verificou um OTP ponta a ponta. Domínio autenticado e credenciais/provedor de produção continuam pendentes.
- [x] **13.2. Entrega 2FA local via Mailpit:**
  - E-mail recebido e OTP verificado ponta a ponta; testes cobrem expiração, uso único e limite de tentativas.
- [ ] **13.2a. Entregabilidade em domínio de produção — bloqueada por DNS/provedor:**
  - Preparação local concluída: adapter SMTP, remetente configurável por variáveis, envio de links de recuperação sem segredo no assunto, origem pública HTTPS obrigatória no Compose de produção e TTL de token configurável (`PASSWORD_RESET_TOKEN_TTL`, padrão `PT30M`, permitido entre 5 e 60 minutos).
  - Para concluir: domínio controlado pelo projeto, provedor SMTP escolhido, credenciais de produção, publicação e validação de SPF/DKIM/DMARC e configuração de bounce. Não usar conta pessoal como teste de produção. Nenhuma alteração de DNS ou envio externo foi feita nesta rodada.
- [x] **13.3. Integração de Checkout Pro VIP (código e testes automatizados):**
  - Preferência vinculada no PostgreSQL ao usuário e preço esperado; ativação exige webhook HMAC válido e pagamento aprovado em BRL, com valor e referência conferidos.
  - A repetição do pagamento não duplica benefício: `financial_ledger.payment_external_id` é a chave de idempotência.
- [ ] **13.4. Homologação do Checkout Pro VIP em Sandbox — bloqueada por credenciais/endpoint público:**
  - Código de checkout e validação de webhook estão implementados; homologação real exige credenciais de teste Mercado Pago, URL pública HTTPS alcançável pelo provedor e confirmação do pagamento de teste ponta a ponta. Não foram criadas credenciais nem exposto endpoint nesta rodada. Nenhuma compra real ou ativação em produção foi executada.
- [x] **13.5. Bloqueio de ativação financeira sem pagamento confirmado:**
  - Endpoints legados de VIP, doação e Clube de Membros retornam `410 Gone`; doação e membership ficam indisponíveis até receberem checkout/webhook idempotentes equivalentes.

### FASE 14: Infraestrutura em Nuvem (Oracle Cloud Always Free) `[BLOQUEADA POR ACESSO/DECISÕES EXTERNAS]`
**Objetivo:** Preparar a hospedagem da stack em Oracle Cloud. A elegibilidade e o custo dependem dos limites e disponibilidade do plano/região; custo zero não pode ser garantido antes da criação e validação da conta/recursos.

- [ ] **14.1. Provisionamento de VM Ampere A1 (ARM64 / Ubuntu 22.04) — não iniciado:**
  - Pendências externas: acesso à conta Oracle Cloud, região/shape elegíveis e disponíveis, chave pública SSH autorizada e confirmação do IP/regras de rede. Nenhuma VM ou regra de firewall foi criada.
  - Ao provisionar, expor somente SSH (22) e HTTP/HTTPS (80/443 conforme proxy TLS); manter Postgres, Mongo e Redis sem portas públicas. HTTPS precisa ser definido antes de receber credenciais ou sessões reais.
- [x] **14.2. Preparação local do Compose de produção:**
  - `docker-compose.prod.yml` exige credenciais por variáveis, mantém bancos/Redis na rede interna, requer Redis para sessão/rate-limit/OTP e exige `PUBLIC_FRONTEND_URL` público. A validação estática do Compose foi feita com placeholders; isso não comprova deploy.
- [ ] **14.3. Deploy e validação operacional em Oracle — não executados:**
  - Depois de provisionar: instalar Docker/Compose, criar `.env` fora do Git com chaves definitivas, executar a stack, validar healthchecks, migrações Flyway V1–V13 e smoke test. Não gerar nem armazenar aqui a chave AES de produção.
  - Sem acesso autorizado à conta e ao host, nenhum serviço foi implantado, nenhuma migration foi aplicada em banco Oracle e nenhum backup/restore de produção foi testado. Nenhuma compra real ou ativação financeira de produção foi executada.

### FASE 15: Conexão Segura & Proxy Serverless (Cloudflare Pages Functions)
**Objetivo:** Interligar o frontend em `manganetworking.pages.dev` à API na Oracle Cloud sem custos de domínio nem problemas de CORS/cookies.

- [ ] **15.1. Implementação de Pages Function (`functions/api/[[path]].ts`):**
  - Proxy reverso transparente de `/api/*` para o IP público da VM Oracle.
  - Preservação estrita de headers de autorização, cookies `HttpOnly` com `SameSite=Strict`, e payload de uploads multipart.
- [ ] **15.2. Teste End-to-End Front <-> Back:**
  - Acesso ao site oficial no Cloudflare Pages.
  - Cadastro de leitor, recebimento de código 2FA e login com sessão persistente.

### FASE 16: Ativação Financeira do Mercado Pago & Virada de Produção `[PENDENTE — NÃO EXECUTAR SEM HOMOLOGAÇÃO]`
**Objetivo:** Habilitar pagamentos reais somente depois da homologação Sandbox, com webhook criptográfico e idempotência. O Checkout VIP existe no código; isso não significa que produção esteja habilitada.

- [ ] **16.1. Homologação do webhook VIP:**
  - Registro da URL `https://manganetworking.pages.dev/api/monetization/mercadopago/webhook` no painel do desenvolvedor MP.
  - Teste Sandbox de assinatura HMAC-SHA256 (`x-signature`), pagamento aprovado, moeda/valor/referência incorretos e webhook repetido.
  - Confirmar uma única ativação VIP de 30 dias. Não aceitar retorno do navegador como confirmação de pagamento.
- [ ] **16.2. Virada de Chaves de Produção (`APP_USR-...`):**
  - Só após aprovação explícita de lançamento, trocar credenciais Sandbox por produção em secret manager e revisar webhook, domínio e monitoramento.
  - Não abrir pagamentos reais enquanto doação e Clube de Membros continuarem bloqueados ou sem fluxo homologado.

### FASE 17: Analytics do Criador & Gamificação Avançada
**Objetivo:** Entregar métricas editoriais para quadrinistas e impulsionar engajamento com Seasons de 60 dias.

- [ ] **17.1. Painel de Analytics no Workspace do Criador:**
  - Gráficos de retenção por página e distribuição de receita (83/17 e 58/42).
- [ ] **17.2. Motor de Seasons de 60 Dias:**
  - Virada automática de temporada e concessão de bônus algorítmico no feed (1.5x a 2.2x).

---

## 7. Histórico Consolidado de Passes de Engenharia (Passes 10 ao 22)

| Passe | Data | Escopo Principal | Evidência / Resultado |
|---|---|---|---|
| **Passe 10** | 16/10/2026 | Coerência funcional do feed no MongoDB; suspensão não ressuscita obra; paginação correta na consulta. | 123 testes verdes; commit `a12e52e`. |
| **Passe 11** | 16/10/2026 | Desacoplamento do sync de feed via `@TransactionalEventListener(AFTER_COMMIT)`. | 129 testes verdes; commit `a12e52e`. |
| **Passe 12** | 16/10/2026 | DTOs de apresentação para read-models NoSQL (`FeedWorkResponseDto`, `ReadingProgressResponseDto`). | 132 testes verdes; commit `f948996`. |
| **Passe 13** | 16/10/2026 | `ChapterFileAccessGuard` indexado via tabela `chapter_files` (Flyway V4), eliminando query `LIKE`. | 144 testes verdes; commit `f948996`. |
| **Passe 14** | 16/10/2026 | Higiene de segredos: remoção de senhas do `application.yml`, `.env.example` e `README_SECRETS.md`. | 144 testes verdes; commit `58ffd71`. |
| **Passe 15** | 17/10/2026 | Ponte Spring/JPA para `AesCryptoConverter` e fail-fast obrigatório em perfil `prod`. | 148 testes verdes. |
| **Passe 16** | 19/10/2026 | **Hardening LGPD Core, Step-Up 2FA & Integridade Frontend:**<br>- Flyway V5 (`terms_accepted_at`, `birth_date`).<br>- Step-Up 2FA obrigatório em `PUT /api/creators/pix-key`.<br>- Validação de maioridade (18+) no nível 2 de monetização.<br>- Despublicação de obras no esquecimento (`status = 'archived_lgpd'`).<br>- Revogação imediata de sessões no delete de conta (`SessionStore.removeByUserId`).<br>- Purga definitiva de saldos fictícios na UI (`CreatorWorkspacePage.tsx`). | **189 testes verdes** (`mvn test` 189/189, 0 falhas). Frontend compilando limpo em 2.05s (`npm run build`). |
| **Passe 17** | 19/10/2026 | **Validação E2E com Docker Daemon & Testcontainers:**<br>- 8 testes de integração com Testcontainers verdes (197/197 total).<br>- **Smoke Test E2E 12/12 Live Aprovado** (`smoke_test_e2e.ps1` executado contra PostgreSQL 16 e MongoDB 7 reais): cadastro LGPD, 2FA, Step-Up PIX, upload PNG, criação de obra, capítulo, doação 83/17, exportação e anonimização imediata. | **197 testes verdes no backend**, build do frontend em 2.47s, **Smoke Test E2E 12/12 100% verde**. |
| **Passe 18** | 19/10/2026 | **Dockerização de Produção (CI/CD) & Leitura Offline PWA VIP:**<br>- Backend `Dockerfile` multi-stage (Temurin 21 Alpine non-root + G1GC tuning).<br>- Frontend `Dockerfile` + Nginx Alpine com reverse proxy `/api/` e SPA router.<br>- `docker-compose.prod.yml` orquestrando postgres, mongo, backend e frontend.<br>- Pipeline GitHub Actions `.github/workflows/ci.yml`.<br>- PWA Service Worker (`sw.js`), `manifest.webmanifest` e `offlineStorage.ts`.<br>- Download e leitura de capítulos offline para assinantes VIP com fallback transparente no `ReaderPage.tsx`. | **Build Docker do Backend OK**, **Build Docker do Frontend OK**, **Build do Frontend Vite em 2.13s OK** (1642 módulos). |
| **Passe 19** | 19/10/2026 | **Observabilidade Actuator/Prometheus & Store Redis Distribuído:**<br>- Spring Boot Actuator, Micrometer Prometheus e Health Probes (`/actuator/health/readiness` e `liveness`).<br>- `ObservabilityMetricsService` registrando leituras de páginas e impressões de anúncios.<br>- `RedisSessionStore` com TTL atômico e índice reverso por `userId` para purge LGPD.<br>- `RedisRateLimitStore` com contadores atômicos e TTL nativo de 120s.<br>- Suporte multi-nó Stateless no `docker-compose.prod.yml` com `redis:7-alpine`. | **197 testes do backend verdes (100% BUILD SUCCESS)**, **Build do frontend Vite OK (2.14s)**, **Docker Compose config validado**. |
| **Passe 20** | 19/10/2026 | **Correção de Bloqueadores Críticos (C2, C3, C5), SMTP Real & Mercado Pago:**<br>- **C5 Corrigido:** `docker-compose.yml` corrigido com `${POSTGRES_PASSWORD:-...}` e adicionado container `mailpit` para dev.<br>- **C2 Blindado:** Bloqueio mandatório de avanço para nível 2 de monetização se `birthDate == null` ou idade < 18 anos.<br>- **C3 Resolvido:** Endpoint `POST /api/auth/2fa/request` criado para emissão de Step-Up OTP no e-mail do usuário.<br>- **C4 & SMTP Real:** `spring-boot-starter-mail` + `SmtpMfaNotificationSender` com template HTML da marca MangaNetWorking.<br>- **Mercado Pago Oficial:** `MercadoPagoService` gerando Checkout Pro para VIP e Doações com validação HMAC-SHA256 no webhook. | **207 testes verdes no backend (100% BUILD SUCCESS)**, **Build do frontend limpo em 2.13s**. |
| **Passe 21** | 19/10/2026 | **Auditoria de pagamentos sem confirmação:** bloqueio dos endpoints antigos de doação, membros e VIP com `410 Gone`; UI deixou de simular sucesso local. Checkout VIP persiste preferência→usuário→valor e valida pagamento; V6 preparada, sem afirmar migração aplicada nem homologação Sandbox. | `mvn -o test`: **227 testes, 0 falhas/erros**; `npm.cmd run build`: **1644 módulos, concluído**. Sandbox segue pendente. |
| **Passe 22** | 19/10/2026 | **UX e política de força de senha:** olho acessível para revelar/ocultar senha e confirmação; painel inline exibe força fraca/média/forte e critérios; cadastro/reset bloqueiam senhas fracas também no backend. Login preserva credenciais antigas. | Frontend build verde (1648 módulos) e `PasswordPolicyTest` 4/4 verde. A regressão de serviço foi adicionada, mas `AuthApplicationServiceTest` não concluiu por travamento no self-attach do Mockito no Windows; validar em CI antes de encerrar o aceite. |

### Próximos passos (estado atual)

A ordem vigente é mantida em `docs/orquestracao/ROADMAP-FASES.md`. Próximo passo imediato: confirmar em CI o teste de serviço que rejeita cadastro fraco (a execução local travou no attach do Mockito). Depois: (1) passe visual/teclado quando navegador local estiver disponível; (2) execução do workflow em PR quando houver permissão de push; (3) teste Redis OTP e backup/restore com Docker acessível; (4) alertas, destino cifrado e SMTP após escolha de provedores; (5) aprovação de encarregado e retenção pelos responsáveis organizacionais/legais. A rodada não marca esses bloqueios externos como concluídos.

---

## 8. Resumo Técnico do Ambiente

| Componente | Tecnologia | Porta / Path | Status de Verificação |
|---|---|---|---|
| **API Backend** | Spring Boot 3.4.2 / Java 21 | `8085` | 227 testes verificados no Passe 21; integração Sandbox ainda pendente |
| **Banco Relacional** | PostgreSQL 16 (Docker) | `25432` | Migrações V1 a V5 aplicadas; testado ao vivo no smoke test |
| **Banco NoSQL** | MongoDB 7 (Docker) | `27017` | Eventos de feed e telemetria validados ao vivo |
| **Storage de Imagens** | Filesystem Local Sanitizado | `./data/uploads/` | Magic bytes e guard por `chapter_files` validados |
| **Frontend Web** | React 19 / TypeScript / Vite | `5180` | Build limpo (1640 módulos compilados em 2.47s) |

# Plano de Fases, Regras de Negócio & Estado de Implementação — MangaNetWorking

> **DOCUMENTO MESTRE DE PRODUTO & REGRAS DE NEGÓCIO**
>
> **Última Atualização:** 19 de Outubro de 2026
>
> **Estado real do repositório:** ver `docs/orquestracao/ROADMAP-FASES.md` e `docs/orquestracao/AUDITORIA-ATUAL.md`.
>
> ⚠️ **Os números de teste, build e smoke deste documento não são prova de estado.** A contagem de testes, o `npm run build` e o smoke E2E só valem com saída de terminal real; nesta data o `docker-compose.yml` está inválido e a stack não sobe (achado C5 da auditoria).
>
> **Migrações Flyway:** V1 a V5 no repositório; V5 ainda **não confirmada** em `flyway_schema_history` real.
>
> **Ambiente Local:** PostgreSQL (`localhost:25432`), MongoDB (`localhost:27017`), Backend Spring Boot (`localhost:8085`), Frontend Vite (`localhost:5180`).

---

## 1. Visão Geral do Produto e Arquitetura

O **MangaNetWorking** é uma plataforma editorial **100% digital** voltada para publicação, leitura em formato vertical (webtoon/scroll infinito) e apoio financeiro a quadrinistas e mangakás independentes originais. O sistema conecta leitores e criadores sem qualquer intermediário de produtos físicos.

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

1. **ZERO Loja Física / Zero Merchandising / Zero Impressão sob Demanda (POD) / Zero Estoque / Zero Frete:**
   - A plataforma é estritamente digital. Não existe venda de mangás impressos, roupas, posters ou brindes físicos.
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

## 4. Roadmap Oficial de Fases

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

## 5. Próximas Fases de Engenharia e Roadmap de Produto

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

---

## 6. Próximas Fases de Engenharia e Roadmap de Produto

### FASE 12: Observabilidade, Métricas & Transição para Redis
**Objetivo:** Preparar a aplicação para escala horizontal sem estado em múltiplos servidores.

- [ ] **12.1. Spring Boot Actuator & Prometheus:**
  - Métricas de requisições HTTP, tempo de renderização de páginas e contagem de leituras a cada 30 páginas.
  - Healthchecks granulares (`/actuator/health/readiness` e `liveness`).
- [ ] **12.2. Implementação do Store Redis Distribuído:**
  - Migração de `InMemorySessionStore` e `InMemoryRateLimitStore` para Redis compartilhado quando houver réplicas da API, com fallback transparente para InMemory no perfil dev.

### FASE 13: Analytics do Criador & Gamificação Avançada
**Objetivo:** Entregar dados editoriais ricos para os quadrinistas e impulsionar o engajamento com Seasons.

- [ ] **13.1. Painel de Analytics no Workspace:**
  - Gráficos de leitura por dia, retenção por página e distribuição líquida de doações/membros.
- [ ] **13.2. Motor de Seasons de 60 Dias:**
  - Job automático de virada de temporada e concessão de bônus algorítmico (1.5x a 2.2x) para os criadores mais ativos.

---

## 7. Histórico Consolidado de Passes de Engenharia (Passes 10 ao 18)

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

---

## 7. Resumo Técnico do Ambiente

| Componente | Tecnologia | Porta / Path | Status de Verificação |
|---|---|---|---|
| **API Backend** | Spring Boot 3.4.2 / Java 21 | `8085` | 197 testes verdes (189 unit + 8 Testcontainers); zero falhas; zero erros |
| **Banco Relacional** | PostgreSQL 16 (Docker) | `25432` | Migrações V1 a V5 aplicadas; testado ao vivo no smoke test |
| **Banco NoSQL** | MongoDB 7 (Docker) | `27017` | Eventos de feed e telemetria validados ao vivo |
| **Storage de Imagens** | Filesystem Local Sanitizado | `./data/uploads/` | Magic bytes e guard por `chapter_files` validados |
| **Frontend Web** | React 19 / TypeScript / Vite | `5180` | Build limpo (1640 módulos compilados em 2.47s) |

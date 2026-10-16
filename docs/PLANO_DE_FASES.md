# Plano de Fases e Entregas Verticais — MangaNetWorking

> **Referência Oficial:** `README.md` e `docs/PROMPT_ANTIGRAVITY.md`  
> **Objetivo:** Orientar a evolução do sistema em fatias pequenas, seguras, testáveis e 100% executáveis localmente, sem dependências de infraestrutura externa.
> **Diretrizes Estratégicas:** Sem loja ou produtos físicos, conformidade estrita com a LGPD, tolerância zero para pirataria/hentai e gamificação por Seasons para criadores.

---

## Legenda de Status
- `[ ]` **Não Iniciado:** Requisitos mapeados, aguardando início da fase.
- `[~]` **Em Andamento / Parcial:** Esqueleto ou mock inicial presente; necessita refinamento ou testes.
- `[x]` **Concluído e Verificado:** Implementado no código, com critérios de aceite validados e testes executados com sucesso.

---

## FASE 0: Diagnóstico e Decisões de Arquitetura (ADRs)
**Objetivo:** Mapear o scaffold existente, identificar gaps de segurança, registrar decisões arquiteturais duradouras e isolar fronteiras de tecnologia.

- [x] **0.1. Diagnóstico do Repositório:** Inventário de entidades JPA, coleções Mongo, componentes React e scripts de build (`mvn compile` e `npm run build`).
- [x] **0.2. ADR-001 (Separação de Dados):** Documentar formalmente a fronteira entre PostgreSQL (ACID/Relacional), MongoDB (NoSQL/Telemetria) e Filesystem Local (Arquivos Binários/Páginas). (`docs/decisions/ADR-001-arquitetura-bancos-e-storage.md`)
- [x] **0.3. ADR-002 (Sessão Segura e Dev Outbox):** Decisão sobre cookies de sessão `HttpOnly` + CSRF vs tokens e caixa de saída local para MFA em desenvolvimento. (`docs/decisions/ADR-002-modelo-de-sessao-e-mfa-dev-outbox.md`)
- [x] **0.4. ADR-003 (Adaptador de Pagamento Sandbox):** Isolamento da API do Mercado Pago atrás de interface para ambiente local sem credenciais reais. (`docs/decisions/ADR-003-adaptador-pagamento-sandbox-idempotencia.md`)
- [x] **0.5. ADR-004 (Anti-Pirataria, LGPD e Gamificação de Seasons):** Formalização de termos de uso, conformidade com a LGPD e sistema de temporadas para criadores. (`docs/decisions/ADR-004-politica-conteudo-anti-pirataria-lgpd-e-gamificacao.md`)

**Critério de Conclusão da Fase 0:** Documentos de ADR aprovados e commitados em `docs/decisions/`. (CONCLUÍDO)

---

## FASE 1: Fundação Local e Camadas Limpas
**Objetivo:** Garantir execução local segura e desacoplamento formal de camadas (Clean Architecture / DDD Lite).

- [x] **1.1. Orquestração Local:** `docker-compose.yml` com PostgreSQL 16 (porta 25432) e MongoDB 7 (porta 27017) isolados sem conflito com outros projetos.
- [x] **1.2. Migrações de Banco Versionadas:** Introdução do Flyway no backend para gerenciar o schema do PostgreSQL (`V1__init_schema.sql`), com `ddl-auto: validate`.
- [x] **1.3. Abstração de Armazenamento de Arquivos (`FileStorageService`):**
  - Implementado `LocalFileStorageService` no filesystem local (`./data/uploads/`) com validação de magic bytes, sanitização contra path traversal e allow-list de MIME types (JPEG, PNG, WebP).
  - Eliminado qualquer armazenamento de arrays binários em tabelas relacionais ou documentos Mongo.
- [x] **1.4. Refatoração de Camadas (Application Services):**
  - Controllers desacoplados: Controllers validam DTOs estritos e delegam casos de uso para `AuthApplicationService`, `UserProfileApplicationService`, `CreatorApplicationService`, `WorkApplicationService`.
  - Tratamento global de exceções padronizado com `@RestControllerAdvice` e `LinkedHashMap`.

**Critério de Conclusão da Fase 1:** `mvn test` rodando com migrações Flyway e serviço de upload/leitura local testado e validado. (CONCLUÍDO)

---

## FASE 2: Identidade, Sessão Segura e 2FA Obrigatório
**Objetivo:** Implementar o fluxo de autenticação e segurança ofensiva no backend com 2FA obrigatório (inclusive para login social).

- [x] **2.1. Cadastro e Modelagem de Usuário:**
  - Usuário escolhe papel inicial: Leitor ou Escritor (criador).
  - Hash de senha obrigatório com `BCryptPasswordEncoder(12)`.
- [x] **2.2. Login com E-mail/Senha e Login Google com 2FA Estilo Epic Games:**
  - Login e Login Google disparam desafio 2FA de 6 dígitos no servidor.
  - Caixa de Saída Local (`DevOutboxRepository` e `DevOutboxNotificationSender`) para exibição e consumo seguro do OTP em desenvolvimento (`/api/dev/outbox/latest?email=...`) sem poluir logs de console.
  - Restrição de ambiente: `DevOutboxController` marcado com `@Profile("!prod")`.
  - Proteção anti-força bruta no 2FA com bloqueio imediato na 5ª tentativa falha.
- [x] **2.3. Gestão de Sessão Segura:**
  - Emissão de cookie de sessão `HttpOnly`, `SameSite=Lax`, `Path=/` através de `SessionService`.
  - Spring Security stateless com `SessionAuthenticationFilter` injetando o contexto de autenticação a cada requisição.
  - Endpoints de autenticação `/me` e `/logout` seguro que invalida a sessão e expira o cookie no cliente.
- [x] **2.4. Hardening de Segurança:**
  - Anti-Mass Assignment: DTOs Java Records com validações estritas (`@NotBlank`, `@Email`, `@Size`, `@Pattern`).
  - Suíte completa de testes automatizados no backend cobrindo bypass de 2FA, força bruta, hash BCrypt, integridade de storage e validação de sessão.
- [x] **2.5. Segurança Intermediária e Anti-Spoofing (IDOR, Rate Limiting, Anti-XSS e Anti-Hardcoding):**
  - Resolução autoritativa de identidade via `SecurityContextUtils`: extrai usuário e criador diretamente da sessão criptografada no `SecurityContextHolder`, impossibilitando falsificação de headers HTTP (`X-Current-User-Id` / `X-Creator-Id`).
  - `RateLimitingFilter`: Throttling por IP em memória (15 req/min para rotas de auth e reports; 120 req/min global) com resposta padronizada HTTP 429 Too Many Requests.
  - Headers HTTP defensivos em `SecurityConfig`: X-Frame-Options (DENY anti-clickjacking), X-Content-Type-Options (nosniff), XSS-Protection e Referrer-Policy.
  - Sanitização editorial contra Stored XSS via `SanitizationUtils` em títulos, sinopses, bios e denúncias.
  - Configuração desacoplada e anti-hardcoded via `PlatformProperties` (`@ConfigurationProperties(prefix = "platform")`).

**Critério de Conclusão da Fase 2:** Testes unitários e de integração cobrindo tentativa de bypass de 2FA, rejeição de mass assignment, rate limiting, anti-spoofing e login completo com código da Dev Outbox rodando e passando 100%. (CONCLUÍDO)

---

## FASE 3: Perfis, Visibilidade Autoritativa, Biblioteca e LGPD
**Objetivo:** Implementar o perfil público/privado de leitor, a página pública do criador, a biblioteca pessoal e os mecanismos de privacidade previstos pela LGPD.

- [x] **3.1. Perfil do Leitor (Público vs Privado) e LGPD:**
  - Leitor pode alternar entre perfil PÚBLICO ou PRIVADO.
  - Se privado, o servidor bloqueia o acesso de terceiros à sua biblioteca e histórico (HTTP 403 / IDOR prevention).
  - Implementação dos direitos do titular da LGPD: endpoint de download dos próprios dados (`/api/users/me/export` - portabilidade/Art. 18) e endpoint de exclusão de conta (`DELETE /api/users/me` - direito ao esquecimento e anonimização cadastral).
- [x] **3.2. Perfil Público Obrigatório do Criador:**
  - Acessível por `/@handle` único.
  - Campos: Nome, Bio pública, links sociais permitidos e foto de perfil.
  - Dados sensíveis (CPF e chave PIX) criptografados com AES-256 no banco via `AesCryptoConverter` e **estritamente omitidos** de qualquer resposta pública da API.
- [x] **3.3. Biblioteca do Usuário e Marcador de Leitura:**
  - Usuário curte/descurte obras adicionando à sua biblioteca (`/api/users/library/{workId}/toggle`).
  - Integração com o marcador de progresso de leitura em tempo real no MongoDB.

**Critério de Conclusão da Fase 3:** Testes automatizados verificando que perfil privado não vaza dados, que CPF/PIX são criptografados com AES-256 e nunca aparecem em DTOs públicos e que a exclusão de conta respeita a LGPD. (CONCLUÍDO)

---

## FASE 4: Publicação, Leitor, Early Access e Moderação Anti-Pirataria
**Objetivo:** Permitir publicação de capítulos originais, leitura fluida, bloqueio estrito de acesso antecipado e moderação de conteúdo (anti-pirataria e anti-hentai).

- [x] **4.1. Publicação de Obras e Capítulos Originais:**
  - Criador cadastra obra (`POST /api/works`) com título, sinopse, capa, banner e gêneros.
  - Declaração obrigatória de autoria original na publicação (`originalAuthorDeclaration = true`), rejeitando qualquer tentativa com HTTP 400.
  - Upload e publicação de capítulos (`POST /api/works/{workId}/chapters`) com páginas em JSON e definição da data pública (`publicReleaseAt`).
- [x] **4.2. Módulo de Denúncias e Moderação Anti-Pirataria/Anti-Pornografia:**
  - Endpoint para envio de denúncia (`POST /api/reports`) com motivos: Violação de Direitos Autorais (`COPYRIGHT_PIRACY`), Conteúdo Pornográfico/Hentai (`PORNOGRAPHY_HENTAI`), Abuso ou Plágio.
  - Fila de moderação com capacidade de suspensão cautelar da obra (`POST /api/reports/moderate/suspend/{workId}`) e resolução automática de denúncias.
- [x] **4.3. Leitor de Mangá (Webtoon / Scroll):**
  - Leitura acessível, responsiva e com foco na arte.
  - Páginas servidas pelo `FileStorageService` local com validação de magic bytes e mime-types seguros.
- [x] **4.4. Progresso de Leitura em Tempo Real no MongoDB:**
  - Gravação rápida a cada virada de página em `reading_progress` no MongoDB (`/api/users/reading-progress/track`) sem sobrecarregar o PostgreSQL.
- [x] **4.5. Bloqueio Autoritativo de Early Access no Servidor:**
  - Se `now < publicReleaseAt` e o leitor não for membro ativo do autor, o backend bloqueia o retorno das imagens (`AccessDeniedException` / HTTP 403).

**Critério de Conclusão da Fase 4:** Testes de leitura validando que usuário não-membro recebe 403 em capítulo antecipado, que o progresso é salvo no MongoDB, que autoria original é mandatória e que denúncias de pirataria acionam suspensão da obra. (CONCLUÍDO)

---

## FASE 5: Descoberta, Algoritmo e Gamificação por Seasons
**Objetivo:** Implementar o algoritmo de recomendação e o sistema de missões dinâmicas e Seasons para criadores.

- [x] **5.1. Algoritmo de Ranking no Servidor (`RecommendationAlgorithmService`):**
  - Fórmula: $Score = (BaseOrgânica + Recência) \times Decaimento \times Qualidade \times BoostMissão$.
  - Bônus de recência para novos lançamentos (< 72h: +220 pts).
- [x] **5.2. Cache e Sincronização do Feed no MongoDB:**
  - Serviço e endpoint (`POST /api/feed/sync`) que processa o catálogo e alimenta `feed_works` no Mongo para respostas em < 15ms.
  - Endpoints de feed: `/api/feed?sort=recommended`, `/api/feed/trending`, `/api/feed/fresh` com filtros por gênero.
- [x] **5.3. Sistema de Seasons e Missões para Criadores:**
  - Temporadas de 60 dias integradas com boost de algoritmo e níveis de criador (Estreante, Em Ascensão, Destaque Editorial, Mestre da Temporada).
  - Resgate autoritativo de missões cumpridas (`POST /api/creators/workspace/missions/{missionId}/claim`) aplicando boost de 1.5x a 2.2x no feed por 24h a 72h.

**Critério de Conclusão da Fase 5:** Testes unitários do algoritmo validando decaimento temporal, cálculo de missões da temporada e concessão dos boosts no feed Mongo. (CONCLUÍDO)

---

## FASE 6: Monetização Digital Justa (Sem Loja Física)
**Objetivo:** Implementar a divisão financeira digital (17% plataforma / 83% criador), simulação de anúncios e assinatura VIP global.

- [x] **6.1. Doações e Clube de Membros (`Membership` do Criador):**
  - Doações avulsas com split: 83% autor / 17% plataforma (`POST /api/monetization/donate`).
  - Assinaturas de membros: Faixas de R$ 7,99 a R$ 45,99 definidas pelo autor com split 83%/17% (`POST /api/monetization/membership/subscribe`), desbloqueando acesso antecipado aos capítulos do autor.
- [x] **6.2. Anúncios no Leitor:**
  - Gatilho a cada 30 páginas lidas com split de 58% para o criador e 42% para a plataforma, gravando em `ad_revenue_ledger`.
  - Supressão total de anúncios para assinantes VIP da plataforma.
- [x] **6.3. Ledger Financeiro Append-Only e Idempotência:**
  - Registro imutável de transações com controle estrito de idempotência por `paymentExternalId`, prevenindo double-spending.
  - Suporte a transações de autores e transações corporativas da plataforma.
- [x] **6.4. Assinatura VIP / Premium da Plataforma (~R$ 23 / 30 dias):**
  - Ativação via `POST /api/monetization/vip/subscribe`.
  - Remoção de 100% dos anúncios para o assinante em toda a plataforma.
  - Badge VIP cosmético de apoiador da plataforma.
  - **Zero Loja:** Sem venda de produtos físicos, sem estoque e sem descontos de loja.
  - **Proteção ao Criador:** O VIP da plataforma **NÃO dá acesso antecipado** aos capítulos exclusivos de membros de autores (o criador mantém 100% do controle do seu fã-clube).

**Critério de Conclusão da Fase 6:** Testes unitários do ledger comprovando cálculo exato do split de 17%/83%, prevenção de double spending, idempotência estrita e ativação de status VIP com desativação total de anúncios. (CONCLUÍDO)

---

## FASE 7: Roadmap do App Mobile & Leitura Offline Segura
**Objetivo:** Desenvolver o aplicativo móvel reutilizando 100% do backend atual (API REST em Spring Boot + PostgreSQL + MongoDB), com sandbox local para leitura offline de assinantes VIP.

- [ ] **7.1. Reutilização de API (Zero retrabalho de backend):**
  - O mesmo backend e banco atendem Web e Mobile via JSON e tokens JWT/Bearer.
- [ ] **7.2. Leitura Offline Segura no App (Exclusivo VIP):**
  - Armazenamento encapsulado e criptografado na sandbox do aplicativo (sem acesso por USB ou exportação para PC).
  - Bloqueio de capturas de tela e gravação com `FLAG_SECURE` nativo no Android e visualização protegida no iOS para prevenir vazamento e pirataria.
  - O usuário só pode baixar offline os capítulos que já tem permissão de leitura (capítulos públicos ou de criadores dos quais é membro).


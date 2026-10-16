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
  - Suíte completa de 20 testes automatizados no backend cobrindo bypass de 2FA, força bruta, hash BCrypt, integridade de storage e validação de sessão.

**Critério de Conclusão da Fase 2:** Testes unitários e de integração cobrindo tentativa de bypass de 2FA, rejeição de mass assignment e login completo com código da Dev Outbox rodando e passando 100%. (CONCLUÍDO)

---

## FASE 3: Perfis, Visibilidade Autoritativa, Biblioteca e LGPD
**Objetivo:** Implementar o perfil público/privado de leitor, a página pública do criador, a biblioteca pessoal e os mecanismos de privacidade previstos pela LGPD.

- [ ] **3.1. Perfil do Leitor (Público vs Privado) e LGPD:**
  - Leitor pode alternar entre perfil PÚBLICO ou PRIVADO.
  - Se privado, o servidor bloqueia o acesso de terceiros à sua biblioteca e histórico (HTTP 403 / IDOR prevention).
  - Implementação dos direitos do titular da LGPD: endpoint de download dos próprios dados (portabilidade/Art. 18) e endpoint de exclusão de conta (direito ao esquecimento).
- [ ] **3.2. Perfil Público Obrigatório do Criador:**
  - Acessível por `/@handle` único.
  - Campos: Nome, Bio pública, links sociais permitidos e foto de perfil.
  - Dados sensíveis (CPF e chave PIX) criptografados com AES-256 no banco e **estritamente omitidos** de qualquer resposta pública da API.
- [ ] **3.3. Biblioteca do Usuário e Marcador de Leitura:**
  - Usuário curte/descurte obras adicionando à sua biblioteca.
  - Integração com o marcador de progresso de leitura.

**Critério de Conclusão da Fase 3:** Testes automatizados verificando que perfil privado não vaza dados, que CPF/PIX nunca aparecem em DTOs públicos e que a exclusão de conta respeita a LGPD.

---

## FASE 4: Publicação, Leitor, Early Access e Moderação Anti-Pirataria
**Objetivo:** Permitir publicação de capítulos originais, leitura fluida, bloqueio estrito de acesso antecipado e moderação de conteúdo (anti-pirataria e anti-hentai).

- [ ] **4.1. Publicação de Obras e Capítulos Originais:**
  - Criador cadastra obra (título, sinopse, capa, gêneros).
  - Declaração obrigatória de autoria original na publicação.
  - Upload de capítulos com definição da data pública (`publicReleaseAt`).
- [ ] **4.2. Módulo de Denúncias e Moderação Anti-Pirataria/Anti-Pornografia:**
  - Endpoint para envio de denúncia (`/api/reports`) com motivos: Violação de Direitos Autorais (pirataria de obras conhecidas como Bleach, Naruto, etc.), Conteúdo Pornográfico/Hentai, Abuso ou Plágio.
  - Fila de moderação com capacidade de suspensão cautelar da obra e banimento do autor.
- [ ] **4.3. Leitor de Mangá (Webtoon / Scroll):**
  - Leitura acessível, responsiva e com foco na arte.
  - Páginas servidas pelo `FileStorageService` local com cache adequado.
- [ ] **4.4. Progresso de Leitura em Tempo Real no MongoDB:**
  - Gravação rápida a cada virada de página em `reading_progress` no MongoDB sem sobrecarregar o PostgreSQL.
- [ ] **4.5. Bloqueio Autoritativo de Early Access no Servidor:**
  - Se `now < publicReleaseAt` e o leitor não for membro ativo do autor, o backend bloqueia o retorno das imagens (HTTP 403).

**Critério de Conclusão da Fase 4:** Teste de leitura validando que usuário não-membro recebe 403 em capítulo antecipado, que o progresso é salvo no MongoDB e que denúncias de pirataria acionam suspensão da obra.

---

## FASE 5: Descoberta, Algoritmo e Gamificação por Seasons
**Objetivo:** Implementar o algoritmo de recomendação e o sistema de missões dinâmicas e Seasons para criadores.

- [x] **5.1. Algoritmo de Ranking no Servidor (`RecommendationAlgorithmService`):**
  - Fórmula: $Score = (BaseOrgânica + Recência) \times Decaimento \times Qualidade \times BoostMissão$.
  - Bônus de recência para novos lançamentos (< 24h: +220 pts).
- [ ] **5.2. Cache e Sincronização do Feed no MongoDB:**
  - Job agendado que processa o catálogo e alimenta `feed_works` no Mongo para respostas em < 15ms.
  - Endpoints de feed: `/api/feed?sort=recommended`, `/api/feed/trending`, `/api/feed/fresh` com filtros por gênero.
- [ ] **5.3. Sistema de Seasons e Missões para Criadores:**
  - **Temporadas de 60 dias**:
    - **Nível 1 (Estreante):** Perfil completo + 1º capítulo publicado -> **Boost de 24h de leve foco no feed**.
    - **Nível 2 (Em Ascensão):** 3 capítulos publicados + 100 leituras -> **Boost de 48h no feed** + Badge cosmético de "Criador da Temporada".
    - **Nível 3 (Destaque Editorial):** Consistência quinzenal + resposta a comentários em até 48h -> **Boost de 72h no feed** + Destaque no Banner Hero principal por 1 semana.
    - **Nível 4 (Mestre da Temporada):** Retenção > 75% -> **Taxa da plataforma cai temporariamente de 17% para 10%** (criador recebe 90% das doações por 15 dias) + Destaque fixo de autor.
  - Missões semanais auditadas diretamente pelo backend (consistência de lançamento, resposta a leitores e retenção de páginas).

**Critério de Conclusão da Fase 5:** Testes unitários do algoritmo validando decaimento temporal, cálculo de missões semanais e concessão automática dos boosts de 24h/48h no feed.

---

## FASE 6: Monetização Digital Justa (Sem Loja Física)
**Objetivo:** Implementar a divisão financeira digital (17% plataforma / 83% criador), simulação de anúncios e assinatura VIP global.

- [ ] **6.1. Doações e Clube de Membros (`Membership` do Criador):**
  - Doações avulsas com split: 83% autor / 17% plataforma.
  - Assinaturas de membros: Faixas de R$ 7,99 a R$ 45,99 definidas pelo autor com split 83%/17% (libera capítulos em Early Access do autor).
- [ ] **6.2. Anúncios no Leitor:**
  - Gatilho a cada 30 páginas lidas com split de 58% para o criador e 42% para a plataforma.
- [ ] **6.3. Ledger Financeiro Append-Only e Adaptador Sandbox:**
  - Registro imutável de transações com controle de concorrência e idempotência.
  - Adaptador sandbox do Mercado Pago para testes locais sem credenciais reais.
- [ ] **6.4. Assinatura VIP / Premium da Plataforma (~R$ 23 / 30 dias):**
  - Remoção de 100% dos anúncios para o assinante em toda a plataforma.
  - Badge VIP cosmético de apoiador da plataforma.
  - **Zero Loja:** Sem venda de produtos físicos, sem estoque e sem descontos de loja.
  - **Proteção ao Criador:** O VIP da plataforma **NÃO dá acesso antecipado** aos capítulos exclusivos de membros de autores (o criador mantém 100% do controle do seu fã-clube).

**Critério de Conclusão da Fase 6:** Testes unitários do ledger comprovando cálculo exato do split de 17%/83%, prevenção de double spending, idempotência estrita e ativação de status VIP.

---

## FASE 7: Roadmap do App Mobile & Leitura Offline Segura
**Objetivo:** Desenvolver o aplicativo móvel reutilizando 100% do backend atual (API REST em Spring Boot + PostgreSQL + MongoDB), com sandbox local para leitura offline de assinantes VIP.

- [ ] **7.1. Reutilização de API (Zero retrabalho de backend):**
  - O mesmo backend e banco atendem Web e Mobile via JSON e tokens JWT/Bearer.
- [ ] **7.2. Leitura Offline Segura no App (Exclusivo VIP):**
  - Armazenamento encapsulado e criptografado na sandbox do aplicativo (sem acesso por USB ou exportação para PC).
  - Bloqueio de capturas de tela e gravação com `FLAG_SECURE` nativo no Android e visualização protegida no iOS para prevenir vazamento e pirataria.
  - O usuário só pode baixar offline os capítulos que já tem permissão de leitura (capítulos públicos ou de criadores dos quais é membro).


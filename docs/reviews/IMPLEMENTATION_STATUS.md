# Estado e handoff de implementação

**Última retomada:** 2026-10-16 (passe 13 — guard de páginas de capítulo resolvido por relação indexada `chapter_files`, migração V4 com backfill). Este arquivo é um handoff de trabalho, não histórico imutável. Revalide os comandos antes de depender destes resultados.

## Release v1.0.0 (Fase 9.2 — concluída)

- Merge oficial `develop` ➔ `main` via **PR #2**; `main` @ `e7aefec` (árvore idêntica a `develop`, `git diff` vazio — sem divergência de conteúdo).
- Tag anotada **`v1.0.0-release`** publicada em `origin` (aponta para `e7aefec`).
- Gate de release: `mvn test` no commit liberado ➔ **111 testes verdes**, `BUILD SUCCESS`.
- Escopo do commit `46edd46`: backend + frontend + docs rastreados (`README.md`, `AGENTS.md`, `docs/PLANO_DE_FASES.md`, `docs/PROMPT_ANTIGRAVITY.md`), 100 arquivos.
- **Mantidos locais (fora do git remoto):** `docs/reviews/**`, `docs/skills/**`, `.opencode/agents/**`, `opencode.jsonc`.
- Observação (pré-existente, **não** introduzida neste release): `application.yml` versionado carrega a chave AES de fallback de desenvolvimento e a senha default do Postgres — candidato a remoção/rotação, fora do escopo atual.

## Cobertura de integração (Testcontainers) — passe 8 (revisado no passe 9)

- `backend/src/test/java/com/manganetworking/integration/FeedSyncIntegrationTest.java`: sobe **PostgreSQL 16 + MongoDB 7 efêmeros** (`@Testcontainers`) e cobre **4 cenários**: (a) OSIV desligado no contexto real; (b) sync de feed em `afterCommit` no cadastro de obra; (c) publicação de capítulo atualiza o feed (último capítulo + early access); (d) `syncAllWorksToFeed` fora de requisição web sem `LazyInitializationException`; (e) suspensão por moderação remove a obra do feed no `afterCommit`.
- `backend/pom.xml`: dependências `org.testcontainers:{junit-jupiter,postgresql,mongodb}` (test) e **`api.version` parametrizado** (`${docker.api.version}`, default `1.44`) no surefire — overridável com `mvn -Ddocker.api.version=... test`.
- **Achado de ambiente:** o docker-java assume API `1.24`; o Docker Engine 29+ exige ≥ `1.44` → o `/info` responde **HTTP 400** e o Testcontainers não encontra o daemon. Corrigido via system property `api.version` (a variável de ambiente `DOCKER_API_VERSION` **não** é lida pelo docker-java).
- Verificação: `mvn test` → **116 testes** (111 unit/slice + 1 moderação + 4 integração), 0 falhas, com Docker ativo; sem daemon Docker os 4 de integração são ignorados (`disabledWithoutDocker = true` → `Skipped`).
- Commitado/pushado em **`37d2d75`** (`origin/develop`); as correções do passe 9 abaixo ainda são **locais**.

## Passe 9 — revisão das últimas 2 rodadas (2026-10-16)

Escopo revisado: o que as rodadas de release + Testcontainers tocaram (`backend/pom.xml`, `FeedSyncIntegrationTest.java`, docs) e, por achado da revisão, `ModerationApplicationServiceTest.java`. Revisão cruzada (principal + subagente `review` independente). Correções aplicadas:

- **Teste que não provava o comportamento (corrigido):** o cenário de `syncAllWorksToFeed` chamava a reindexação com o documento **já existente** (criado no `afterCommit` do cadastro), então passava mesmo se a reindexação não fizesse trabalho. Agora o teste **apaga o documento antes**, confirma ausência, reindexa e confirma presença + `authorHandle` (resolução da associação LAZY do autor sem OSIV).
- **Ponta fechada — o outro `afterCommit` (moderação):** adicionado cenário de integração `suspendWork_removesWorkFromFeedAfterCommit` (status `suspended` no Postgres + documento ausente no Mongo). No unitário `ModerationApplicationServiceTest`: `shouldSuspendWorkAndResolveReports` agora verifica `deleteByWorkId`, e há novo teste `shouldDeferFeedRemovalToAfterCommit` provando o **adiamento** (nada removido dentro da transação; removido ao disparar `afterCommit`).
- **Portabilidade:** `api.version` estava fixo em `1.44`; virou propriedade Maven `${docker.api.version}` (default `1.44`), para não recusar daemons com API < 1.44.
- **Convenção:** `@DisplayName` adicionado aos métodos (padrão do repositório) e nota explícita na classe de que **não** se deve adicionar `@Transactional` (postergaria o commit e quebraria as asserções de `afterCommit`).
- **Erro transitório de compilação** (introduzido e corrigido no próprio passe): `new MongoDBContainer<>()` — a classe não é genérica.
- **Achados pré-existentes NÃO corrigidos aqui** (registrados como próximos passos no `PLANO_DE_FASES.md`, pois mudam comportamento e merecem teste próprio): `syncAllWorksToFeed` reinsere obras suspensas em `feed_works`; `FeedApplicationService.getFeed` pagina antes de filtrar suspensas.
- Verificação do passe: `cmd /c mvn test` → **BUILD SUCCESS**, `Tests run: 116, Failures: 0, Errors: 0, Skipped: 0` (Docker Desktop 29.7.2 ativo; parado ao final).

## Passe 10 — coerência funcional do feed (P1 do backlog, 2026-10-16)

Fechamento das duas pendências **P1** registradas no `PLANO_DE_FASES.md`, herdeiras do trabalho de feed/`afterCommit` dos passes 8-9.

- **`syncWorkToFeed` deixou de ressuscitar obra suspensa.** Antes, a reindexação agendada (`syncAllWorksToFeed`) recriava o documento que a moderação removia no `afterCommit`; a invariante "obra suspensa não existe no feed" ficava só no filtro de leitura. Agora `RecommendationAlgorithmService.syncWorkToFeed` detecta `status = suspended`, chama `deleteByWorkId` e retorna `null` (documentado). Cobre o job periódico **e** a publicação de capítulo pelo próprio autor.
- **Feed público pagina corretamente.** `FeedApplicationService` consultava o Mongo com `Pageable` e filtrava suspensas **em memória**, devolvendo páginas com menos itens que `size`. Agora a exclusão é feita **na consulta** (`status != suspended` → novos métodos `findAllByStatusNotOrderBy...` em `WorkFeedMongoRepository`), preservando o tamanho da página; o filtro em memória permanece como defesa extra contra variação de caixa.
- **Testes:** `RecommendationAlgorithmServiceTest` (+2: remoção da suspensa e não-ressurreição na reindexação, com `never().save`), `FeedApplicationServiceTest` (reescrito: exclusão na consulta nas ordenações e no gênero + defesa em memória) e `FeedSyncIntegrationTest` (+2: recálculo não ressuscita suspensa; página preenchida mesmo com documento suspenso no topo do ranking).
- Verificação: `cmd /c mvn test` → **BUILD SUCCESS**, `Tests run: 123, Failures: 0, Errors: 0, Skipped: 0` (FeedSyncIntegrationTest 6/6 com Docker 29.7.2 ativo; parado ao final).
- **Backlog restante (não iniciado):** DTOs para read-models NoSQL, `@TransactionalEventListener(AFTER_COMMIT)`, guard por relação `file→capítulo`, store distribuído de sessão/rate-limit, segredos em variáveis de ambiente, paleta do frontend, PR `develop`→`main`.

## Passe 11 — sync de feed via `@TransactionalEventListener(AFTER_COMMIT)` (2026-10-16)

Troca do adiamento manual (`TransactionSynchronizationManager`) pelo idioma do Spring, removendo a dependência implícita do contexto de persistência na fase `afterCommit`.

- **Antes:** `WorkApplicationService`/`ModerationApplicationService` registravam `TransactionSynchronization` na mão e, em `afterCommit`, a sessão JPA ainda estava aberta — o sync contava com isso para resolver a associação LAZY do autor (OSIV desligado).
- **Agora:** os serviços apenas publicam eventos (`WorkFeedSyncEvent`, `WorkFeedRemovalEvent`); `FeedSynchronizationListener` os trata com `@TransactionalEventListener(phase = AFTER_COMMIT, fallbackExecution = true)`. A materialização abre a própria transação (`RecommendationAlgorithmService.syncWorkById`), logo não depende de a sessão da requisição continuar viva.
- **Dependências removidas:** `WorkApplicationService` deixou de depender de `RecommendationAlgorithmService`; `ModerationApplicationService` deixou de depender de `WorkFeedMongoRepository`. Cada serviço agora só publica o evento (o listener é o único ponto que escreve no Mongo).
- **Testes:** novo `FeedSynchronizationListenerTest` (5: delegação por id, tolerância a falha na sync e na remoção, e verificação reflexiva de `AFTER_COMMIT` + `fallbackExecution`); `WorkApplicationServiceTest` (publica o evento no cadastro e na publicação de capítulo — o teste antigo de `TransactionSynchronizationManager` foi substituído); `ModerationApplicationServiceTest` (verifica a publicação do evento de remoção); `RecommendationAlgorithmServiceTest` (+2 para `syncWorkById`). O `FeedSyncIntegrationTest` (Testcontainers) **valida o novo mecanismo ponta a ponta** (commit real → listener → Mongo).
- Verificação: `cmd /c mvn test` → **BUILD SUCCESS**, `Tests run: 129, Failures: 0, Errors: 0, Skipped: 0` (Docker Desktop 29.7.2; parado ao final).
- **Commit:** os passes 10 e 11 foram publicados em `origin/develop` no commit **`a12e52e`** (15 arquivos, +474/−198). `docs/reviews/**`, `docs/skills/**`, `.opencode/**` e `opencode.jsonc` continuam locais.

## Passe 12 — DTOs de apresentação para os read-models NoSQL (2026-10-16)

Fechamento do item "Consistência de camadas" (era o #1 do backlog). Antes, endpoints públicos devolviam o próprio modelo de persistência do MongoDB (anotações `@Document`/`@Id`/`@Indexed` vazando para a camada de apresentação).

- **Escopo real (levantado antes de mexer):** `WorkFeedDocument` era exposto por `GET /api/feed`, `/api/feed/trending` e `/api/feed/fresh`; `ReadingProgressDocument` pelo histórico (`GET /api/users/reading-progress`) e pela **exportação LGPD** (`UserDataExportDto.readingHistory`). `TrackPageResponseDto` já era DTO e **não** foi tocado.
- **Antes → agora:** `FeedApplicationService`/`FeedController` devolvem `List<FeedWorkResponseDto>`; `UserProfileApplicationService`/`UserProfileController` devolvem `List<ReadingProgressResponseDto>`; `UserDataExportDto.readingHistory` passou a `List<ReadingProgressResponseDto>`. O modelo Mongo permanece só na persistência (`@Document`), com mapeamento estático `from(...)`.
- **Contrato JSON preservado (Ponto crítico):** os DTOs são *records* com **os mesmos nomes de campo** do documento (`isLatestChapterIsEarlyAccess`→`latestChapterIsEarlyAccess`, `isFreshRelease`→`freshRelease`), então o que o frontend recebe é idêntico. Em vez de confiar nisso na leitura, há **teste de contrato** que serializa o documento e o DTO com o mesmo `ObjectMapper` e compara as **árvores JSON** (`FeedWorkResponseDtoTest`, `ReadingProgressResponseDtoTest` — 3 testes): qualquer campo renomeado/adicionado/removido quebra o teste.
- **Testes ajustados ao novo tipo:** `FeedApplicationServiceTest` (extrai `workId` do DTO) e `FeedSyncIntegrationTest` (`extracting(FeedWorkResponseDto::workId)`); o slice `UserProfileIdentityTest` e o `UserProfileLgpdTest` não mudaram (a assinatura e os acessores usados continuam iguais).
- **Verificação:** `cmd /c mvn test` → **BUILD SUCCESS**, `Tests run: 132, Failures: 0, Errors: 0, Skipped: 0` (Docker Desktop 29.7.2 ativo; `FeedSyncIntegrationTest` 6/6; Docker parado ao final). Sem daemon Docker, os 6 de integração são ignorados e a suíte roda `Tests run: 132, Skipped: 6`.
- **Estado:** publicado em `origin/develop` no commit **`f948996`** (12 arquivos, +285/−38).

## Passe 13 — guard de páginas de capítulo por relação indexada (2026-10-16)

Fechamento do item #1 do backlog ("Performance do guard"). Antes, `ChapterFileAccessGuard.evaluate(filename)` fazia `chapterRepository.findFirstByPagesJsonContaining(filename)` → `chapters.pages_json LIKE '%arquivo%'`: **varredura completa da tabela a cada imagem do leitor** e **falso positivo de substring** (ex.: `a.png` casando com `x-a.png`).

- **Diagnóstico antes de mudar:** o `pages_json` guarda **URLs** (`/api/storage/<arquivo>` — confirmado em `CreatorWorkspacePage` → `storageApi.uploadBatch` → `pages: results.map(r => r.url)`), enquanto o guard recebe o **nome do arquivo** da rota `GET /api/storage/{filename}`. Era isso que forçava o `LIKE`.
- **Antes → agora:** nova tabela `chapter_files(id, chapter_id → chapters ON DELETE CASCADE, filename UNIQUE, position)`, com **migração `V4__chapter_files.sql`** e backfill dos capítulos existentes (normaliza URL→nome, descarta query string, ignora `pages_json` malformado com `WARNING` sem abortar a migração). O guard passa a fazer `chapterFileRepository.findByFilename(filename)` (**igualdade no índice único**) e depois `chapterRepository.findById(...)`. `ChapterRepository.findFirstByPagesJsonContaining` foi **removido** (não sobrou caminho com `LIKE`).
- **Normalização em um único ponto:** `StorageFileNames.fromPageToken(...)` (`util/`) faz URL→nome (aceita `/api/storage/`, `/api/uploads/` e o nome puro; descarta `?query`/`#fragmento`), usada por `WorkApplicationService.createChapter` ao gravar as linhas — e **replicada de forma idêntica no SQL de backfill**, para que dados antigos e novos tenham a mesma representação.
- **Defesa nova:** `filename` é único **na tabela inteira** (é o que garante busca sem ambiguidade no guard). Página repetida no mesmo capítulo seria uma violação de restrição (500), então `registerChapterFiles` deduplica usando o conjunto já registrado; o `pages_json` do leitor continua intacto.
- **Falha fechada:** referência órfã (linha em `chapter_files` sem capítulo) nega e marca como privado, em vez de liberar. Não deveria ocorrer (`ON DELETE CASCADE`), mas o guard não assume isso.
- **Verificação da migração:** aplicada num **Postgres 16 descartável** (não no DB de dev, para não queimar o checksum do V4 caso fosse preciso ajustar): V1→V4 aplicam limpas; com capítulos semeados o backfill produziu `aaa.png`(0), `bbb.jpg`(1, query descartada), `ccc.webp`(2); `[]` → nenhuma linha; objeto JSON e JSON inválido → apenas `WARNING`, sem abortar; `uq_chapter_files_filename` bloqueia duplicata; `filename = 'capa-aaa.png'` retorna 0 (sem casamento por substring).
- **Testes:** `ChapterFileAccessGuardTest` reescrito para a nova relação (**11**: inclui igualdade exata sem falso positivo, órfã fail-closed e `privateContent`), `WorkApplicationServiceTest` (+2: normalização URL→nome e deduplicação), novo `StorageFileNamesTest` (**6**) e novo `ChapterFileAccessIntegrationTest` (**2**, Testcontainers: fecha a lacuna que unitário não cobre — mapeamento JPA da tabela nova bate com o DDL, `createChapter` grava as linhas e o guard lê pelo índice real).
- **Verificação:** `cmd /c mvn test` → **BUILD SUCCESS**, `Tests run: 144, Failures: 0, Errors: 0, Skipped: 0` (Docker Desktop 29.7.2; integração 8/8). Sem daemon Docker, os 8 de integração são ignorados.
- **Atenção operacional:** a V4 é aplicada no primeiro boot com Postgres. Como toda migração já aplicada, **não editar** o arquivo depois (quebra o checksum); qualquer ajuste exige nova migração. A V4 é aditiva e idempotente (`CREATE TABLE IF NOT EXISTS` + `ON CONFLICT DO NOTHING`).

## Passe 14 — higiene de segredos e variáveis de ambiente (2026-10-16, commit `58ffd71`)

- **Remoção de segredos versionados:** valores padrão de senhas e chaves foram removidos de `application.yml` (`password: ${SPRING_DATASOURCE_PASSWORD:}` e `aes-secret-key: ${AES_SECRET_KEY:}`).
- **Documentação de produção:** criação de `.env.example` e `README_SECRETS.md` com instruções completas para geração de chave AES de 256 bits (`openssl rand -base64 32`) e rotação de credenciais.
- **Docker Compose:** fallback seguro explícito apenas para desenvolvimento local (`POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:manga_dev_local_secure_2026}`).

## Passe 15 — ponte Spring/JPA para AES e fail-fast em produção (2026-10-17)

Fechamento do achado diagnosticado na retomada ("o conversor JPA ignora o `application.yml`, criando configuração morta e sem fail-fast real em produção"):

- **Diagnóstico:** Como `AesCryptoConverter` é instanciado diretamente pelo provedor JPA (Hibernate) via reflexão e não gerenciado como bean Spring, ele lia apenas `System.getenv()` ou `System.getProperty()`, ignorando a propriedade tipada `platform.security.aes-secret-key` mapeada pelo Spring Boot em `PlatformProperties`. Além disso, se nenhuma chave fosse fornecida em ambiente produtivo, o sistema apenas emitia um aviso no log e continuava usando a chave padrão de desenvolvimento.
- **Solução implementada:** `PlatformProperties` agora injeta o Spring `Environment` e, em seu `@PostConstruct`, configura autoritativamente `AesCryptoConverter.setCustomKey(key)` usando o valor resolvido pelo Spring.
- **Fail-Fast em Produção:** Se o perfil ativo for `prod` e a chave secreta AES não estiver definida (ou vazia), `PlatformProperties` aborta a inicialização lançando `IllegalStateException`, impedindo que a aplicação suba em produção com chaves fracas/inseguras.
- **Testes novos:** `PlatformPropertiesTest` (4 testes: configuração da chave customizada, fail-fast no perfil `prod`, tolerância em ambiente `dev`/default com fallback, e consistência percentual 17% + 83% = 100%).
- **Verificação:** `cmd /c mvn test` → **BUILD SUCCESS**, `Tests run: 148, Failures: 0, Errors: 0, Skipped: 8` (8 de integração ignorados sem daemon Docker).

## Contexto

Trabalho interrompido da Fase 7 (upload real + backoffice de moderação), com trilha parcial do manifesto de leitura offline (Fase 8). Alvo: fechar as pontas com segurança server-side, injeção por construtor, contratos alinhados e testes verdes.

## O que foi corrigido nesta retomada

### Bloqueador de inicialização (crítico)

- Existiam duas classes `@Service` com o mesmo nome simples `RecommendationAlgorithmService`
  (`com.manganetworking.algorithm` e `com.manganetworking.service.recommendation`). Mesmo nome simples ⇒ mesmo nome de bean
  ⇒ `ConflictingBeanDefinitionException` na subida da aplicação.
- Consolidado em `service/recommendation/RecommendationAlgorithmService` (fórmula do plano: base orgânica + recência ×
  decaimento × qualidade × boost) com o job `@Scheduled` preservado; a duplicata em `algorithm/` (sem uso) foi removida.

### Clean code / clean architecture

- Injeção por construtor (era `@Autowired(required=false)` em campo) em `WorkApplicationService` e
  `ModerationApplicationService`; falha de sincronização com Mongo passa a ser logada (`warn`) em vez de engolida em silêncio.
- Mapeamento de `PendingReportResponseDto` saiu do `ReportController` para o service.
- `MobileOfflineController` deixou de aceitar header de usuário; identidade apenas pela sessão.

### Segurança (identidade por header em rota pública)

- `GET /api/works/{slug}/chapters/{n}` (`permitAll`) usava `X-Current-User-Id`: um anônimo podia informar o UUID de um membro
  e **burlar o Early Access**. Agora a identidade vem somente da sessão.
- `POST /api/works` e `POST /api/works/{id}/chapters` usavam `X-Creator-Id`: um leitor autenticado podia **se passar por criador**.
  Agora exigem `SecurityContextUtils.requireCurrentCreatorId()` (sessão de criador) e `hasRole('CREATOR')` no `SecurityConfig`.
- `POST /api/reports` (`permitAll`) usava `X-Current-User-Id` para o denunciante; agora vem da sessão (anônimo quando ausente).
- Upload: `FileStorageController` usa `StoredFileResponseDto`, rejeita arquivo/lote vazio e limita o lote a 300 arquivos;
  limites de multipart em `application.yml` (15MB/arquivo, 200MB/requisição) antes de materializar bytes em memória.
- Sessão: `isModerator` agora é exposto em `/auth/2fa/verify` (`AuthSessionResponseDto`) e em `/auth/me`.

### Contratos frontend ↔ backend

- Campo morto `earlyAccessForMembers` removido do DTO e do payload (o acesso antecipado é derivado de `publicReleaseAt`).
- `publicReleaseAt` passa a ser enviado como `LocalDateTime` (sem `Z`) via helper `frontend/src/utils/datetime.ts`,
  corrigindo a desserialização do Jackson.
- `storageApi` refatorado para helper único com `credentials: 'include'`.
- `VipModal`: texto de "Pronto para Leitura Offline" ajustado para "em breve", coerente com a Fase 8 ainda parcial.

### Testes

- Atualizados `WorkApplicationServiceTest`, `ModerationApplicationServiceTest`, `AuthControllerTest`, `SecurityContextUtilsTest`.
- Adicionado `RecommendationAlgorithmServiceTest` (decaimento temporal, qualidade de engajamento, bônus de recência).

## Verificações executadas (2026-10-16)

- `backend`: `cmd /c mvn test` → **BUILD SUCCESS**, `Tests run: 74, Failures: 0, Errors: 0, Skipped: 0`.
- `frontend`: `npm run build` (tsc + vite) → **passou**.
- `git diff --check` → sem erros de whitespace (apenas avisos LF/CRLF do Git no Windows).
- Varredura de nomes simples duplicados em `backend/src/main/java` → nenhuma outra colisão de bean.
- Varredura de `getAuthToken|setAuthToken|manganetworking_token|Bearer` no `frontend/src` → apenas um comentário remanescente.

## Execução do passe P0/P1/P2 (2026-10-16)

### P0 — Segurança (fechado)

- `GET /api/creators/workspace`: saiu do `permitAll`. No `SecurityConfig`, `GET /api/creators/workspace` exige `hasRole('CREATOR')` e vem **antes** do `permitAll` de `GET /api/creators/**` (primeiro match vence). O controller passou a usar `SecurityContextUtils.requireCurrentCreatorId()` (sessão), sem `X-Creator-Id`.
- Writes do `CreatorController` (`PUT /profile`, `PUT /membership-price`, `POST /workspace/missions/{id}/claim`): `requireCurrentCreatorId()` + `hasRole('CREATOR')` nos matchers `PUT`/`POST /api/creators/**`.
- **Storage**: novo `ChapterFileAccessGuard` aplicado no `FileStorageController.getFile`. Resolve a página → capítulo (`ChapterRepository.findFirstByPagesJsonContaining`) e decide:
  - arquivo sem capítulo (capa/banner/avatar) → público;
  - capítulo em early access → exige assinatura ativa do autor (ou o próprio autor);
  - obra suspensa → apenas autor e moderação.
  A URL opaca deixou de ser o único controle. **Ressalva de desempenho:** a checagem faz um `LIKE` por imagem; avaliar índice/coluna dedicada ou cache em catálogos grandes.
- **Sessão**: removidos `authToken`/`setAuthToken`/`getAuthToken` e o `Authorization: Bearer` de `client.ts` e `storageApi`; `request` e o multipart usam `credentials: 'include'`. `authApi.logout()` passou a chamar `POST /auth/logout`.
- **CSRF**: mantido desabilitado por decisão documentada (cookie `SameSite=Lax`, escritas em `POST/PUT/DELETE`, uso same-site via proxy). Só revisitar se o frontend for servido de origem distinta.

### P1 — Fase 7 E2E (quase fechada)

- `workApi.readChapter` corrigido para a rota real `GET /api/works/{slug}/chapters/{chapterNumber}` (antes chamava `/read`, inexistente) e `getWorkBySlug` adicionado; DTOs tipados (`WorkDetailsDto`, `ChapterSummaryDto`, `ChapterReadDto`, `FeedWorkDto`).
- Novos `frontend/src/utils/apiMappers.ts` (mapeamento DTO → tipos) e `frontend/src/hooks/useCatalogWorks.ts` (feed real com fallback mock).
- `ReaderPage` carrega `pagesJson` da API (fallback `chapter.pages`; HTTP 403 → aviso de acesso antecipado).
- `WorkDetailPage` busca a obra/capítulos reais por slug (fallback mock) e usa o autor da API quando disponível.
- `HomePage`/`CatalogPage` usam o feed real; `App.handleNavigateChapter` resolve o próximo capítulo pela API com fallback.

### P2 — Testes

- `CreatorApplicationServiceTest` (5 casos): missão inexistente, ownership, já resgatada, incompleta, boost aplicado + avanço de nível.
- `ChapterFileAccessGuardTest` (9 casos) e `FileStorageControllerTest` (404/403/200).
- `RecommendationAlgorithmServiceTest`: +2 casos de boost de Season (multiplicação e teto de 2.5x).

## Riscos / pontas conhecidas (remanescentes)

- **Sem infra de teste de contexto Spring** (`@SpringBootTest`/`@DataJpaTest`). A matriz de autorização do `SecurityConfig` e a transição de status do backoffice são garantidas por configuração/`@PreAuthorize`, mas **não têm teste automatizado** (401/403/200).
- **Upload E2E sem teste**: o fluxo multipart → arquivo persistido não tem teste ponta a ponta (só entrega/404/403 do controller).
- **Fallback de identidade por header** continua em `UserProfileController` e `MonetizationController`. Essas rotas exigem sessão (`anyRequest().authenticated()`), então o fallback é inerte na prática; revisar por consistência.
- **Storage — desempenho**: `ChapterFileAccessGuard` faz consulta `LIKE` por imagem; migrar para relação dedicada (file → capítulo) + cache.
- **Frontend — UX de demonstração**: capas/avatares e a barra "SOBRE O CRIADOR" ainda podem cair em dados mock quando a obra não existe no banco; o autor real é usado para doação/membros quando a API retorna o `author`.
- **Leitura offline (Fase 8)**: só manifesto + contrato; `encryptionKeyId` é UUID sem gestão de chave real. App nativo fora do escopo do repositório.
- **Paleta**: `#E63946`/`text-white` divergem de `--color-red: #E8402F` do `global.css` e aparecem em arquivos antigos; ajuste de identidade visual fica para a trilha de frontend.

## Próximos passos priorizados (após este passe)

- **P2 (restante):** ✅ Fechado no passe 3 (`BackofficeAuthorizationTest`, `FileStorageUploadTest`, `UserProfileIdentityTest`) com infra de slice `@WebMvcTest` + `spring-security-test` (sem exigir DB).
- **P3 — Fases 8/9:** app nativo offline (fora do repositório) e smoke E2E + merge (depende de Docker/DB; não executável no ambiente atual).
- **Antes de qualquer commit:** rodar o subagente `review` (`code-review`) sobre o diff completo (55+ arquivos locais não commitados) — iniciado no passe 5.

**Sequência sugerida:** revisão do diff → commit local → P3 (quando houver Docker/DB).

## Auditoria de contratos e correções (2026-10-16, passe 2)

Objetivo: calcular os próximos passos, verificar o que está falhando e corrigir. A verificação cruzou cada chamada do
frontend com a rota/DTO real do backend. Em vários pontos o frontend havia sido escrito contra uma API imaginária
(código morto ou 400/404 garantido).

### Falhas confirmadas e corrigidas

- **Auth — contrato divergente e código morto:** `authApi.login/verify2fa/register` nunca eram chamados.
  `verify2fa` enviava `{ challengeId, code }`, mas o backend espera `Verify2FaRequestDto { email, code }` (400 garantido);
  `register` enviava `role`/`twoFactorEnabled` em vez de `isCreator`/`handle`/`cpf` (400). Contratos agora espelham os DTOs.
- **Sessão nunca hidratada:** `AuthContext` fixava `CURRENT_USER` (mock, `isModerator: true`) e nunca chamava `/auth/me`.
  Agora hidrata a sessão na montagem (`refreshSession`), expõe `isAuthenticated` e mantém o mock como fallback quando não há sessão.
- **Login 100% simulado (setTimeout/OTP fixo):** `LoginPage` agora usa `authApi.login` → `2fa/verify` reais, com
  preenchimento do OTP via Dev Outbox (`GET /api/dev/outbox/latest`) em dev e fallback automático para demonstração quando o backend está indisponível.
- **Sem logout:** `Header` ganhou ação de sair (`authApi.logout` + volta ao feed).
- **Identidade em endpoint financeiro era forjável:** `DonateRequestDto.donorUserId` e `SubscribeMembershipRequestDto.subscriberUserId`
  vinham do corpo (violação de `SECURITY_REQUIREMENTS` — "não confiar em user IDs do navegador"). Removidos dos DTOs;
  `MonetizationController` resolve doador/assinante/VIP via `SecurityContextUtils.requireCurrentUserId()` (novo, com teste). O header `X-Current-User-Id` do VIP foi removido.
- **Endpoint de anúncio fantasma:** `monetizationApi.recordAdImpression` chamava `POST /api/monetization/ad/impression`, inexistente (404).
  O crédito de anúncio é server-side em `ReadingProgressService.trackProgress`; a chamada foi removida do `ReaderPage`.
  `getCreatorBalance` (rota inexistente, sem uso) → `getCreatorLedger` aponta para `GET /api/monetization/ledger/{creatorId}`.
- **Autor da obra com campos errados:** `AuthorSummaryDto` do frontend esperava `id/name/handle/avatarUrl`, mas o backend serializa
  `authorId/authorName/authorHandle/authorAvatarUrl`. Isso deixava o card "SOBRE O CRIADOR", a atribuição de doação e a checagem de associação vazios para obras reais. Corrigido no tipo, no `apiMappers` e no `WorkDetailPage`.
- **Gêneros descartados:** o backend envia gêneros pelo nome do enum (`ACAO`, `SCI_FI`), mas o `normalizeGenres` filtrava por rótulos de exibição (`Ação`, `Sci-Fi`) e descartava tudo. Agora mapeia enum → rótulo (aceitando ambos).

### Verificações do passe 2

- `backend`: `cmd /c mvn test` → **BUILD SUCCESS**, `Tests run: 76, Failures: 0, Errors: 0, Skipped: 0` (novos casos de `requireCurrentUserId`).
- `frontend`: `npm run build` → **passou**.
- Docker instalado, mas **daemon não está em execução** ⇒ smoke E2E com Postgres/Mongo segue indisponível.

### Pontas remanescentes do passe 2

- `LoginPage` cobre **login** real; **cadastro** (register) não tem tela — `roleIntent` é decorativo e não chama a API.
- `CreatorWorkspacePage` ainda inicia de `MOCK_CREATORS`; não consome `GET /api/creators/workspace` (Fase 7 pendente).
- `UserProfileController` mantém o fallback `X-Current-User-Id` (inerte, rotas autenticadas) — revisar por consistência.
- Login real não pôde ser exercitado ponta a ponta sem DB/daemon.

## Execução do passe 3 (2026-10-16): autorização, anti-IDOR, cadastro e workspace

Objetivo: atacar as pendências do passe 2 com "mão na obra". Foco em (a) fechar o P2 de testes com infra de
contexto Spring, (b) remover o resíduo de identidade por header, (c) entregar a tela de cadastro e (d) ligar o
workspace do autor ao servidor.

### P2 — Testes de autorização e upload (infra nova)

- **Infra de teste de contexto introduzida** (`@WebMvcTest` + `spring-security-test`, ambos com escopo de slice,
  sem exigir PostgreSQL/Mongo em execução):
  - `BackofficeAuthorizationTest` — matriz de moderação em `GET /api/reports/pending` e `POST /api/reports/moderate/suspend/{workId}`:
    anônimo → **401**, leitor → **403**, moderador → **200**. O papel é decidido no servidor (matriz do `SecurityConfig` +
    `@PreAuthorize`), não apenas escondido na UI.
  - `FileStorageUploadTest` — **E2E multipart real**: o `FileStorageService` verdadeiro (`LocalFileStorageService`) grava
    em diretório temporário; o teste envia uma imagem pelo controller, confere a persistência em disco e reentrega o arquivo
    via `GET /api/storage/{filename}` byte a byte. Cobre autorização (criador → 200, leitor → 403, anônimo → 401),
    lote de páginas, arquivo inexistente → 404 e página bloqueada pelo `ChapterFileAccessGuard` → 403.
  - `UserProfileIdentityTest` — **regressão anti-IDOR**: `DELETE /api/users/me` e `GET /api/users/reading-progress` usam o
    ID da sessão e **ignoram** um `X-Current-User-Id` forjado; principal sem sessão de usuário → 403.

### Segurança — identidade por header eliminada

- `UserProfileController` deixou de aceitar `X-Current-User-Id`: todas as rotas (perfil, biblioteca, progresso de leitura,
  exportação LGPD, exclusão de conta) resolvem a identidade via `SecurityContextUtils.requireCurrentUserId()`.
- `SecurityConfig` agora responde **401** para requisições anônimas (entry point explícito) e mantém **403** para
  credencial presente sem o papel exigido. Antes, o default do Spring Security devolvia 403 para ambos, o que
  confundia "não autenticado" com "sem permissão" no cliente da API.

### Fase 7 — Cadastro e workspace ligados ao servidor

- **Cadastro real no `LoginPage`**: alternância ENTRAR / CRIAR CONTA com nome, handle público (para criador) e escolha de
  papel (leitor/criador) que agora **é usada**: `authApi.register({ name, email, password, isCreator, handle })` →
  desafio 2FA → `2fa/verify` → sessão. Erros 4xx do servidor são exibidos; backend indisponível cai no modo demonstração.
- **`creatorApi`** novo (`frontend/src/api/creatorApi.ts`): `getWorkspace`, `getPublicProfile`, `updateProfile`,
  `updateMembershipPrice`, `claimMission` — alinhado a `CreatorController` e aos DTOs.
- **`CreatorWorkspacePage`** consome `GET /api/creators/workspace`: nome/handle, nível de monetização (patches),
  saldo, doações, membros ativos, preço da assinatura, boost ativo e missões da Season vêm do servidor. Salvar perfil/preço
  chama `PUT /api/creators/profile` e `PUT /api/creators/membership-price`; a demo permanece apenas como fallback explícito.
  Os valores fabricados de ganhos foram substituídos por dados autoritativos do servidor.

### Verificações do passe 3

- `backend`: `cmd /c mvn test` → **BUILD SUCCESS**, `Tests run: 91, Failures: 0, Errors: 0, Skipped: 0`
  (novos: `BackofficeAuthorizationTest`, `FileStorageUploadTest`, `UserProfileIdentityTest`).
- `frontend`: `npm run build` → **passou** (`tsc && vite build`).
- Docker instalado, mas **daemon não está em execução** ⇒ smoke E2E com Postgres/Mongo segue indisponível.

### Pontas remanescentes do passe 3

- Smoke E2E com stack real (Postgres/Mongo) e merge continuam bloqueados sem daemon Docker.
- Fase 8 (offline real) depende de app nativo, fora do escopo deste repositório; o manifesto do backend é o limite aqui.
- `CreatorWorkspacePage` ainda exibe placeholders de XP/Season (`340/500`, "23 dias") — o `/auth/me` não devolve XP da Season.

## Revisão do backend e hardening (2026-10-16, passe 4)

Revisão do backend inteiro (revisão independente por subagente + verificação `mvn test`) e correção dos achados.

### Bloqueador corrigido — vazamento do extrato financeiro

- `GET /api/monetization/ledger/{creatorId}` devolvia a entidade `FinancialLedgerEntity` serializada
  (com `creator` → CPF e chave PIX **decifrados** pelo `AesCryptoConverter`) para **qualquer** sessão
  autenticada, sem checagem de posse. Agora:
  - novo `LedgerEntryResponseDto` (sem `creator`/`user`/`paymentExternalId`);
  - criador resolvido pela sessão (`resolveCurrentCreatorId`) e exigido igual ao `creatorId` do path → 403 caso contrário;
  - `@JsonIgnore` em `CreatorEntity.documentCpf`/`pixKey` (segunda barreira);
  - teste `MonetizationAuthorizationTest` (anônimo 401; leitor 403; outro criador 403; dono 200; resposta sem CPF/PIX).

### Transação JPA × MongoDB (rollback-only)

- `WorkApplicationService.syncWorkToFeedQuietly` e `ModerationApplicationService` executavam escrita no Mongo
  **dentro** da transação JPA: em falha, o transceptor marcava a transação como rollback-only
  (`UnexpectedRollbackException`) e derrubava o cadastro de obra/capítulo ou a suspensão.
  Agora a sincronização é agendada para **depois do commit** (`TransactionSynchronization.afterCommit`),
  executando inline apenas quando não há transação (testes).

### Semântica de erro da API

- `GlobalExceptionHandler` com builder único (`LinkedHashMap`) e novos handlers: `FilePolicyException`
  (400/415), `NoResourceFoundException` (404), `HttpRequestMethodNotSupportedException` (405),
  `HttpMediaTypeNotSupportedException` (415), `MissingServletRequestPartException` (400),
  `MethodArgumentTypeMismatchException` (400) e `org.springframework.security.access.AccessDeniedException` (403).
  Antes, rodas inexistentes/método errado/negação de `@PreAuthorize` caíam no catch-all e viravam **500**.
- Arquivo rejeitado por política deixou de responder **401**: novo `FilePolicyException`
  (415 para formato/magic bytes inválidos; 400 para path traversal/nome inválido).

### Conteúdo restrito e cache

- `ChapterFileAccessGuard.evaluate` devolve `AccessDecision(allowed, privateContent)`; páginas de capítulo
  (early access/suspensas) são entregues com `Cache-Control: private, no-store` (antes `public, max-age=86400`
  podia vazar a resposta de um membro por CDN/proxy). Capa/avatar seguem públicos e cacheáveis.
- Obra suspensa deixou de ser exposta no detalhe/leitor (`assertWorkVisible` em `getWorkBySlug`/`readChapter`)
  e no manifesto offline.

### Anti-hardcoded / consistência

- CORS parametrizável por `platform.cors.allowed-origins` (com `trim` e guarda de `*` + credenciais).
- `RateLimitingFilter`: corpo 429 alinhado ao contrato (`timestamp`/`path`) + header `Retry-After`;
  rejeição de `X-Forwarded-For` continua desabilitada por padrão.
- Tamanho de upload unificado em `STORAGE_MAX_FILE_SIZE_MB` (multipart ↔ serviço); `StorageException`
  para falhas de I/O; logs de anúncio/monetização usam os valores configurados (não "17%/83%/30 páginas").
- `AesCryptoConverter` loga aviso ao usar a chave padrão de desenvolvimento; `DevOutboxController` loga
  aviso de exposição; `PlatformProperties` valida `fee + creatorShare = 100%` no boot.
- DTOs/hardcodes de VIP corrigidos para `platform.vip-price`; `PERCENT_FACTOR` no lugar de `new BigDecimal("100")`.
- Localização de pastas: `MonetizationService` → `service/monetization/`, `TwoFactorAuthService` →
  `service/mfa/`, `ReadingProgressService` → `service/reading/` (com testes movidos).

### Verificações do passe 4

- `backend`: `cmd /c mvn test` → **BUILD SUCCESS**, `Tests run: 107, Failures: 0, Errors: 0, Skipped: 0`
  (novos: `MonetizationAuthorizationTest` + casos em `FileStorageServiceTest`, `FileStorageUploadTest`,
  `FileStorageControllerTest`, `GlobalExceptionHandlerTest`, `WorkApplicationServiceTest`).
- `git diff --check` → exit 0.

### Pontas remanescentes do passe 4

- ✅ `spring.jpa.open-in-view` **desabilitado no passe 5** (ver abaixo). A mitigação por DTO já cobria o vetor
  conhecido; agora a sessão Hibernate encerra ao fim do serviço e LAZY fora de transação falha alto em vez de
  disparar queries silenciosas na renderização.
- `ChapterFileAccessGuard` ainda faz `LIKE` por imagem (avaliar índice/cache) — o guard agora é chamado uma vez por entrega.
- Fase 9 (smoke E2E + merge) segue bloqueada por ausência do daemon Docker (Postgres/Mongo).

## Passe 5 — pré-commit: OSIV, transação do job de feed e revisão do diff (2026-10-16)

Objetivo: fechar as pontas remanescentes do passe 4 que não dependiam de Docker/DB, antes de qualquer commit.

### OSIV desligado (`spring.jpa.open-in-view: false`)

- `application.yml` passa a encerrar a sessão Hibernate no fim do serviço transacional. Antes, com OSIV ligado por
  padrão, a sessão permanecia aberta durante toda a requisição: uma associação `LAZY` serializada fora da transação
  carregava em silêncio (N+1) em vez de falhar, e a conexão ficava presa durante a camada web.
- **Auditoria de regressão:** todos os endpoints já respondem com DTOs/records/`Map` de campos escalares — nenhum
  serializa entidade JPA. Todo acesso a associações `LAZY` (`WorkEntity.author`, `CreatorEntity.user`,
  `UserEntity.likedWorks`, `ChapterEntity.work`, `ReportEntity.*`, `MembershipSubscriptionEntity`, `FinancialLedgerEntity`)
  ocorre dentro de método `@Transactional` invocado via proxy Spring (incl. `ChapterFileAccessGuard.evaluate`).
  A consulta isolada do controller em `MonetizationController.getCreatorLedger` só lê escalares do DTO.

### Job agendado de recálculo do feed (bug de lazy loading independente do OSIV)

- `RecommendationAlgorithmService.scheduleFeedRecalculation()` (`@Scheduled`) chamava `syncAllWorksToFeed()` por
  **self-invocation**: não havia transação no caminho agendado (o OSIV também não vale para `@Scheduled`, que não
  passa por requisição web). Como `syncWorkToFeed` acessa `work.getAuthor()` (`LAZY`) sobre entidades desanexadas de
  `findAll()`, o recálculo periódico estourava `LazyInitializationException` para **toda obra** — erro engolido pelo
  `try/catch` de `syncAllWorksToFeed`, deixando o job efetivamente inócuo.
- Correção: `@Transactional(readOnly = true)` em `scheduleFeedRecalculation()`, mantendo a sessão aberta durante o laço
  (o caminho manual `FeedApplicationService.syncCatalog()` já passava por proxy e funcionava).

### Não alterado (pendências mantidas, dependem de infra/DB)

- `ChapterFileAccessGuard`: o `LIKE %filename%` por imagem continua (sem índice possível); otimização por relação
  dedicada `file → capítulo` ou cache é candidata a passe futuro (mudança de schema exige validar com Postgres real).
- Fases 8/9 (app nativo e smoke E2E+merge) seguem bloqueadas; ver `docs/PLANO_DE_FASES.md`.

### Verificações do passe 5

- `backend`: `cmd /c mvn test` → **BUILD SUCCESS**, `Tests run: 107, Failures: 0, Errors: 0, Skipped: 0`.
- `git diff --check` → exit 0 (apenas avisos LF/CRLF).
- Revisão independente (`review`) do diff completo não commitado — **concluída e incorporada no passe 6** (ver abaixo).

### Pontas do passe 5

- **Antes do commit:** ~~concluir/incorporar a revisão independente (`review`) do diff~~ — **feito no passe 6** (A1/A2/B1/B2/B3/M1/M2/B4 incorporados).
- Endpoints ainda devolvem modelos de persistência **NoSQL** (`ReadingProgressDocument`, `WorkFeedDocument`) sem DTO —
  não há lazy loading envolvido (Mongo), mas é candidato a DTO de apresentação por consistência de camadas.
- Smoke E2E com Postgres/Mongo e merge seguem bloqueados sem daemon Docker.

## Passe 6 — achados da revisão independente + Fase 9 desbloqueada (2026-10-16)

### Desbloqueio da infraestrutura

- O daemon Docker estava parado; foi iniciado (Docker Desktop 29.7.2) e o `docker compose up -d` subiu
  `manganetworking-postgres` (25432) e `manganetworking-mongodb` (27017), ambos `healthy`.
- Backend executado com profile `dev` (`SPRING_PROFILES_ACTIVE=dev`): Flyway aplicou as migrações, o job
  agendado de feed rodou sem erro e o **smoke E2E da jornada completa passou 23/23** (ver abaixo).

### Smoke E2E executado (Postgres + Mongo reais)

Jornada ponta a ponta via HTTP (`localhost:8085`), tudo verde:

| Etapa | Resultado |
|---|---|
| Cadastro de criador → `2FA_REQUIRED` | ✅ |
| Dev Outbox devolve o OTP | ✅ |
| `/auth/2fa/verify` → sessão `HttpOnly` (`isCreator`) | ✅ |
| 3 uploads multipart reais (capa, página, página EA) | ✅ |
| Criar obra (slug) e capítulos #1 (liberado) e #2 (early access) | ✅ |
| Detalhe da obra: 2 capítulos, autor e gêneros corretos | ✅ |
| Anônimo no capítulo early access → **403** | ✅ |
| Capa → `Cache-Control: public, max-age=86400, immutable` | ✅ |
| Página de capítulo liberado → `Cache-Control: private, no-store` | ✅ |
| Página early access: anônimo → **403**; autor → **200** | ✅ |
| `reading-progress/track` com `totalPages` → 200 (confirma contrato) | ✅ |
| `track` sem `totalPages` → **400** (documenta o achado A1) | ✅ |
| Doação R$10 → líquido R$8,30 (83%) | ✅ |
| VIP `isVip` / preço R$23,00 | ✅ |
| Extrato do dono (200) / anônimo (**401**) | ✅ |
| Denúncia → `PENDING`; anônimo em `POST /api/works` → **401** | ✅ |
| `GET /api/feed` contém a obra (**sync Mongo `afterCommit` funciona com OSIV off**) | ✅ |

> Evidência empírica de que o item M1 (sync em `afterCommit`) opera com a sessão JPA ainda aberta: a obra
> aparece no feed após o commit. Reforçado por teste unitário que prova o adiamento (`shouldDeferFeedSyncToAfterCommit`).

### Smoke E2E pelo frontend (Vite, 5180)

Frontend servido em `5180` com proxy `/api` → `8085` (same-origin, cookie `SameSite=Lax`). Verificado no navegador:

- `/` (feed) renderiza **dados reais** do Mongo: a seção "EM ALTA AGORA" listou as 3 obras criadas pelo smoke, com autor, views e ordenação por `discoveryScore` (`GET /api/feed` = 200); "BIBLIOTECA" reflete a sessão.
- Detalhe da obra: título, gêneros (`AÇÃO`, `SCI-FI`), sinopse, `#01` (liberado) e `#02` **EARLY ACCESS/MEMBROS**, `@handle` e preço de membro (R$ 23,00) vindos da API real.
- Leitor: abriu o capítulo `#1` com **PÁG. 1 / 2** e pediu a página real `GET /api/storage/<arquivo>` → **200** com `Cache-Control: private, no-store` (guard + cache corretos).
- Pipeline de imagem validado com um **PNG 1×1 real** enviado pela API: `GET /api/storage/<arquivo>.png` → 200 `image/png`, `public, max-age=86400, immutable`, e o browser **decodificou** (1×1). O `naturalWidth=0` observado antes era só o JPEG sintético do script de smoke (bytes falsos de teste), não um defeito de leitura.

> Portanto, Fase 9.1 está validada **na API e na UI**; resta apenas decidir o merge (9.2), que não é feito sem autorização explícita.

### Achados da revisão independente incorporados

- **A1 (Alto) — contrato de `TrackPageRequestDto`:** o frontend não enviava `totalPages` (obrigatório, `@Min(1)`),
  então 100% dos trackings retornavam 400 e o crédito de anúncio (58%/42%) nunca disparava. Corrigido em
  `ReaderPage.tsx` (envia `totalPages`) e `authApi.ts` (assinatura tipada). Adicionados 2 testes de contrato em
  `UserProfileIdentityTest` (sem `totalPages` → 400 e serviço nunca chamado; com → 200 pela identidade da sessão).
- **A2 (Alto) — Dev Outbox fail-closed:** `@Profile("!prod")` expunha `GET /api/dev/outbox/latest` (código 2FA sem
  autenticação) em qualquer ambiente sem o profile `prod`. Trocado por `@Profile({"dev","test","local"})`: sem profile
  (ou `prod`) o bean não existe. Exige `SPRING_PROFILES_ACTIVE=dev` no run local; documentado no `README.md` e no
  javadoc do controller. **Verificado empiricamente com duas instâncias:** com profile `dev`, registrar o usuário e
  chamar `GET /api/dev/outbox/latest` → **200 com `otpCode`**; **sem profile**, o mesmo fluxo (OTP já gravado no
  `DevOutboxRepository`) → **404 com corpo do framework** (`{"status":404,"message":"Recurso não encontrado"}`), ou seja,
  a rota não existe e o segredo é inalcançável mesmo havendo OTP em memória.
- **B1 (Baixo) — dado pessoal em log:** `MobileOfflineApplicationService` registrava o e-mail do usuário (LGPD);
  passou a logar apenas `user.getId()`.
- **B2 (Baixo) — guarda de path inconsistente:** `exists`/`deleteFile` só rejeitavam `..`; caminho absoluto passava.
  Centralizado em `isSafeStorageFilename` (rejeita nulo/traversal/separadores e valida `startsWith(uploadDir)`).
- **B3 (Baixo) — lote × tamanho:** `MAX_BATCH_FILES=300` era inalcançável sob o teto de 200MB/requisição. O cliente
  (`storageApi.uploadBatch`) agora fatia em lotes por contagem (50) e por bytes (100MB), preservando a ordem.
- **M1 (Médio) — `afterCommit`:** comportamento confirmado correto (smoke + teste); logs `catch` passaram a incluir a
  causa (`log.warn(..., e)`) em `WorkApplicationService` e `ModerationApplicationService`. Refatoração para
  `@TransactionalEventListener(AFTER_COMMIT)`/`REQUIRES_NEW` fica como candidata (ver "Revisar futuramente").
- **M2 (Médio) — cobertura das mudanças do passe 5:** novo teste `feedJobsAreTransactional` (reflexão: falha se
  `@Transactional` sair de `scheduleFeedRecalculation`/`syncAllWorksToFeed`) e `shouldDeferFeedSyncToAfterCommit`
  (prova que o sync não roda dentro da transação e sim no `afterCommit`).
- **B4 (Baixo) — moderador só vale no próximo login:** documentado no `PLANO_DE_FASES.md` (runbook) — `isModerator`
  é resolvido no login; promover alguém exige relogin.

### Verificações do passe 6

- `backend`: `cmd /c mvn test` → **BUILD SUCCESS**, `Tests run: 111, Failures: 0, Errors: 0, Skipped: 0` (107 → 111).
- `frontend`: `npx tsc --noEmit` → `TSC_EXIT=0`; `npm run build` → **BUILD SUCCESS** (1641 módulos).
- Smoke E2E real (Postgres+Mongo) via API: **23/23** (tabela acima).
- Smoke E2E na UI (Vite 5180): feed/detalhe/leitor consumindo a API real; guard e cache corretos; imagem decodificada (PNG real).
- A2 (fail-closed) confirmado com duas instâncias: com OTP em memória, profile `dev` → **200 com `otpCode`**; sem profile → **404 do framework** (rota inexistente).
- Nota: editar o comentário de `V3__add_moderator_flag.sql` (migração já aplicada) quebrou o checksum do Flyway e foi
  revertido — **nunca editar migração aplicada**; a observação de B4 foi movida para os docs.

### Pontas do passe 6

- `SPRING_PROFILES_ACTIVE=dev` agora é obrigatório para o atalho do Dev Outbox no run local (o 2FA continua válido
  sem ele; só a leitura local do OTP fica indisponível). Produtores devem rodar sem profile `dev` (ou com `prod`).
- Smoke E2E com o **frontend** (Vite) ainda não executado; o smoke atual exercita a API/2FA/upload/feed/guard reais.
- Teste de contexto real (Testcontainers) para OSIV/`afterCommit` segue como candidato (hoje coberto por smoke + unit).

## Critérios da tarefa

- [x] Arquivos modificados/não rastreados revisados (diffs completos).
- [x] Autorização de moderador, criador e upload verificadas no servidor (não só na UI).
- [x] Upload associa arquivos via referências retornadas (URL) usadas em `createWork`/`createChapter`.
- [x] `mvn test` (107), `npm run build` e `git diff --check` executados e anotados.
- [x] `docs/PLANO_DE_FASES.md` atualizado com o estado real (107 testes, Fases 4/5 concluídas, 7 ligada à API real, 8.1 concluída, pendências restantes).
- [x] Armazenamento: páginas de capítulo protegidas por `ChapterFileAccessGuard` (capa/avatar públicos).
- [x] Token de `localStorage` removido (ADR-002): `client.ts`/`storageApi` usam cookie + `credentials: 'include'`.
- [x] Vazamento de `GET /api/creators/workspace` corrigido e identidade por header removida do `CreatorController`.
- [x] Leitor (`ReaderPage`) ligado à API real; Fase 7 ponta a ponta com fallback mock.
- [x] Teste E2E de upload (multipart) e testes de autorização do backoffice (infra `@WebMvcTest` + `spring-security-test`).
- [ ] Fechar Fase 8 (offline real — app nativo, fora do repositório).
- [x] Contratos de auth (login/2FA/register) alinhados aos DTOs do backend e integrados no `LoginPage`.
- [x] Sessão real hidratada no `AuthContext` (`/auth/me`) com logout na UI.
- [x] Identidade de doação/assinatura resolvida pela sessão no servidor (sem `donorUserId`/`subscriberUserId` no corpo).
- [x] Autor e gêneros de obras reais renderizados corretamente (`authorId/…`/enum → rótulo).
- [x] Cadastro (register) com tela própria e `CreatorWorkspace` ligado a `GET /api/creators/workspace`.
- [x] Identidade de perfil exclusivamente pela sessão (anti-IDOR) com teste de regressão; 401 para anônimo e 403 para papel insuficiente.

### Critérios adicionais do passe 5 (pré-commit)

- [x] `spring.jpa.open-in-view: false` — sem serialização LAZY fora de transação; auditoria confirmou que nenhum endpoint devolve entidade JPA.
- [x] Job agendado de feed (`scheduleFeedRecalculation`) com transação — corrige `LazyInitializationException` silenciosa no recálculo periódico.
- [x] `mvn test` → **BUILD SUCCESS**, 107 testes, 0 falhas.
- [x] `git diff --check` → exit 0.
- [x] Revisão independente (`review`) do diff iniciada — achados a incorporar antes do commit.
- [ ] Smoke E2E com stack real (Postgres/Mongo) — bloqueado sem daemon Docker.

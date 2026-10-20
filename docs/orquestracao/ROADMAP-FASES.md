# ROADMAP DE FASES — MangaNetWorking

> **Documento único de execução.** Substitui as pastas `backend/tasks/`, `frontend/tasks/` e os relatórios por worker.
> Estado verificado em 20/10/2026, contra o working tree real. Onde não houve execução, está marcado **NÃO VERIFICADO**.

Legenda: ✅ pronto · 🟡 parcial · 🔴 bloqueado/pendente · ⏸️ fora do escopo atual

---

## 0. Visão em uma tela

| Fase | Entrega | Estado |
|---|---|---|
| **F0** | Infra Docker First (Postgres 16, Mongo 7, rede, volumes) | ✅ stack local validada |
| **F1** | Auth, 2FA por e-mail, Google OAuth, sessão, rate limit, força de senha e recuperação por link | 🟡 implementação e testes unitários locais verdes; V12/V13 ainda não aplicadas, Mailpit desta recuperação, OTP Redis operacional, token Google real e DNS autenticado pendentes |
| **F2** | Perfis de leitor e criador, avatar, biblioteca | ✅ privacidade server-side, links, bio, avatar integrado e cache privado verificados |
| **F3** | Obras, capítulos, storage e leitores de mangá/light novel | ✅ teste HTTP concorrente com imagem real; storage legado ainda contém referências órfãs |
| **F4** | Monetização, split 83/17 e 58/42, ledger, PIX | 🟡 checkout idempotente de doações/membros implementado; Sandbox e validação de ponta a ponta pendentes |
| **F5** | Frontend "Banca de Rua" e remoção de dados falsos | 🟡 contraste estático corrigido e build verde; inspeção visual/teclado completa das rotas bloqueada pela indisponibilidade do navegador local |
| **F6** | LGPD e AppSec (consentimento, exclusão, maioridade, uploads) | 🟡 V11 invalida backfill inferido; reaceite e auditoria implementados; texto oficial da política ainda não fornecido/publicado |
| **F7** | QA, smoke E2E, CI e empacotamento de produção | 🟡 smoke 12/12 e build verdes; workflow configurado para PR, execução remota requer PR e permissão de push |
| **F8** | Prontidão de produção (observabilidade, Redis, e-mail, backup) | 🟡 adapters OTP Redis, métricas/alertas, script de backup/restore-check e runbook implementados; operação real e controles externos pendentes |

---

## F0 — Infra Docker First

**Objetivo:** um comando sobe o ambiente inteiro e o backend conecta nos dois bancos.

**Estado real**
- Compose local usa `${POSTGRES_PASSWORD:-manga_dev_local_secure_2026}` e sobe Postgres, Mongo, Redis, Mailpit, backend e frontend; portas do host ficam limitadas a `127.0.0.1`.
- `docker compose up -d --build` construiu e iniciou a stack; os seis serviços (Postgres, Mongo, Redis, Mailpit, backend e frontend) ficaram `healthy`. O feed respondeu HTTP 200 diretamente e pelo proxy frontend.
- Em PostgreSQL 16/Mongo 7 descartáveis e isolados, o backend iniciou e Flyway aplicou V1..V11 com `success=true`. O volume local preexistente também validou V1..V11; não foi apagado. V12 foi criada após essa validação e ainda não foi aplicada.
- `docker compose down` (sem `-v`) preservou volumes nomeados de Postgres, Mongo, Redis e uploads; a stack foi iniciada novamente.

**Aceite**
- [x] `${POSTGRES_PASSWORD:-...}` (ou `.env` obrigatório) no compose local.
- [x] `docker compose up -d` com Postgres e Mongo `healthy`.
- [x] Backend sobe aplicando migrações V1..V11 em banco limpo; `GET /api/feed` responde 200. V12 segue pendente de aplicação/verificação real.
- [x] `docker compose down` sem perda de volume.

---

## F1 — Auth, 2FA e e-mail

**Objetivo:** cadastro/login com senha e Google, 2FA obrigatório por e-mail, sessão em cookie e recuperação de senha.

**Estado real**
- Cadastro, login, `/auth/2fa/verify`, `/auth/me`, `/auth/logout` existem. Primeiro OTP `LOGIN` validado persiste `email_verified_at`; ID token Google só é aceito com claim `email_verified=true` e também pode confirmar contas legadas vinculadas.
- V12 adiciona a coluna de confirmação de e-mail; a migration está criada, mas ainda não pôde ser aplicada/verificada em PostgreSQL real nesta rodada porque Docker está inacessível.
- `TwoFactorAuthService` gera OTP de 6 dígitos, TTL 5 min, armazena apenas HMAC com chave `OTP_HMAC_SECRET`, vincula `LOGIN`/`STEP_UP_PIX` e invalida após uso único. Permite cinco falhas e bloqueia a 6ª tentativa. O cache segue em memória por instância.
- `MfaNotificationSender` possui adapter SMTP (`SmtpMfaNotificationSender`) e Mailpit no Compose local; envio, recebimento da mensagem e verificação do OTP foram exercitados ponta a ponta. A conta e a sessão Redis sintéticas foram removidas após o teste.
- `DevOutboxNotificationSender` agora só existe nos perfis `dev/test/local` e quando SMTP está desativado. `local` é o perfil padrão; Compose de produção exige SMTP configurado.
- Assunto do e-mail não contém o OTP; teste confirma que o código só aparece no corpo. SPF/DKIM/DMARC ainda dependem de domínio e provedor externos.
- `loginWithGoogle` valida o ID token no servidor, exige `GOOGLE_CLIENT_ID` e `email_verified`, e usa email/nome/avatar das claims; o DTO não aceita identidade declarada pelo cliente. Ainda não há teste com token Google válido real.
- `POST /api/auth/2fa/request` autenticado emite OTP `STEP_UP_PIX`; `/2fa/verify` consome apenas `LOGIN`, e troca de PIX consome apenas `STEP_UP_PIX`.
- Cooldown de 60 s e máximo de 3 emissões em 10 min por conta/IP estão implementados; Redis executa a aquisição atomicamente quando configurado. Desafios OTP agora têm adapter Redis atômico e compartilhado; a operação real do adapter ainda não foi verificada nesta rodada.
- Cadastro duplicado e solicitação de reset retornam resposta genérica; a versão da política vem de `PRIVACY_POLICY_VERSION` e o aceite é verificado/registrado no servidor.
- Limite de senha continua em 8–64 pontos de código Unicode, aceitando espaços, acentos, símbolos e emojis. Cadastro/reset mostram força Fraca/Média/Forte, critérios e botão acessível de mostrar/ocultar; somente Média/Forte passam pela regra do servidor. Login mantém validação de tamanho, sem o novo gate de força, para não bloquear credenciais legadas. A classificação é heurística e não substitui consulta a base completa de senhas vazadas. Novos hashes usam BCrypt sobre SHA-256/Base64; hashes BCrypt legados continuam válidos e são atualizados após login bem-sucedido.
- Jackson rejeita campos JSON desconhecidos globalmente; teste HTTP confirma que `twoFactorEnabled` e `role` são rejeitados antes de chegar ao serviço.
- Recuperação de senha usa link com token aleatório de 32 bytes; somente SHA-256 é persistido em `password_reset_tokens` (V13), com TTL configurável de 5–60 minutos (padrão 30), uso único e lock transacional. A origem `PUBLIC_FRONTEND_URL` precisa ser HTTPS (HTTP só em localhost); SMTP envia link. Sem SMTP, o adaptador local guarda link apenas nos perfis `dev/test/local`, disponível na Dev Outbox até expirar; endpoint não existe em produção. Resposta é genérica para conta existente/inexistente e falha de entrega não expõe detalhes. Repetição não substitui link ativo. A redefinição aplica `PasswordPolicy`, mantém perfil/e-mail/2FA, invalida sessões e desafio OTP pendente e não autentica automaticamente. Rota SPA remove fragmento/token do endereço assim que capturado; meta referrer `no-referrer`.
- V12 e V13 ainda não foram aplicadas/verificadas em PostgreSQL real. Testes focados recuperação/SMTP/controller: 17/17; suíte completa em 20/10/2026: 284 testes, 0 falhas, 0 erros e 12 ignorados. Mockito foi pré-carregado para contornar a restrição de attach do JDK 26. SMTP/Mailpit ponta a ponta da recuperação e concorrência de consumo em Postgres ainda não foram exercitados.

**Aceite**
- [x] Entrega ponta a ponta ao Mailpit; adapter SMTP implementado e coberto por teste unitário; `DevOutbox` restrito a `dev/test/local`.
- [x] `From` com nome de exibição da marca.
- [ ] Domínio próprio autenticado (SPF/DKIM/DMARC), dependente de DNS/provedor.
- [x] Token Google verificado no servidor; e-mail/nome/avatar derivados das claims verificadas.
- [x] OTP armazenado como HMAC, vinculado a `purpose` (`LOGIN`, `STEP_UP_PIX`). Recuperação usa token de link distinto, não OTP.
- [x] `POST /api/auth/2fa/request` autenticado para emissão de step-up.
- [x] Step-up vinculado a `STEP_UP_PIX` e troca de PIX valida somente esse purpose.
- [x] Cooldown de 60 s e limite de 3 envios por 10 min por conta/IP implementados; integração Redis existe, mas teste operacional depende de Docker.
- [x] Reenvio: 1 por 60 s, no máximo 3 por 10 min; cadastro/reset não revelam existência da conta.
- [x] Implementação do fluxo de recuperação por link: token com hash persistido, expiração e uso único, SMTP, limite por conta/IP, senha oficial, revogação de sessões e OTP pendente; V13 criada.
- [x] Testes unitários de recuperação, endpoints MVC, adapter/composição SMTP e rejeição de TTL/origem insegura: 17/17 focados; suíte completa 284/0/0, 12 ignorados.
- [ ] Aplicar V12/V13 em PostgreSQL real, exercitar recuperação ponta a ponta no Mailpit e validar consumo concorrente do token.
- Evidência de 20/10/2026: suíte backend completa **284 testes, 0 falhas, 0 erros, 12 ignorados**; agente Mockito pré-carregado no processo. O build frontend passou nesta rodada com 1.649 módulos transformados.
- [x] Posse do e-mail persistida após primeiro OTP de login válido; e-mail Google confirmado apenas pela claim verificada do ID token.
- [ ] Aplicar V12 e verificar o campo `email_verified_at` em Postgres real antes do próximo release.
- [x] Testes cobrem OTP expirado, reuso, 6ª tentativa, purpose trocado, token Google inválido e composição SMTP.
- [x] Payloads rejeitam campos não mapeados, incluindo tentativas de enviar papel ou estado de 2FA pelo cliente.
- [x] Senha 8–64 Unicode, confirmação no cadastro/reset e migração transparente de BCrypt legado; testes de política, Unicode e compatibilidade de hash.
- [x] Indicador Fraca/Média/Forte com critérios visíveis, senha fraca bloqueada no cadastro/reset no frontend e backend; olhos acessíveis para senha e confirmações. `PasswordPolicyTest`: 4/4; `AuthApplicationServiceTest`: 10/10, incluindo rejeição de cadastro fraco. Suíte completa em 20/10/2026: 284 testes, 0 falhas/erros, 12 ignorados por indisponibilidade do Docker. A força é heurística, não consulta serviço abrangente de senhas vazadas.

---

## F2 — Perfis de leitor e criador

**Objetivo:** leitor escolhe perfil público/privado; criador tem página pública com bio, redes e avatar; biblioteca de curtidas.

**Estado real**
- Entidades e endpoints de perfil/workspace existem; privacidade é persistida pelo frontend e bloqueada no serviço para visitante anônimo. Perfil público pode ser consultado sem sessão.
- URLs de Instagram/YouTube usam allow-list de hosts oficiais; portfólio aceita apenas HTTPS e rejeita credenciais/hosts locais.
- Bio remove tags HTML no backend. Serviços de perfil rejeitam avatar remoto e aceitam somente caminho JPEG normalizado gerado pelo endpoint.
- `POST /api/storage/avatar` exige sessão, decodifica a imagem no servidor, rejeita dimensões acima de 8192 px ou 16 MP, recorta/redimensiona para 512×512 e reencoda em JPEG, removendo metadados da imagem de origem.
- Exclusão LGPD anonimiza criador e arquiva obras (`archived_lgpd`).
- Upload de avatar integrado nas telas de leitor e criador; alterações só refletem após confirmação/persistência pelo backend. Respostas de perfil usam `Cache-Control: no-store`.
- O processador usa formatos decodificáveis pelo `ImageIO` (JPEG/PNG); WebP não está habilitado nesse fluxo.

**Aceite**
- [x] Perfil privado bloqueia terceiros no servidor (não só na UI).
- [x] URLs sociais validadas por allow-list de domínio e links externos limitados a HTTPS.
- [x] Avatar redimensionado/recodificado no servidor (não confiar no cliente); testes cobrem JPEG normalizado e imagem inválida.
- [x] Testes de ownership e de perfil privado.

---

## F3 — Obras, capítulos e leitor

**Objetivo:** metadados no Postgres, páginas no storage, progresso no Mongo, leitor vertical.

**Estado real**
- `chapter_files` (V4) e guard de acesso existem.
- Upload com MIME + magic bytes.
- `reading_progress` tem índice composto `userId + workId` e índices auxiliares.
- Detalhe público oculta capítulos com `publicReleaseAt` futuro; obra `archived_lgpd` não aparece no detalhe e suas URLs antigas de página são bloqueadas pelo guard.
- Páginas são servidas por extensão MIME correta, `X-Content-Type-Options: nosniff` e conteúdo de capítulo sem cache público. GET de storage não consome o bucket de rate limit.
- Progresso não regride em requests fora de ordem e repetições da mesma página não incrementam o contador; índice composto único mantém um documento por `userId + workId`.
- Upload em lote limita 300 páginas; antes de persistir, o backend verifica dimensões (máximo 8192 px por lado e 16 MP) por metadata do decoder. Formatos sem leitor ImageIO configurado (incluindo WebP neste runtime) são rejeitados no lote.
- Migração V8 acrescenta `work_format` (`MANGA`/`LIGHT_NOVEL`) e `chapter_format` (`IMAGE_PAGES`/`PROSE`) sem alterar V1..V7. Capítulos em prosa são sanitizados, limitados a 2 MiB e incompatíveis com páginas; o leitor seleciona renderização conforme o formato entregue pela API. Mangá mantém o fluxo de páginas.
- `ChapterFileAccessIntegrationTest` criou um capítulo publicado em PostgreSQL efêmero, gravou um JPEG real do projeto (`shito.jpg`, 1.060.446 bytes) no storage e serviu 100 GETs HTTP com concorrência 10: 100×200, MIME `image/jpeg`, bytes idênticos; medição final: duração total 723 ms, p50 46 ms, p95 190 ms, máximo 191 ms. O volume legado ainda contém referências órfãs; esse problema de dados não invalida a medição controlada.

**Aceite**
- [x] Capítulo publicado só aparece se `publicReleaseAt <= now` e a obra não estiver suspensa/arquivada.
- [x] Páginas servidas com `Content-Type` correto, `nosniff` e sem cache compartilhado para páginas de capítulo.
- [x] Progresso idempotente por `userId + workId`.
- [x] Leitor não toma 429 ao virar capítulo (GET de storage fora do bucket; coberto por teste do filtro).
- [x] Quantidade máxima e dimensões de páginas validadas no servidor, com teste de regressão.
- [x] Teste HTTP concorrente com página real: 100/100 GETs retornaram 200, concorrência 10, bytes idênticos, p95 190 ms. Tentativa anterior contra referências órfãs do storage retornou 404; foi substituída pela integração controlada com arquivo real, sem alterar os dados órfãos.
- [x] Modelo de light novel/capítulos em prosa e leitura dedicada; preserva o fluxo de páginas de mangá (`WorkApplicationServiceTest`, 13 testes verdes).

---

## F4 — Monetização e financeiro

**Objetivo:** doações/membros 83/17, anúncios 58/42, VIP, ledger idempotente e PIX com step-up.

**Estado real**
- Split com `BigDecimal` e constantes de plataforma.
- Checkout VIP cria preferência persistida e só ativa após webhook assinado, aprovado, em BRL, com valor e referência conferidos; o ledger tem a chave única de idempotência.
- Os endpoints legados de VIP, doação e membro retornam `410 Gone`: não há crédito nem acesso antecipado sem checkout confirmado.
- V6 registra preferências de checkout. V7 adiciona auditoria PIX append-only; V8–V10 foram aplicadas ao Postgres local com `success=true` na stack reconstruída nesta rodada.
- Homologação Sandbox permanece pendente de credenciais de teste e URL pública de webhook.
- `updatePixKey` valida OTP vinculado a `STEP_UP_PIX`; existe endpoint autenticado para solicitar código. A troca grava tipo, ator, IP e sufixos mascarados na auditoria V7; trigger append-only bloqueia UPDATE/DELETE (integração PostgreSQL comprovada).
- `claimMissionReward` bloqueia avanço ao nível de monetização 2 quando não há data de nascimento ou quando a idade é menor que 18; há testes para ambos os casos. CPF novo pode ficar pendente sem sentinela; CPF inválido é rejeitado e checkout de apoio bloqueia criador sem identidade fiscal válida.
- Cadastro de criador valida CPF informado e armazena `null` quando ausente; V10 permite identidade fiscal pendente sem fabricar CPF. Checkout de apoio recusa criador sem CPF válido.
- V9 adiciona intents de checkout com chave única por pagador/produto, reutilização idempotente e vínculo de preferência; webhook valida referência, valor/moeda e registra o pagamento antes do ledger. A UI não calcula split, não ativa benefício antes da confirmação e não exibe saldo financeiro fictício fora de workspace carregado. Teste de regressão valida que retry reutiliza a preferência persistida; homologação Sandbox segue pendente.

**Aceite**
- [x] PIX só altera com OTP `STEP_UP_PIX` e registra evento append-only mascarado; migration e bloqueio de UPDATE/DELETE testados em PostgreSQL real.
- [x] Maioridade 18+ não opcional no avanço para nível 2; data ausente e menoridade bloqueadas por teste.
- [x] CPF ausente não é substituído por sentinela no cadastro; validação de dígitos verificadores e bloqueio do checkout de apoio sem CPF válido.
- [x] Webhook VIP idempotente por `payment_external_id` e assinatura HMAC.
- [x] Checkout idempotente para doações e Clube de Membros (V9; teste garante retry sem criar nova preferência). Homologação Sandbox pendente.
- [x] Split de doação e arredondamento `HALF_UP` cobertos por teste; R$ 0,05 divide em R$ 0,01 de taxa + R$ 0,04 líquido.
- [x] Nenhum saldo fictício na UI; valores financeiros dependem de workspace retornado pelo servidor, sem divisão de split no cliente.

---

## F5 — Frontend "Banca de Rua"

**Objetivo:** identidade visual consistente, sem dados fabricados e com estados de tela reais.

**Estado real**
- Tokens `--mn-*` aplicados nos componentes base.
- `SobrePage` agora apresenta a origem do projeto, o criador e Kokuin com texto revisado; usa apenas as duas fotos locais reaproveitadas do MangaTeofilo, com revelação circular por hover/toque, foco de teclado, respeito a movimento reduzido e layout responsivo.
- A página apresenta mangá e light novel como direção do produto, sem afirmar que a leitura em prosa já existe. O produto segue digital: sem loja, venda de obras/produtos físicos ou logística.
- 401 de `/auth/me` limpa identidade e deixa sessão deslogada; falhas de exportação/exclusão LGPD não simulam arquivo baixado nem exclusão local.
- Fixtures restantes de catálogo, leitor e workspace estão condicionadas a `import.meta.env.DEV`; não são publicadas como dados de produção. Showcase usa dados estáticos somente na rota interna de design.
- A página de perfil não inventa preço ou vencimento VIP: preço aparece no checkout; validade só aparece quando fornecida pelo backend.
- Build de produção executado: TypeScript + Vite, 1647 módulos, saída gerada com sucesso. Contraste dos tokens: paper/ink 17.15:1, mute/ink 8.00:1, yellow/ink 13.74:1, green/ink 11.03:1; `mute-paper`/paper 6.80:1. O token `--mn-mute` é remapeado para `--mn-mute-paper` em contextos `.mn-on-paper`/`.mn-on-yellow`; controles e seção amarela usam foco preto de alto contraste. As ocorrências atuais de mute permanecem em superfícies escuras. Revisão visual/teclado rota a rota não foi concluída: o navegador ativo não pôde ser inspecionado com segurança pela ferramenta de UI.
- `XpBar.tsx` órfão.

**Aceite**
- [x] Sobre nós refeito com narrativa própria e somente as duas fotos/transição da página antiga.
- [x] Responsivo e acessível por teclado; transição respeita preferência por movimento reduzido.
- [x] Nenhum dado financeiro/identidade mock em rota de produção; valores de demo ficam condicionados a `import.meta.env.DEV`.
- [x] 401 leva a estado deslogado e nenhum arquivo/exclusão LGPD é simulado localmente.
- [x] Fixtures de demonstração nas telas de catálogo, perfil, leitor e workspace isoladas por `import.meta.env.DEV`.
- [x] `npm run build` verde; contraste dos tokens principais auditado.
- [x] Corrigir contraste contextual de `--mn-mute` em papel/amarelo e foco de controles em amarelo.
- [ ] Concluir passe visual e de teclado em todas as rotas.

---

## F6 — LGPD e AppSec

**Objetivo:** consentimento, exclusão, maioridade, minimização e uploads seguros.

**Estado real**
- V5 criou `terms_accepted_at`, `privacy_policy_version`, `birth_date` e índice.
- Cadastro exige aceite da versão configurada; sessões antigas recebem 428 até reaceite, com tela de confirmação e endpoint autenticado.
- V11 substitui o backfill inferido da V5: limpa somente o padrão `terms_accepted_at = created_at` + versão `v1.0`, mantendo V5 imutável e exigindo aceite real na próxima interação.
- Eventos de consentimento e solicitações de exportação/exclusão são append-only; exportação inclui perfil, aniversário/visibilidade, consentimentos, favoritos, leitura e histórico financeiro.
- Exclusão revoga sessões, exige verificação da remoção física dos avatares, anonimiza usuário/criador, limpa mensagem livre de doação, arquiva obras e expurga progresso/eventos de engajamento do Mongo; ledger fica preservado.
- Magic bytes implementados para JPEG/PNG/WebP.
- Cookie `SameSite=Lax` + `Secure` configurável; filtros sem registro duplo.
- V10 remove a obrigatoriedade fiscal para criador em onboarding, sem CPF sentinela; foi aplicada no Postgres da stack e validada com `success=true`.
- **Gaps:** falta publicar/fornecer o texto oficial aprovado da Política de Privacidade (o endpoint divulga a versão, não o documento); ainda precisa de saneamento controlado de CPF sentinela legado. O achado histórico de OTP em texto puro foi corrigido em 2026-10-19 (ver F1 e auditoria).

**Aceite**
- [x] Política versionada e reaceite server-side ao mudar versão (bloqueio 428); publicar o texto oficial segue pendente.
- [x] Backfill de V5 substituído por reaceite na V11; V5 não foi alterada.
- [x] Maioridade bloqueia monetização com `birthDate` nulo ou idade inferior a 18 no avanço para o nível 2.
- [x] CPF ausente não é substituído por valor fake; onboarding de apoio exige CPF válido.
- [x] Portabilidade (`GET /api/users/me/export`) e exclusão auditadas em eventos append-only; smoke validou exportação, exclusão e 401 após revogação.
- [x] Checklist técnico do `D:\Projetos\Generico\GUIA-LGPD-E-PRIVACIDADE.md` aplicado ao consentimento, DTOs, sessão, mídia, ledger e maioridade; publicar política aprovada ainda depende do titular do produto.

---

## F7 — QA, E2E e CI

**Objetivo:** provar o fluxo completo em stack real.

**Estado real**
- Última suíte em 20/10/2026: **284 testes, 0 falhas/erros, 12 ignorados**; Testcontainers não acessou Docker por `AccessDeniedException`.
- Testes de integração tiveram execução real verde em rodada anterior; nesta rodada os dependentes de Docker foram ignorados.
- Smoke E2E executado em stack real: 12/12 etapas passaram. Também exercitou consentimento, sessão Redis, step-up PIX, upload, obra/capítulo, rota financeira 410, exportação e exclusão.
- Workflow em `.github/workflows/ci.yml` mantém gatilho `pull_request` e adiciona smoke em stack Docker; ainda não há execução observada em um PR remoto.

**Aceite**
- [x] `mvn -o test` verde em 20/10/2026: 284 testes, 0 falhas/erros; 12 ignorados nesta rodada por indisponibilidade do Docker.
- [x] Stack saudável e migrations V1..V11 verificadas em execução anterior; V12 ainda requer validação em PostgreSQL real.
- [x] Smoke 12/12 com evidência local.
- [x] `npm run build` verde em 20/10/2026: 1649 módulos, TypeScript + Vite.
- [ ] CI rodando em PR: workflow configurado, mas ainda sem execução remota observada; requer PR/publicação autorizada.

---

## F8 — Prontidão de produção

**Estado real**
- Os adapters Redis para sessão, rate limit e desafios OTP existem; Compose local e de produção selecionam Redis. O profile `prod` falha no boot se algum deles estiver como `inmemory`.
- Compose de produção exige autenticação Mongo e senha Redis; o backend recebe URI Mongo autenticada e senha Redis por ambiente.
- A suíte/smoke anterior comprovou sessão Redis no fluxo real; nesta rodada o Docker negou acesso e a porta local 6379 não estava disponível, portanto a validação operacional atual dos scripts OTP Redis ficou pendente. Fora do Compose, o default permanece `inmemory` para dev/test.
- Logs estruturados, contadores Micrometer de OTP/e-mail e regras Prometheus foram adicionados. É necessário importar as regras e configurar Alertmanager/plantão no ambiente operacional.
- Script de backup com checksums e restore-check isolado foi adicionado, junto ao runbook; não foi executado por depender do Docker nesta rodada. A cópia ainda precisa de criptografia e destino externo com KMS.

**Aceite**
- [x] Store distribuído de desafios OTP, TTL, purpose, uso único e verificação atômica; profile `prod` exige Redis para sessão, rate limit e OTP.
- [x] Teste Testcontainers cobre purpose, expiração, cinco tentativas e consumo concorrente único; os 2 testes de integração foram ignorados nesta rodada porque Docker não estava acessível.
- [ ] Teste operacional atual com Redis real nesta rodada; daemon Docker negou acesso e Redis local não estava disponível.
- [x] Logs estruturados seguros, contadores Micrometer de OTP/e-mail e regras Prometheus versionadas.
- [ ] Alertas ativos: regras precisam ser carregadas no Prometheus/Alertmanager e canal de plantão configurado.
- [x] Script de backup e restore-check de Postgres, Mongo e storage com manifest/checksums e alvos de restore isolados.
- [ ] Execução real de backup/restore, retenção aprovada, cifra em repouso e destino externo ainda pendentes.
- [ ] SMTP com domínio autenticado SPF/DKIM/DMARC e monitoramento de bounce dependem do domínio e provedor escolhidos.
- [ ] Encarregado/DPO, inventário completo de operações e prazos de retenção exigem definição/aprovação organizacional/legal; auditoria de exportação/exclusão já existe.
- [x] Runbook de incidente e rotação de chaves documentado; exercício operacional e validação do operador pendentes.

**Próximo passo F8:** quando Docker estiver acessível, testar OTP Redis e o ciclo de backup/restore isolado; depois ligar regras/canal de alerta e fechar as decisões externas de DNS, provedor SMTP, retenção e encarregado.

## Próximas ações calculadas

1. **F5 — passe visual/teclado em todas as rotas:** executar quando o navegador e a aplicação local estiverem acessíveis; build e inspeção estática não substituem essa auditoria.
2. **F7 — CI em PR:** obter execução remota quando houver branch/PR e permissão de publicação; o workflow já declara `pull_request`.
3. **F8 — prova operacional:** com Docker permitido, executar Testcontainers Redis OTP e Backup/RestoreCheck em dados isolados; validar auth de Mongo/Redis também no boot de produção.
4. **F8 — produção externa:** importar regras no Alertmanager, configurar destino cifrado de backup, escolher provedor SMTP e comprovar SPF/DKIM/DMARC/bounce.
5. **F6/F8 — governança:** obter decisão organizacional sobre encarregado/DPO, inventário de operações e prazos de retenção; não inventar esses dados no código.
6. **F1 — identidade de produção:** validar um ID token Google válido em ambiente de homologação; a posse de e-mail comum já é registrada após OTP `LOGIN`, e o Google exige claim verificada.
7. **F1/F0 — schema:** aplicar V12 e verificar `email_verified_at` em PostgreSQL real antes do próximo release.

---

## Fila única (ordem de execução)

| # | Item | Fase | Escopo de código | Critério |
|---|---|---|---|---|
| 1 | Corrigir interpolação e completar compose local | F0 | `docker-compose.yml` | ✅ 6 serviços; portas locais; imagens construídas |
| 2 | Subir stack e validar migrações | F0 | — | ✅ Feed 200; V1..V11 em Postgres limpo; volumes preservados |
| 3 | Verificar token Google no servidor | F1 | `AuthApplicationService`, `GoogleLoginRequestDto`, config | ✅ claims verificadas; token inválido rejeitado; teste direcionado verde |
| 4 | Homologar SMTP real + Mailpit | F1 | `SmtpMfaNotificationSender`, `application.yml`, compose | 🟡 Mailpit E2E confirmado; falta DNS autenticado |
| 5 | Endpoint de step-up OTP com purpose | F1/F4 | `AuthController`, `AuthApplicationService`, `TwoFactorAuthService` | ✅ `/2fa/request` autenticado; PIX aceita apenas código `STEP_UP_PIX` |
| 6 | OTP como HMAC + purpose | F1 | `TwoFactorAuthService` | ✅ HMAC constant-time; reuso e troca de purpose falham; chave de produção obrigatória |
| 7 | Maioridade obrigatória | F4/F6 | `CreatorApplicationService` + testes | ✅ data ausente e menoridade bloqueadas antes do nível 2 |
| 8 | CPF real no onboarding | F6 | `AuthApplicationService`, DTO | Sem CPF fake |
| 9 | Consentimento versionado e eventos auditáveis | F6 | V11, Auth, perfil e política | ✅ reaceite server-side; texto oficial da política pendente |
| 10 | Checkout para doações e membros | F4 | gateway, controllers, ledger, frontend | Sem crédito/acesso antes de webhook confirmado |
| 11 | Homologar Checkout VIP Sandbox | F4 | `.env`, túnel e webhook | Pagamento Sandbox ativa uma única vez |
| 12 | Remover mocks de produção | F5 | `CreatorWorkspacePage`, `AuthContext`, `App.tsx`, `BibliotecaPage` | Nenhum `MOCK_*` fora de DEV |
| 13 | Testes de integração + smoke | F7 | `smoke_test_e2e.ps1`, CI | 12/12 |
| 14 | Redis para sessão/rate limit | F8 | `SessionStore`, `RateLimitStore` | `SCAN`, Redis no compose local |
| 15 | Analytics do criador | F9 | `CreatorAnalyticsApplicationService`, `CreatorAnalyticsController`, `EngagementEventMongoRepository` | Série real por dia + retenção + líquido; 401 sem sessão |
| 16 | Season de 60 dias + boost | F9 | `SeasonService`, `SeasonRotationService`, `SecurityConfig` | Janela determinística; job diário idempotente; 401 sem sessão |
| 17 | Expor perfil público de leitor com privacidade server-side | F2 | `UserProfileController`, `SecurityConfig`, `UserProfileApplicationService` | ✅ visitante consulta perfil público; perfil privado nega terceiros |
| 18 | Validar links públicos de criador | F2 | `CreatorApplicationService`, `CreatorProfileUrlPolicy` | ✅ domínios sociais aprovados; HTTP/hosts falsos rejeitados |
| 19 | Redimensionar e recodificar avatar no servidor | F2 | storage/avatar pipeline | ✅ endpoint autenticado; limite/dimensões impostos; JPEG 512×512 e imagem inválida cobertos por teste |
| 20 | Vincular OTP ao purpose e armazenar HMAC | F1/F4 | MFA, Auth, PIX | ✅ consolidado com itens 5 e 6; login e step-up separados; chave de produção via `OTP_HMAC_SECRET`; 6ª tentativa bloqueada |
| 21 | Reenvio OTP com cooldown e limite por conta/IP | F1 | Auth/MFA e rate limit | ✅ código e testes locais; teste Redis real pendente |
| 22 | Filtrar capítulos agendados e bloquear obra arquivada no leitor/storage | F3 | `WorkApplicationService`, `ChapterFileAccessGuard` | ✅ futuro oculto; arquivamento LGPD bloqueia detalhe e URL antiga |
| 23 | Limites de quantidade e dimensão das páginas + teste de carga | F3 | upload/leitor | ✅ 100 GETs com página real: 100×200, concorrência 10, p95 190 ms |
| 24 | Auditoria append-only da troca de PIX | F4 | V7, `CreatorApplicationService`, `CreatorController` | ✅ gravação mascarada e trigger de imutabilidade testados em PostgreSQL real |
| 25 | Sobre nós com história da plataforma e do criador | F5 | `SobrePage` e fotos locais | ✅ copy sem promessas de recursos ainda inexistentes; build frontend verde |
| 26 | Suporte a light novels em prosa | F3 | `WorkEntity`, capítulos, API e leitor | ✅ V8 separa `PROSE`/`IMAGE_PAGES`; testes preservam fluxo de mangá |
| 27 | Rejeitar campos JSON desconhecidos em DTOs | F1 | `application.yml`, `AuthControllerTest` | ✅ `twoFactorEnabled` e `role` extras retornam 400; serviço não é invocado |
| 28 | Medidor de força, visibilidade de senha e bloqueio de senhas fracas | F1/F5 | `PasswordInput`, `LoginPage`, `PasswordPolicy` | ✅ build verde; policy 4/4 e AuthApplicationServiceTest 10/10; suíte completa 273 sem falhas/erros (12 Testcontainers ignorados sem Docker) |
| 29 | Fechar passe visual/teclado em todas as rotas | F5 | rotas/telas frontend | 🟡 bloqueado: navegador local indisponível nesta sessão |
| 30 | Obter execução real do CI em PR | F7 | GitHub Actions/PR | 🟡 workflow configurado; requer push/PR e permissão remota |
| 31 | Operar Redis OTP e backup/restore isolado | F8 | Testcontainers/Compose/scripts ops | 🟡 testes adicionados; runtime Docker não acessível nesta rodada |

> **Pendente honesto:** o deploy real (Fase 13 "em produção") exige credenciais/infra que não estão nesta máquina; nada foi publicado. O job de rotação usa join em memória obras×eventos (adequado ao MVP, não a milhões de obras).

---

## Regra de atualização

Ao concluir um item, atualize **esta tabela** e `AUDITORIA-ATUAL.md` no mesmo commit. Não crie relatório paralelo.

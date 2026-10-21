# Plano de Fases, Regras de Negócio & Estado de Implementação — MangaNetWorking

> **DOCUMENTO MESTRE DE PRODUTO & REGRAS DE NEGÓCIO**
>
> **Última Atualização:** 20 de Outubro de 2026
>
> **Escopo deste arquivo:** regras de produto, plano atual F0–F8 e histórico de decisões/fases antigas. A seção 4 resume o estado atual das fases; a fila detalhada e evidências de execução ficam sincronizadas em `docs/orquestracao/ROADMAP-FASES.md`. Fases legadas posteriores estão preservadas como histórico, não como status corrente. Achados abertos ficam em `docs/orquestracao/AUDITORIA-ATUAL.md` e o progresso anterior permanece em `docs/orquestracao/HISTORICO_TAREFAS.md`.
>
> ⚠️ **Fonte de estado:** a seção 4 é o mapa de produto F0–F8; para logs, comandos, resultados de teste e ordem exata da fila, consulte o roadmap/auditoria. O histórico abaixo não deve ser interpretado como status atual.
>
> **Migrações Flyway:** V1..V16 aplicadas em PostgreSQL local real e em schema limpo via Testcontainers até 20/10/2026; versões aplicadas são imutáveis. A V14 acrescenta `users.is_owner` (papel de proprietário), a V15 cria a auditoria append-only de governança de dados e a V16 registra eventos de entrega de e-mail (bounce/complaint) sem gravar o endereço em claro.
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

Este é o plano vigente do produto. Os critérios concluídos refletem implementação e validações já registradas; itens externos ou sem execução comprovada permanecem abertos. A fila operacional detalhada está em `docs/orquestracao/ROADMAP-FASES.md`, que agora organiza o fechamento nos Blocos A–D (itens 32–56): A local, B segurança/governança, C configuração externa e D documentação.

### 4.0 O que já dá para fazer localmente (verificado em 20/10/2026)

Fluxo exercitado de ponta a ponta na stack local (backend 8085, frontend 5180, Postgres, Mongo, Redis, Mailpit e SMTP real do `.env`):

| Ação | Situação | Como foi verificado |
|---|---|---|
| Criar conta de **leitor** (cadastro + 2FA por e-mail + sessão) | ✅ funciona | `POST /api/auth/register` → OTP **entregue no e-mail real** (SMTP do `.env`) → `2fa/verify` → cookie HttpOnly; `/api/auth/me` devolve a sessão |
| Criar conta de **criador** (handle próprio) | ✅ funciona | mesmo fluxo com `isCreator=true`; `creatorId`/`creatorHandle` no `/me` |
| Entrar, sair e revogar sessão | ✅ funciona | logout devolve `401` imediato na sessão revogada |
| Recuperar senha por e-mail | ✅ funciona | pedido → link → nova senha → 2FA → `/me`; TTL, uso único e concorrência cobertos; link entregue no e-mail real |
| **Upar imagem** (capa, página, avatar) | ✅ funciona | `POST /api/storage/upload` com validação de magic bytes e limite de tamanho/dimensões |
| **Criar obra** (com autoria original declarada) | ✅ funciona | `POST /api/works` → `id` + `slug`; feed e catálogo listam a obra |
| **Publicar capítulo** com páginas vinculadas | ✅ funciona | `POST /api/works/{id}/chapters` → capítulo 1 com páginas; leitura pública liberada |
| **Ler a obra** (detalhe, capítulo e página) | ✅ funciona | verificado com **uma segunda conta**: `GET /api/works/{slug}` → 200 (`status=ongoing`), `GET /api/works/{slug}/chapters/1` → `locked=false`, e a página em `/api/storage/...` → **200 sem sessão** (conteúdo público) |
| Biblioteca (favoritar) e progresso de leitura | ✅ funciona | `POST /api/users/library/{workId}/toggle` → `{"liked":true}`; `POST /api/users/reading-progress/track` → 200 e `GET /api/users/reading-progress` devolve o item (Mongo) |
| Denunciar e moderar (fila, suspensão) | ✅ funciona | `POST /api/reports` (público) + fila do DONO/moderador + suspensão cautelar |
| Workspace do criador (analytics, missões, chave PIX com step-up 2FA) | ✅ funciona | `/api/creators/workspace`, `/api/creators/analytics`, `PUT /api/creators/pix-key` com OTP |
| Painel do DONO (governança de dados) | ⚠️ parcial | existe o papel `ROLE_OWNER` e os endpoints de auditoria/saneamento; **não há dashboard de produto** |
| **Editar obra/capítulo já publicado** | ❌ **não existe** | com sessão autenticada, `PUT /api/works/{id}`, `PUT /api/works/{id}/chapters/1`, `DELETE /api/works/{id}` e `DELETE .../chapters/1` respondem **405 Method Not Allowed**: só há `POST` (criar) e `GET` (ler) |
| Comentários na obra | ❌ não existe | o modelo tem `comments_count`, mas não há API de comentário |
| Doação, membresia e VIP | ❌ bloqueado | checkout Mercado Pago exige credenciais Sandbox/webhook público; a rota legada devolve `410` (nenhum crédito fictício) |
| Login social (Google) | ❌ bloqueado | exige ID token real e domínio/DNS (#44) |
| E-mail para destinatário real | ⚠️ parcial | **entrega real comprovada em desenvolvimento** (SMTP do `.env`: OTP e link de recuperação com `outcome=sent` no e-mail do titular). Para produção falta **domínio autenticado com SPF/DKIM/DMARC** e provedor institucional (#46) — conta pessoal não serve como remetente de produção |
| Criar conta com **username** e entrar por ele | ✅ funciona | `POST /api/auth/register` com `username` + sexo → 2FA; `POST /api/auth/login` com `{identifier}` aceita e-mail **ou** username (prova ao vivo: login com `qa.leitor.92542227` devolveu a conta e o OTP para o e-mail real) |
| Perfil **público** por username | ✅ funciona | `GET /api/users/{username}/public-profile` sem sessão: nome, avatar, links, seguidores, obras e curtidas |
| Perfil **privado** | ✅ funciona | a mesma rota devolve **só o username**; é o que aparece nos comentários |
| **Comentar** na obra | ✅ funciona | `POST /api/works/{workId}/comments` (leitor autenticado) e `GET` público; username sempre visível, nome/avatar só com perfil público; corpo higienizado no servidor |
| **Seguir** um escritor | ✅ funciona | `POST /api/creators/{handle}/follow` — só escritores têm seguidores; leitor não é seguido e ninguém segue a si mesmo |
| **Virar escritor** (leitor → escritor) | ✅ funciona | `POST /api/creators/apply` exige **pelo menos um vínculo social** (Instagram/YouTube/portfólio, allowlist de host + HTTPS obrigatório); sem link: 400 |
| Painel do criador em **telas separadas** | ✅ funciona | Workspace, Minhas obras, Capítulos, Missões & XP, Analytics (`/api/creators/analytics`) e Monetização — cada um com endpoint próprio |
| Menu da conta no **avatar do header** | ✅ funciona | avatar redondo no canto: Minha conta → Criador (Workspace, obras, capítulos, missões, analytics, monetização) → Sair. A divisão "modo criador/leitor" saiu do header |
| Onboarding pós-cadastro | ✅ funciona | após o 2FA: tela de foto de perfil, escolha público/privado e botão de ver a própria página pública |

> Observação operacional: o cadastro tem limite de 3 OTPs por IP a cada 10 minutos e cooldown de 60 s.
> Em testes seguidos, o `429` é o limitador de emissão de OTP, não um defeito.
>
> E-mail sempre no mesmo endereço: o servidor canonicaliza (trim + minúsculas) o e-mail em cadastro, login,
> 2FA, recuperação e webhook de bounce; endereço com espaço nas pontas ou em maiúsculas é aceito e gravado
> canônico, e endereço inválido volta **400** com mensagem clara.
>
> Evidência desta rodada: CI remoto verde no commit `8cff00f` (run `39521554083` com os quatro
> jobs - backend (**352 testes**), frontend, validação do Compose de produção e smoke 12/12.
> Smoke local 12/12 na stack real e V17 aplicada em PostgreSQL real.

### 4.1 O que ainda não dá (ordem de bloqueio)

1. **Produto incompleto:** edição/exclusão de obra e capítulo, comentários, dashboard do DONO e o
   motor completo de analytics/Seasons (F17).
2. **Paginação real:** checkout do Mercado Pago (Sandbox, webhook público e chaves de produção).
3. **Identidade e e-mail de produção:** ID token Google e **domínio com SPF/DKIM/DMARC + provedor
   institucional** — a entrega real já funciona em desenvolvimento (SMTP do `.env`, comprovada), mas conta
   pessoal não serve como remetente de produção; o monitoramento de bounce já existe no servidor e
   depende de o provedor enviar o webhook.
4. **Governança:** texto oficial da Política de Privacidade, nomeação e publicação do encarregado,
   prazos de retenção aprovados, destino off-site real e KMS da chave de backup.
5. **Infra de produção:** conta Oracle, shape Ampere A1, chave SSH, DNS/TLS e o deploy em si —
   com o terreno pronto (`ops/deploy/deploy-prod.ps1`, `docs/ops/PRODUCAO-ORACLE.md`).

### F0 — Infra Docker First · ✅ concluída
**Objetivo:** subir a stack local integrada e conectar backend a PostgreSQL e MongoDB.

- [x] Compose local válido; Postgres, Mongo, Redis, Mailpit, backend e frontend saudáveis; migrations aplicadas e `/api/feed` respondeu 200.
- [x] `docker compose down` sem remover volumes; dados persistentes preservados.

### F1 — Autenticação, 2FA, e-mail e senhas · 🟡 parcial
**Objetivo:** cadastro/login seguro, Google verificado no servidor, OTP por e-mail, sessão e recuperação de conta.

- [x] OTP HMAC com propósito para login/step-up PIX, limites de reenvio, SMTP/Mailpit e validação server-side do ID token Google implementados. Recuperação usa link/token SHA-256 persistido em PostgreSQL, TTL configurável de 5–60 min (padrão 30), uso único, resposta genérica, origem HTTPS validada sem path/query, política de senha oficial e revogação de sessões; sem SMTP, a Dev Outbox guarda o link somente em perfis locais e até expirar. V13 aplicada em PostgreSQL real com `token_hash VARCHAR(64)` e `validate` verde; o throttle usa namespace `password-reset`, separado do OTP de login, e o envio ocorre após commit.
- [x] OTP válido de login persiste a confirmação de posse do e-mail; redefinição de senha não confirma nem altera o e-mail. Google requer claim `email_verified=true`. V12 adiciona `email_verified_at` sem editar migrations anteriores.
- [x] Política de senha nova: 8–64 pontos de código Unicode; confirmação, revelar/ocultar acessível e medidor Fraca/Média/Forte; backend recusa senha fraca em cadastro/reset, sem bloquear login de contas legadas.
- [x] `PasswordPolicyTest` passou 4/4 e `AuthApplicationServiceTest` passou 10/10, incluindo o bloqueio de cadastro fraco; Mailpit E2E do OTP de login e testes de OTP/Google inválidos estão cobertos. A recuperação por link foi exercitada no Mailpit (pedido → link → nova senha → 2FA → `/me`), com expirado/malformado/reuso cobertos e concorrência real 204/401 (#34–#36).
- [x] V12/V13 aplicadas e validadas em PostgreSQL real; envio da recuperação por Mailpit e consumo concorrente exercitados. Dois Testcontainers (concorrência e rotação) passaram; suíte completa 322/0/0 com Docker. O `CHAR(64)` da V13 foi corrigido para `VARCHAR(64)` antes de qualquer aplicação durável; o CI efêmero que aplicou a versão anterior foi descartado.
- [x] V14/`ROLE_OWNER` aplicada em PostgreSQL real (`is_owner boolean`); proprietário herda moderação, `/api/owner/**` exige papel próprio e `/auth/me` devolve `isOwner`/avatar. Login de conta inexistente/sem senha executa BCrypt descartável; `prod` falha com OTP HMAC padrão/curto ou cookie sem `Secure`; o Compose exige `PUBLIC_FRONTEND_URL` e deriva CORS/retorno do Mercado Pago dessa origem, sem fallback localhost. `TRUST_FORWARDED_HEADERS` configurável e habilitado atrás do Nginx. A exclusão LGPD limpa privilégios e dados de nascimento/verificação; o feed exclui obras `suspended` e `archived_lgpd`.
- [x] Criar a conta DONO de `Wilsonteofilosouza@live.com`; cadastro confirmado por OTP, `is_owner=true`/`is_moderator=true` aplicados no PostgreSQL e sessão real verificada em `/api/auth/me`. A senha inicial de 9 caracteres foi recusada; a senha forte fornecida pelo titular não foi registrada nem persistida no repositório.
- [ ] Homologar ID token Google válido e configurar DNS autenticado SPF/DKIM/DMARC; sem credenciais/domínio reais, permanece aberto (#44, #46).
- [x] **E-mail canonicalizado no servidor (20/10/2026):** `EmailNormalizer` (trim + minúsculas + validação RFC 5321) é
  aplicado em cadastro, login, Google OAuth, 2FA, recuperação de senha, OTP, Dev Outbox e webhook de bounce; endereço
  com espaço nas pontas ou em maiúsculas passa a ser aceito e gravado canônico, e endereço inválido vira 400 explícito.
  Antes o `@Email` do framework recusava `" pessoa@dominio.com "` antes de qualquer tratamento.
- [x] **SMTP real no ambiente local (20/10/2026):** o Compose local passa a repassar `MAIL_*` do `.env` (o padrão
  continuava sendo Mailpit quando as variáveis não existem). Prova: e-mail de recuperação e **código 2FA** enviados
  com `outcome=sent` para o endereço real do titular, Mailpit com `0` mensagens no mesmo intervalo. Suíte: **335/0/0**.
- [x] **Cadastro que ficou pela metade retoma (20/10/2026):** conta existente e ainda **não confirmada** volta a
  receber o código de 2FA pelo SMTP configurado (antes a rota respondia sem enviar nada e a pessoa ficava travada).
  Conta já confirmada não recebe e-mail no cadastro — esse caso é login.


- [x] **Identidade separada, leitor x escritor e perfil publico (21/10/2026):** `V17` cria `users.username` (unico,
  imutavel depois de escolhido), `users.sex`, `creator_follows` e `work_comments`. Login e 2FA aceitam **e-mail ou
  username**; o cadastro cria **sempre leitor** e a transicao para escritor exige **pelo menos um vinculo social**
  (allowlist de host, HTTPS obrigatorio, sem `javascript:`/`data:`/credencial/porta). Pagina publica por username
  respeita a privacidade (privado expoe so o username), seguidores existem **so para escritores** e comentarios
  mostram o username sem expor o resto quando o perfil e privado. Front: header sem a divisao "modo leitor/criador"
  (menu do avatar), painel do criador em telas separadas por endpoint, "Minha conta" e onboarding pos-cadastro.
  Evidencia: **352 testes** verdes, V17 aplicada em PostgreSQL real, smoke 12/12 local e no CI (run `39521554083`).
- [x] **Stack de alerta corrigido e sob o Compose (21/10/2026):** as regras do Prometheus tinham um `:` nao citado
  numa anotacao YAML e o container **nao carregava as regras** (`promtool` -> 4 regras depois do ajuste, alvo `up`).
  Prometheus e Alertmanager passaram para o profile `monitoring` do Compose (antes eram containers orfaos).

### F2 - Perfis de leitor e criador · 🟡 parcial

**Objetivo:** perfis público/privado, página do criador, links, avatar e biblioteca com autorização no servidor.

- [x] Privacidade e ownership verificados no backend; links externos validados; bio sanitizada.
- [x] Avatar decodificado, limitado, redimensionado/recodificado no servidor e integrado às telas; respostas privadas sem cache compartilhado.
- [x] **Identidade separada (21/10/2026):** username único como segunda via de login e endereço público do perfil
  (imutável depois de escolhido), cadastro exige nome + username + e-mail + senha + data de nascimento + sexo; o
  cadastro cria **sempre** leitor e a transição para escritor exige **pelo menos um vínculo social** (Instagram, YouTube
  ou portfólio, com allowlist de host e HTTPS obrigatório). Página pública por username respeita o privacidade: perfil
  privado expõe só o username. Seguidores existem apenas para escritores. Comentários da obra mostram o username do
  autor e escondem nome/avatar quando o perfil é privado. Evidência: 352 testes verdes, V17 aplicada, páginas separadas
  no painel do criador e menu do avatar no header.

### F3 — Obras, capítulos e leitores de mangá/light novel · 🟡 parcial
**Objetivo:** metadados no Postgres, arquivos seguros, progresso idempotente no Mongo e leitura adequada a imagem ou prosa.

- [x] Publicação futura/obra arquivada respeitam guard; páginas têm MIME correto, `nosniff`, sem cache compartilhado; progresso é idempotente.
- [x] Limites de páginas/dimensões e capítulos de prosa implementados sem quebrar o fluxo de páginas de mangá.
- [x] Carga HTTP com página real: 100/100 respostas 200, concorrência 10, p95 190 ms; detalhe e evidência no roadmap.
- [x] Fluxo completo verificado em 20/10/2026: criar obra, publicar capítulo com páginas e **ler a obra por uma segunda conta** (detalhe público, capítulo e página) — ver 4.0.
- [ ] **Lacunas de produto:** não existe `PUT/PATCH/DELETE` de obra ou capítulo (só criação) e não há API de comentários. Editar ou remover conteúdo publicado é a próxima entrega de F3.

### F4 — Monetização e financeiro · 🟡 parcial
**Objetivo:** doações e Clube de Membros idempotentes, splits, ledger e PIX com step-up, sem saldo fictício.

- [x] Checkout idempotente, webhook validado e efeitos financeiros apenas após confirmação; UI não inventa saldo nem divide valores como autoridade.
- [ ] Homologar o fluxo completo no Mercado Pago Sandbox com credenciais e endpoint público de webhook.

### F5 — Frontend “Banca de Rua” · ✅ concluída (evidência estrutural de QA)
**Objetivo:** interface acessível e responsiva, sem mocks de produção ou estados financeiros falsos.

- [x] Fixtures isoladas em desenvolvimento; sessão 401 vira deslogada; contraste estático, senha e Sobre Nós implementados; build de produção verde.
- [x] Inspeção de teclado/layout concluída em todas as rotas, incluindo moderação (2 denúncias reais) e workspace do criador; foco visível de 3 px, sem overflow horizontal e com labels corrigidos em gênero, sinopse e biografia (#40). A captura pixel não foi produzida pela ferramenta (aba não visível), então a evidência é estrutural (DOM, acessibilidade e layout), não pixel a pixel.

### F6 — LGPD e AppSec · 🟡 parcial
**Objetivo:** consentimento versionado, direitos do titular, maioridade e segurança de dados/arquivos.

- [x] Reaceite server-side, auditoria append-only, exportação, exclusão, maioridade e checklist técnico aplicados; V11 substitui backfill inferido sem editar V5.
- [x] Hardening de AppSec: `/auth/me` sem repositório no controller, BCrypt descartável contra enumeração por tempo, guarda de segredos no profile `prod` e `TRUST_FORWARDED_HEADERS` explícito atrás do proxy; nenhum segredo de produção hardcoded encontrado.
- [x] Mecanismo de publicação controlada da Política de Privacidade (`GET /api/legal/privacy-policy` + `ops/legal/publish-privacy-policy.ps1`, log append-only) e saneamento controlado de dado legado (CPF sentinela, `ROLE_OWNER`, auditoria em `privacy_governance_actions`/V15; 16 registros saneados). Monitoramento de bounce com supressão (V16) e token de coleta de métricas.
- [ ] **Publicar a Política de Privacidade aprovada** (texto oficial e aprovação são decisão humana) e **nomear/publicar o encarregado**, aprovar inventário e prazos de retenção — modelo pronto em `docs/ops/INVENTARIO-DADOS.md`, decisão pendente.

### F7 — QA, E2E e CI · ✅ concluída
**Objetivo:** comprovar fluxos em stack real e automatizar validação em pull request.

- [x] Suíte backend em 20/10/2026: **335 testes, 0 falhas/erros**, com Docker disponível (concorrência e rotação em Testcontainers); build frontend verde e smoke E2E 12/12 local; workflow de CI configurado para pull requests. Último run verde na `main`: `39500739630` (commit `345c7a7`) com os quatro jobs.
- [x] Job `docker-validation` recebeu `MAIL_*` fictícios; Compose de produção validado sem `.env` localmente (`docker compose config --quiet` = 0). O run `39448285071` do PR #5 ficou verde em backend, frontend, Docker e smoke 12/12; a falha anterior de V13 foi corrigida e a senha do smoke foi alinhada à política atual (#43).

### F8 — Prontidão de produção · 🟡 parcial
**Objetivo:** operar sessão/OTP distribuídos, observabilidade, backup, e-mail e resposta a incidentes.

- [x] Adapters Redis, métricas/logs/regras, script de backup/restore e runbook estão implementados; perfil de produção exige stores distribuídos e credenciais. OTP, sessão e throttle foram observados no Redis real (`mn:otp:issue`, `mn:password-reset:issue`, `mn:session`).
- [x] Backup e restore-check locais executados com manifest SHA-256, Postgres/Mongo e storage; banco restaurado confirmou 17 usuários e V13. O script foi corrigido para Windows PowerShell 5.1.
- [x] Cifra em repouso do backup (AES-256-CBC + HMAC-SHA256), cópia off-site conferida por SHA-256 e retenção com log, executadas de verdade; resta o destino off-site real, o KMS e a aprovação de prazos.
- [x] Canal de plantão ativo no ambiente local: Prometheus e Alertmanager oficiais, `promtool`/`amtool` aprovados, 2 regras ativas e alerta sintético crítico entregue no e-mail. Monitoramento de bounce nativo do servidor (webhook autenticado, supressão de envios, V16) e token dedicado de coleta de métricas. Exercício de runbook automatizado e registrado.
- [x] Mecanismo de publicação da Política de Privacidade e saneamento controlado de CPF sentinela implementados e executados (16 registros legados saneados com auditoria append-only em V15).
- [ ] Dependências externas que fecham os itens 42 e 45–49: texto oficial aprovado da política, nomeação e publicação do encarregado, prazos de retenção aprovados, destino off-site real e KMS, domínio autenticado (SPF/DKIM/DMARC) e provedor de e-mail, canal institucional de plantão.

**Próxima sequência:** Bloco A concluído localmente até #39 e #43; #40 concluído (rotas de criador/moderador QA com sessão real), #41 pendente (boot `prod`/failover), #42 parcial (restore, cifra, off-site e retenção feitos no ambiente local; falta o destino externo e a aprovação) e #44 bloqueado por Google/DNS; #56 concluído. No Bloco B, 45, 46, 48 e 49 têm a parte técnica pronta e comprovada; 47 tem o modelo pronto, e todos seguem abertos pela decisão organizacional. Depois Bloco C (50–55). Não marcar dependências externas como concluídas sem evidência.

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
  - Depois de provisionar: instalar Docker/Compose, criar `.env` fora do Git com chaves definitivas, executar a stack, validar healthchecks, migrações Flyway V1–V16 e smoke test. Não gerar nem armazenar aqui a chave AES de produção.
  - Sem acesso autorizado à conta e ao host, nenhum serviço foi implantado, nenhuma migration foi aplicada em banco Oracle e nenhum backup/restore de produção foi testado. Nenhuma compra real ou ativação financeira de produção foi executada.

### FASE 15: Conexão Segura & Proxy Serverless (Cloudflare Pages Functions)
**Objetivo:** Interligar o frontend em `manganetworking.pages.dev` à API na Oracle Cloud sem custos de domínio nem problemas de CORS/cookies.

- [ ] **15.1. Implementação de Pages Function (`functions/api/[[path]].ts`):**
  - Proxy reverso transparente de `/api/*` para o IP público da VM Oracle.
  - Preservação estrita de cookies de sessão `HttpOnly` com `SameSite=Lax` (e `Secure` em produção), headers de autorização quando houver, e payload de uploads multipart.
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

## 7. Histórico Consolidado de Passes de Engenharia (Passes 10 ao 23)

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
| **Passe 23** | 20/10/2026 | **Recuperação de conta e consolidação seletiva:** token aleatório de uso único com hash no banco, TTL configurável e origem HTTPS validada; Dev Outbox local respeita expiração; atualização dos bloqueios reais das fases 13/14. Migrations V6–V13, backend de identidade, interface e documentos foram separados em commits locais, sem push. | `mvn -o test`: **284 testes, 0 falhas, 0 erros, 12 ignorados**; `npm.cmd run build`: **1649 módulos**; Compose local/prod validado (prod com placeholders). V12/V13 reais, DNS, Sandbox e OCI continuam pendentes. |

| **Passe 24** | 20/10/2026 | **Papel de proprietário, governança de dados e prontidão de produção:**<br>- V14 (`users.is_owner`) com `ROLE_OWNER` derivado no servidor; `/api/owner/**` exige o papel; `/auth/me` expõe `isOwner`.<br>- V15 (`privacy_governance_actions`, append-only) e V16 (`email_delivery_events`).<br>- Publicação controlada da Política de Privacidade (`GET /api/legal/privacy-policy` + `ops/legal/publish-privacy-policy.ps1`).<br>- Saneamento controlado de CPF legado (16 registros) e exclusão LGPD limpando privilégios residuais.<br>- Backup cifrado (AES-256-CBC + HMAC) com cópia off-site e retenção; Prometheus + Alertmanager com alerta real; exercício de runbook automatizado; `ops/deploy` para a Oracle.<br>- PR #5 mergeado na `main` (merge commit `35479b7`) e `develop`→`main` (PR #7, `f6350a4`). | **322 testes** verdes; CI remoto verde (run `39490345472`); stack local 6/6 saudável; sem credencial de produção, sem deploy e sem aprovação legal inventada. |
| **Passe 25** | 20/10/2026 | **E-mail real e canonicalização no servidor:**<br>- `util.EmailNormalizer` (trim + minúsculas + validação RFC 5321) aplicado em cadastro, login, Google OAuth, 2FA, recuperação, OTP, Dev Outbox e webhook de bounce; o `@Email` do framework saiu dos DTOs porque recusava endereço com espaço nas pontas.<br>- Compose local passou a repassar `MAIL_*` do `.env` (antes fixava Mailpit e ignorava o `.env`: todo OTP ia para o Mailpit).<br>- Cadastro com conta pendente (e-mail nunca confirmado) reenvia o OTP; conta já confirmada não recebe e-mail no cadastro (é login). | **335 testes**, 0 falhas/0 erros; entrega real comprovada com `outcome=sent` (OTP de 2FA e link de recuperação no e-mail do titular) e Mailpit com 0 mensagens no mesmo intervalo; Dev Outbox **404** no stack real (atalho de dev desligado); CI remoto verde (run `39500739630`). |
| **Passe 26** | 21/10/2026 | **Identidade separada e reorganizacao da interface:**<br>- V17: `users.username` (unico, imutavel depois de escolhido), `users.sex`, `creator_follows`, `work_comments`.<br>- Login e 2FA aceitam e-mail **ou** username; cadastro cria sempre leitor; virar escritor exige pelo menos um vinculo social (allowlist + HTTPS).<br>- Perfil publico por username com privacidade real; seguidores so de escritor; comentarios com username.<br>- Header sem a divisao "modo leitor/criador" (menu do avatar); painel do criador em telas separadas; "Minha conta"; onboarding pos-cadastro.<br>- Prometheus e Alertmanager no profile `monitoring` do Compose; bug real de YAML nas regras corrigido. | **352 testes**, 0 falhas/0 erros; V17 aplicada; smoke 12/12 local e no CI (run `39521554083`); login por username e perfil publico comprovados ao vivo. |

### Próximos passos (estado atual)

A ordem vigente é mantida em `docs/orquestracao/ROADMAP-FASES.md`. Concluído com evidência: o passe autenticado/teclado (#40), o run remoto verde (#43), a retenção/cifra/off-site do backup no ambiente local (#42 — falta o destino externo e a aprovação), a governança de dados do proprietário e a entrega de e-mail em caixa real (OTP e recuperação) em desenvolvimento. Restam, marcados como dependências externas sem simulação: boot `prod` entre réplicas (#41), domínio autenticado com SPF/DKIM/DMARC e provedor institucional de e-mail, credenciais Sandbox do Mercado Pago com webhook HTTPS público, ID token Google, texto oficial da Política de Privacidade e nomeação do encarregado, prazos de retenção aprovados, destino off-site e KMS, e acesso Oracle (região/shape/chave SSH). Nenhuma compra real, mudança de DNS ou infraestrutura externa foi criada. A suíte backend passou **352/0/0** com Docker; o restore foi verificado em bancos isolados; o CI remoto está verde na `main` (run `39521554083`) e o smoke local fez 12/12. A identidade (username, leitor x escritor, perfil público, seguidores e comentários) entrou no servidor com a V17 e o painel do criador foi quebrado em telas separadas por endpoint.

---

## 8. Resumo Técnico do Ambiente

| Componente | Tecnologia | Porta / Path | Status de Verificação |
|---|---|---|---|
| **API Backend** | Spring Boot 3.4.2 / Java 21 | `8085` | **352 testes** em 21/10/2026, 0 falhas/erros/ignorados com Docker; Sandbox pendente |
| **Banco Relacional** | PostgreSQL 16 (Docker) | `25432` | V1–V16 aplicadas em stack local real; V13 com `token_hash VARCHAR(64)`, V14 com `is_owner` e `validate` verde |
| **Banco NoSQL** | MongoDB 7 (Docker) | `27017` | Eventos de feed e telemetria validados ao vivo |
| **Storage de Imagens** | Filesystem Local Sanitizado | `./data/uploads/` | Magic bytes e guard por `chapter_files` validados |
| **Frontend Web** | React 19 / TypeScript / Vite | `5180` | Build limpo em 21/10/2026 (1649 módulos) |
| **E-mail (SMTP)** | `SmtpMfaNotificationSender` | — | Entrega real de OTP e de link de recuperação comprovada em 20/10/2026 (`outcome=sent`); produção exige domínio autenticado com SPF/DKIM/DMARC |

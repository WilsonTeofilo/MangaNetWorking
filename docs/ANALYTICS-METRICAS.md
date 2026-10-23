# Métricas do Analytics do Criador

> Documento central das métricas do painel `GET /api/creators/analytics` e dos números exibidos
> no catálogo, no feed e na ficha da obra. Toda métrica exibida precisa estar definida aqui, com a
> mesma fórmula usada no backend, no frontend e nos testes. Se a métrica ainda não é coletada, ela
> está em [O que ainda não é medido](#6-o-que-ainda-não-é-medido) e **não** aparece na UI.

## 1. Regra que separa "visualização" de "retenção"

Uma **visualização** é uma pessoa que abriu o capítulo e leu pelo menos uma página. Não é uma por
página lida: ler 40 páginas do mesmo capítulo continua sendo **1 visualização**. Essa mesma
visualização é o **início qualificado**: abrir e sair não conta.

A **retenção** é outra coisa: é o quanto dessa visualização avançou no capítulo (páginas
alcançadas ÷ páginas do capítulo). Um capítulo lido inteiro tem retenção de 100%; lido até a
metade, 50% — nos dois casos, 1 visualização.

| Situação | Visualizações | Retenção |
|---|---|---|
| Abriu o capítulo e saiu sem ler | 0 | — |
| Leu a página 1 e saiu | 1 | 1 de N páginas |
| Leu páginas 1–10 de 20 | 1 | 50% |
| Leu tudo | 1 | 100% |
| Voltou no dia seguinte e releu | 1 (nova visualização do dia) | mantém a maior página |

## 2. Fonte única da verdade

| Dado | Onde vive | Uso |
|---|---|---|
| `VIEW` (capítulo aberto com leitura) | MongoDB `engagement_events` | visualizações/inícios qualificados por capítulo, obra, dia, hora e período |
| `READ` (página lida) | MongoDB `engagement_events` | curva de retenção e conclusão de mangá |
| `IMPRESSION` (card visível) | MongoDB `engagement_events` | impressões elegíveis e denominador do CTR |
| `OPEN` (clique na obra) | MongoDB `engagement_events` | aberturas do funil; atribuição declarada ao CTR |
| Acumulado de visualizações | PostgreSQL `chapters.views`, `works.total_views` | número exibido na ficha, no catálogo e no feed |
| Curtidas | PostgreSQL `work_likes`, `chapter_likes` + contadores `works.total_likes`, `chapters.likes` | engajamento distinto de favorito e de view |
| Favoritos | PostgreSQL `user_liked_works` + `works.total_favorites` | biblioteca e sinal de ranking |
| Comentários | PostgreSQL `work_comments` + `works.total_comments`, `chapters.comments_count` | comunidade e ranking de comentários |
| Último ponto de leitura | MongoDB `reading_progress` | biblioteca/"continuar de onde parou" — **não** reconstrói histórico |
| Catálogo (obra, capítulo, autor) | PostgreSQL `works`, `chapters` | recorte por obra/capítulo e autorização |
| Financeiro | PostgreSQL `financial_ledger` | doações, membros, saques e líquido |

O acumulado do PostgreSQL é incrementado **no mesmo caso** em que o evento `VIEW` é gravado, mas de
forma best-effort: falha no contador não bloqueia a leitura nem o evento, que é a fonte do analytics.
O feed (MongoDB `work_feed`) é reindexado a cada 10 minutos a partir do PostgreSQL; é a única fonte
com atraso.

## 3. Eventos

Gravados por `ReadingProgressService.trackPageRead` (leitura) e `EngagementTrackingService`
(descoberta). Leitura só recebe requisição quando o leitor avança de página; descoberta só é
gravada para **leitor autenticado** — visitante não recebe identificador anônimo.

| Evento | Quando é gravado | Deduplicação |
|---|---|---|
| `VIEW` | quando a primeira página fica ≥50% visível por ~1 s (ou após navegar para página >1) | `idempotencyKey = userId:VIEW:chapterId:AAAA-MM-DD` em `America/Sao_Paulo`; no máximo 1 por dia |
| `READ` | a cada avanço de página (página nova ou troca de capítulo) | o progresso não regride: página repetida/atrasada não grava |
| `IMPRESSION` | card de obra ≥50% visível por ~1 s, em lote de até 20 | índice único em `idempotencyKey = userId:IMPRESSION:sessão:superfície:obra` |
| `OPEN` | clique que abre a obra, antes da navegação | índice único em `idempotencyKey = userId:OPEN:sessão:superfície:obra` |

Campos comuns: `eventType`, `userId` (da sessão), `workId`/`chapterId` validados no PostgreSQL,
`readPage` e `timestamp` do servidor. Eventos de descoberta também guardam a categoria fechada
`surface` (`FEED`, `CATALOGO`, `BUSCA`, `RECOMENDACAO`, `PERFIL_CRIADOR`, `BIBLIOTECA`, `EXTERNO`,
`DIRETO`) e `eventVersion = 1`. Sem IP, user-agent, e-mail, nome, URL, texto lido ou timestamp do
cliente.

Validações de leitura antes de gravar: a obra e o capítulo existem e pertencem um ao outro;
`totalPages` é igual ao número real de páginas do capítulo; a página está em `1..totalPages`.
Acesso antecipado e capítulo agendado continuam barrados antes disso. Em descoberta, obra
inexistente é descartada (`rejected`), superfície fora da lista devolve `400` e chave repetida é
ignorada (`duplicates`); o índice único cobre duas requisições simultâneas.

Limite conhecido: a checagem de dedup do `VIEW` (`exists` + `insert`) usa a chave diária e o
índice único de `idempotencyKey`; duas requisições simultâneas podem disputar a chave, mas a
`DuplicateKeyException` é absorvida e apenas uma view do dia é contabilizada. `IMPRESSION`/`OPEN`
têm o mesmo padrão de chave idempotente.

## 4. Métricas implementadas

Janela: `days` entre 1 e 180 (clamp no servidor). Bordas e agrupamento diário no fuso de exibição
**`America/Sao_Paulo`** (IANA): `from = hoje - (days - 1)`, `windowEnd = amanhã 00:00`. O dia
corrente é parcial. O armazenamento continua em UTC; só a leitura/agrupamento usa o fuso.

| Métrica | Fórmula | Observações |
|---|---|---|
| **Visualizações válidas / inícios qualificados** | contagem de eventos `VIEW` na janela | 1 por leitor por capítulo; não é por página; abrir e sair não conta |
| **Leitores únicos** | `distinct userId` dos `VIEW` da janela | Calculado na janela; **nunca** soma dos únicos diários |
| **Série diária** | `VIEW` agrupados por data `America/Sao_Paulo`, dias sem evento = 0 | únicos do dia = distintos dentro do dia |
| **Comparação** | mesma agregação na janela imediatamente anterior, de igual duração | sem base anterior não se inventa percentual |
| **Últimas 48 h** | `VIEW` agrupados por hora cheia, 48 posições | consulta ao vivo; tooltip mostra hora e total |
| **Impressões elegíveis** | contagem de `IMPRESSION` na janela | card ≥50% visível por ~1 s; instrumentado a partir de 22/10/2026, sem reconstrução retroativa |
| **Aberturas** | contagem de `OPEN` na janela | abrir não é ler; inclui link externo/direto |
| **Aberturas atribuídas** | `OPEN` com `IMPRESSION` da mesma pessoa e obra nos **30 min anteriores** | janela de atribuição declarada; abertura fora dela não entra no numerador |
| **CTR** | aberturas atribuídas ÷ impressões elegíveis × 100 | `null` quando o denominador é zero (indisponível, não 0); UI sinaliza amostra < 10 |
| **Funil** | impressões → aberturas → inícios qualificados → conclusões estimadas | só mostra etapa medida; conclusão ausente aparece como indisponível |
| **Retenção por página** | para cada leitor, maior `readPage`; chegaram à página `p` = quem parou em `p` ou além ÷ leitores com progresso | curva de alcance, não medição de olhar; limitada a 200 páginas; base é "leitores com progresso", não inícios por capítulo |
| **Conclusão estimada (mangá v1)** | leitor concluiu quando maior `readPage` ≥ `ceil(0,8 × páginas distintas do capítulo)`; taxa = concluídos ÷ leitores únicos do capítulo | prosa devolve `null` (não mensurável) — nunca zero fabricado |
| **Heatmap dia × hora** | `VIEW` dos últimos 28 dias agrupados por dia da semana (1=segunda) e hora em `America/Sao_Paulo` | 168 células; detalhamento oculto com amostra < 10 |
| **Recorte por obra** | `VIEW`/`IMPRESSION`/`OPEN` agrupados por `workId` | obras do criador sem leitura aparecem com zero |
| **Recorte por capítulo** | `VIEW` e `READ` agrupados por `chapterId` | capítulos reais do PostgreSQL, ordem crescente |
| **Total da obra no site** | `works.total_views` (soma incremental de `chapters.views`) | exibido no feed, catálogo e ficha |
| **Doações / membros / saques** | soma de `creator_net_brl` por `transaction_type` no `financial_ledger` | borda da janela usa o fuso do `@CreationTimestamp` |
| **Receita líquida** | doações + membros | saques não entram como receita |
| **Saldo** | `creators.wallet_balance_brl` | saldo atual, não recortado pela janela |
| **Membros** | `creators.monthly_members_count` | contagem atual |

Proteções: denominador zero devolve `null`/lista vazia (nunca `NaN`/`Infinity`); nenhum dado
anterior à instrumentação é inventado.

## 5. Autorização, privacidade e exportação

- `GET /api/creators/analytics` e `GET /api/creators/analytics/export.csv` exigem `ROLE_CREATOR`;
  o `creatorId` vem da sessão (`SecurityContextUtils.requireCurrentCreatorId()`), nunca de query
  string, corpo ou header.
- O recorte é montado a partir de `workRepository.findAllByAuthorId(creatorId)`; não existe endpoint
  que aceite `workId`/`chapterId` de terceiros. `creatorId`, `workId` e `chapterId` enviados na URL
  são ignorados (teste HTTP de regressão em `CreatorAnalyticsIdentityTest`).
- `POST /api/analytics/impressions` e `POST /api/analytics/openings` exigem sessão autenticada; o
  usuário vem do contexto de segurança, nunca do corpo.
- A resposta contém apenas agregados: nenhuma lista de leitores, e-mail, IP, sessão ou `userId`.
- Detalhamentos com amostra < 10 (curva de retenção, heatmap, origem) são suprimidos na UI com
  "Dados insuficientes"; os totais agregados continuam. Nunca se revela indivíduo.
- O CSV é gerado no servidor (`CreatorAnalyticsCsvWriter`) com os mesmos filtros/fórmulas da tela,
  contém apenas agregados por obra/capítulo, usa UTF-8 com BOM e neutraliza formula injection
  (célula iniciada por `=`, `+`, `-`, `@`, tab ou CR recebe apóstrofo). Não exporta evento bruto.
- Retenção dos eventos brutos: TTL de 180 dias no índice de `timestamp` (mesma janela máxima do
  painel).

## 6. O que ainda não é medido

- tempo ativo de leitura (heartbeat com aba em primeiro plano e pausa em background);
- leitores recorrentes/retorno e coortes D1/D7/D30 (exigem histórico maior que a instrumentação
  atual e regra de suficiência);
- continuação para o próximo capítulo (janela de 7 dias ainda não instrumentada);
- curva de progresso de light novel (faixas de 0–10% … 90–100%): o DTO de tracking e o leitor de
  prosa ainda não enviam progresso de prosa. A barra visual de scroll não é telemetria nem retenção;
- leitores anônimos e categorias de dispositivo — bloqueados por decisão de privacidade (sem
  fingerprint/IP como identificador);
- origem `RECOMENDACAO`/`PERFIL_CRIADOR`/`EXTERNO`: a categoria existe no contrato, mas ainda não há
  superfície de card que a dispare.

Enquanto esses dados não existirem, a tela mostra apenas o que é real, com estado vazio honesto,
sem estimativa, RPM fictício ou número preenchido à mão.

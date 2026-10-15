# ADR-001: Separação de Responsabilidades entre PostgreSQL, MongoDB e Storage Local

## Status
Aprovado

## Contexto
O MangaNetWorking opera dados com características distintas:
1. Identidades, credenciais, metadados de catálogo, assinaturas e ledger financeiro exigem garantias ACID fortes, integridade referencial estrita e conformidade contábil.
2. Progresso de leitura em tempo real e telemetria de engajamento possuem altíssima frequência de escrita e toleram consistência eventual sem quebrar o sistema.
3. Imagens de páginas de mangá e avatares são arquivos binários pesados. Se armazenados como arrays de bytes em bancos relacionais ou documentos MongoDB, causam inchaço severo (bloat), degradam backups e elevam consumo de RAM.

## Decisão
1. **PostgreSQL (Fonte da Verdade Transacional):**
   - Usuários, autenticação, credenciais, perfis e permissões.
   - Obras e capítulos (metadados estruturados: títulos, slugs, status, datas de lançamento público).
   - Assinaturas de membros, doações avulsas, taxas de plataforma (17%) e divisão de anúncios (58%/42%).
   - Ledger financeiro append-only com chaves de idempotência únicas.

2. **MongoDB (Dados Documentais e Leitura Rápida):**
   - `reading_progress`: Registra página a página onde o leitor parou e contador acumulado para o gatilho de anúncios a cada 30 páginas lidas.
   - `feed_works`: Projeção desnormalizada do catálogo calculada pelo algoritmo estilo YouTube/Facebook para servir a Home em < 15ms.
   - `engagement_events` e `creator_missions`: Telemetria de cliques e progresso de missões semanais.

3. **Storage de Arquivos (Interface `FileStorageService`):**
   - Arquivos binários NUNCA são gravados no MongoDB nem no PostgreSQL.
   - Para o ambiente de desenvolvimento local, os arquivos são gravados em diretório isolado do filesystem local (`./data/uploads/`) gerenciado por `LocalFileStorageService`.
   - O banco armazena apenas a referência relativa, dimensões, tipo MIME e ordem das páginas.
   - Em produção, a implementação será substituída por um adaptador de Object Storage (S3 / Cloudflare R2) sem alterar o domínio.

## Consequências
- Zero risco de transações distribuídas (two-phase commit) entre Postgres e Mongo.
- Backups do Postgres permanecem pequenos, rápidos e confiáveis.
- O leitor desfruta de leitura fluida alimentada por armazenamento direto de arquivos com headers de cache adequados.

---
name: Modelagem de dados
description: Procedimento para modelar entidades, relacionamentos, migrações Flyway, índices e integridade nos bancos PostgreSQL e MongoDB do MangaNetWorking.
---

# Skill — Modelagem e integridade de dados

Use esta skill para criar/alterar modelo, migração, índice, relação ou regra de integridade. Ela diz **como** executar sem quebrar dados existentes nem violar a fronteira entre os bancos.

## Quando usar

- Nova tabela/coluna/índice ou migração Flyway (`V*__*.sql`).
- Nova entidade JPA ou documento Mongo e seus repositórios.
- Relação, constraint, unicidade, idempotência ou criptografia de coluna.
- Não use para: lógica de caso de uso (skill `backend-spring`) ou revisão de diff (skill `code-review`).

## Contexto mínimo

1. `docs/decisions/ADR-001` (Postgres × Mongo × storage) e `ADR-003` (ledger idempotente).
2. `docs/skills/backend-spring/architecture.md` — pacotes `domain/` e `repository/`.
3. As migrações em `backend/src/main/resources/db/migration/` e as entidades que elas refletem.
4. `docs/reviews/SECURITY_REQUIREMENTS.md` — para dados sensíveis e retenção.

## Fronteira dos bancos (não misture)

- **PostgreSQL (fonte da verdade ACID):** identidade, credenciais, catálogo/obras/capítulos, permissões, assinaturas, doações, ledger financeiro. Integridade referencial estrita.
- **MongoDB (documental/leitura rápida):** `reading_progress`, `feed_works`, `engagement_events`, `creator_missions`. Consistência eventual tolerada, sem quebrar o sistema.
- **Binário nunca em banco:** só referência, MIME, dimensões e ordem (storage/ADR-001).

## Procedimento

1. **Inspecione** o esquema real (migrações aplicadas + entidades) antes de propor mudança. Nunca edite uma migração já aplicada — crie a próxima versão.
2. **Decida o banco** pela natureza do dado (transacional/ACID × documental/frequente) usando a fronteira acima.
3. **Modele:** nomes coerentes com as tabelas existentes; tipos e nullability explícitos; FK e unicidade onde houver invariante real.
4. **Escreva a migração Flyway** com default compatível com registros existentes. Pense no custo em tabela grande e no caminho de rollback/recuperação.
5. **Índices** para as consultas reais (lookups, ordenação, unicidade), evitando índice decorativo. Dado sensível (CPF/PIX) só criptografado (converter AES-256-GCM existente).
6. **Idempotência/unicidade:** credite operações por chave única (`paymentExternalId` no ledger append-only) para suportar reenvio de webhook.
7. **Verifique:** subir os bancos via `docker-compose.yml`, aplicar migração, rodar a suíte (`cmd /c mvn test`) e revisar `git diff --check`.

## Limites

- Não altere tipo/coluna existente de forma destrutiva sem default e sem avaliar dados reais.
- Não guarde valor derivado/desnormalizado no Postgres se ele é projeção do Mongo (o inverso também vale).
- Cálculo financeiro e taxas pertencem a `PlatformProperties`/`MonetizationService`, não ao esquema.
- Exclusão/anonimização (LGPD) precisa cobrir tabelas, documentos, storage e auditoria de forma consistente.

## Critérios de aceite

- Migração aplica em banco com dados existentes; nenhum registro perde dado por default ruim.
- Entidades/repositórios refletem o esquema; invariantes garantidas por constraint/unicidade e não só por código.
- Consultas quentes têm índice adequado; nenhum binário no banco.
- Testes e build verdes; `IMPLEMENTATION_STATUS.md` atualizado só com resultado observado.

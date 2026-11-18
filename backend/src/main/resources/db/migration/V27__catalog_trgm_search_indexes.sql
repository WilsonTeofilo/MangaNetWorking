-- =============================================================================
-- V27 - Índices GIN (pg_trgm) para busca textual eficiente no catálogo
-- =============================================================================
-- TASK-TRGM-SEARCH-001
--
-- Problema: CatalogQueryService usa LIKE %termo% em title, synopsis, handle e name.
-- Com wildcard à esquerda, índices B-Tree padrão são ignorados → full seq scan.
-- Solução: extensão pg_trgm + índices GIN que suportam LIKE %x% via trigrama.
--
-- A extensão pg_trgm faz parte do postgresql-contrib, disponível na imagem
-- postgres:16-alpine. Em ambientes Testcontainers (postgres:16), também inclusa.
-- =============================================================================

-- Habilita extensão pg_trgm (idempotente — não falha se já existir)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Índice GIN em works.title (busca por título da obra)
CREATE INDEX IF NOT EXISTS idx_works_title_trgm
    ON works USING GIN (title gin_trgm_ops);

-- Índice GIN em works.synopsis (busca por sinopse)
CREATE INDEX IF NOT EXISTS idx_works_synopsis_trgm
    ON works USING GIN (synopsis gin_trgm_ops);

-- Índice GIN em creators.handle (busca por handle do criador)
CREATE INDEX IF NOT EXISTS idx_creators_handle_trgm
    ON creators USING GIN (handle gin_trgm_ops);

-- Índice GIN em users.name (busca por nome do usuário)
CREATE INDEX IF NOT EXISTS idx_users_name_trgm
    ON users USING GIN (name gin_trgm_ops);

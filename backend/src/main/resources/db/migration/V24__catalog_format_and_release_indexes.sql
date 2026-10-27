-- Índices do catálogo e da timeline de lançamentos.
-- V1..V23 são imutáveis; esta versão só cria índices (nenhuma coluna nova).

-- Eixo 1 do catálogo: formato + estado visível. Consultas sempre excluem suspensa/LGPD.
CREATE INDEX IF NOT EXISTS idx_works_format_status ON works (work_format, status);

-- Ordenações suportadas pelo catálogo (relevância usa total_views).
CREATE INDEX IF NOT EXISTS idx_works_created_at ON works (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_works_updated_at ON works (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_works_total_views ON works (total_views DESC);

-- Gênero: filtro por coleção de elementos (work_genres.genre) + junção de volta na obra.
CREATE INDEX IF NOT EXISTS idx_work_genres_genre ON work_genres (genre, work_id);

-- Timeline de lançamentos: capítulos já públicos, mais recentes primeiro.
CREATE INDEX IF NOT EXISTS idx_chapters_public_release_at ON chapters (public_release_at DESC);

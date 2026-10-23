-- Separação de sinais: favorito/biblioteca (estrela) != curtida da obra (coração).
-- O contador antigo `total_likes` era incrementado pelo toggle da biblioteca; por isso
-- ele é renomeado para `total_favorites` (preserva o histórico real) e a curtida da obra
-- passa a ter um contador próprio.
ALTER TABLE works RENAME COLUMN total_likes TO total_favorites;
ALTER TABLE works ADD COLUMN total_likes BIGINT NOT NULL DEFAULT 0;

-- Curtida da obra: 1 por usuário/obra. A chave substituta simplifica o mapeamento JPA;
-- a unicidade de negócio fica na constraint (user_id, work_id).
CREATE TABLE work_likes (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    work_id UUID NOT NULL REFERENCES works(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_work_likes_user_work UNIQUE (user_id, work_id)
);
CREATE INDEX idx_work_likes_work ON work_likes (work_id);

-- Curtida de capítulo: 1 por usuário/capítulo. O contador `chapters.likes`
-- é atualizado de forma atômica pelo serviço.
CREATE TABLE chapter_likes (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_chapter_likes_user_chapter UNIQUE (user_id, chapter_id)
);
CREATE INDEX idx_chapter_likes_chapter ON chapter_likes (chapter_id);

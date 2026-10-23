-- Comentários com respostas (profundidade 1), curtidas, edição e moderação.
-- A exclusão é lógica: preserva a conversa e evita apagar respostas de terceiros.
ALTER TABLE work_comments
    ADD COLUMN parent_id UUID REFERENCES work_comments(id) ON DELETE CASCADE,
    ADD COLUMN likes_count BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'VISIBLE',
    ADD COLUMN edited_at TIMESTAMP WITHOUT TIME ZONE,
    ADD COLUMN deleted_at TIMESTAMP WITHOUT TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_work_comments_parent
    ON work_comments (parent_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_work_comments_chapter
    ON work_comments (chapter_id, created_at DESC);

CREATE TABLE IF NOT EXISTS comment_likes (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    comment_id UUID NOT NULL REFERENCES work_comments(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_comment_likes_user_comment UNIQUE (user_id, comment_id)
);

CREATE INDEX IF NOT EXISTS idx_comment_likes_comment
    ON comment_likes (comment_id);

CREATE TABLE IF NOT EXISTS comment_reports (
    id UUID PRIMARY KEY,
    comment_id UUID NOT NULL REFERENCES work_comments(id) ON DELETE CASCADE,
    reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason VARCHAR(40) NOT NULL,
    details VARCHAR(500),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    resolution_notes VARCHAR(500),
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITHOUT TIME ZONE,
    CONSTRAINT uq_comment_reports_comment_reporter UNIQUE (comment_id, reporter_id)
);

CREATE INDEX IF NOT EXISTS idx_comment_reports_status
    ON comment_reports (status, created_at ASC);

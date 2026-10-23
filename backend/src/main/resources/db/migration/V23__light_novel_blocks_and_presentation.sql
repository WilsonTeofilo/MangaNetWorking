-- Formato de blocos do capítulo de light novel + apresentação visual da obra.
-- V1..V22 são imutáveis; esta versão só acrescenta colunas e restrições.

ALTER TABLE chapters
    ADD COLUMN chapter_type VARCHAR(20) NOT NULL DEFAULT 'REGULAR',
    ADD COLUMN blocks_json TEXT,
    ADD COLUMN blocks_version INTEGER;

ALTER TABLE works
    ADD COLUMN presentation_json TEXT;

ALTER TABLE chapters
    ADD CONSTRAINT ck_chapter_type CHECK (chapter_type IN ('REGULAR', 'PROLOGUE', 'SPECIAL'));

-- Blocos são exclusivos com páginas de mangá. Prosa pode usar blocos (formato novo) ou
-- content_text (formato legado); a constraint abaixo impede a mistura dos dois mundos.
ALTER TABLE chapters
    ADD CONSTRAINT ck_chapter_blocks_by_format CHECK (
        blocks_json IS NULL
        OR (chapter_format = 'PROSE' AND pages_json IS NULL AND blocks_version IS NOT NULL)
    );

ALTER TABLE chapters
    ADD CONSTRAINT ck_chapter_blocks_version CHECK (blocks_version IS NULL OR blocks_version >= 1);

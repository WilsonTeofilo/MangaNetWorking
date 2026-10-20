-- Mantém registros legados como mangá de páginas; V1..V7 permanecem imutáveis.
ALTER TABLE works
    ADD COLUMN work_format VARCHAR(20) NOT NULL DEFAULT 'MANGA';

ALTER TABLE chapters
    ADD COLUMN chapter_format VARCHAR(20) NOT NULL DEFAULT 'IMAGE_PAGES',
    ADD COLUMN content_text TEXT;

ALTER TABLE chapters
    ALTER COLUMN pages_json DROP NOT NULL;

ALTER TABLE chapters
    ADD CONSTRAINT ck_chapter_content_by_format CHECK (
        (chapter_format = 'IMAGE_PAGES' AND pages_json IS NOT NULL AND content_text IS NULL)
        OR (chapter_format = 'PROSE' AND content_text IS NOT NULL AND length(trim(content_text)) > 0 AND pages_json IS NULL)
    );

ALTER TABLE works
    ADD CONSTRAINT ck_work_format CHECK (work_format IN ('MANGA', 'LIGHT_NOVEL'));

ALTER TABLE chapters
    ADD CONSTRAINT ck_chapter_format CHECK (chapter_format IN ('IMAGE_PAGES', 'PROSE'));

-- V4: relação dedicada arquivo -> capítulo para o controle de acesso às páginas de capítulo.
--
-- Antes, o guard procurava a página com LIKE em chapters.pages_json: varredura completa da tabela a
-- cada GET /api/storage/{arquivo} e falso positivo de substring (ex.: "a.png" casando com "x-a.png").
-- Aqui cada página vira uma linha, com índice único exato em filename -- que é exatamente o valor
-- recebido na rota do storage.
--
-- Observação: chapters.pages_json continua sendo a fonte do contrato do leitor (array JSON de URLs
-- "/api/storage/<arquivo>"); chapter_files é o índice de acesso derivado dele.

CREATE TABLE IF NOT EXISTS chapter_files (
    id UUID PRIMARY KEY,
    chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    position INTEGER NOT NULL,
    CONSTRAINT uq_chapter_files_filename UNIQUE (filename)
);

CREATE INDEX IF NOT EXISTS idx_chapter_files_chapter ON chapter_files (chapter_id, position);

-- Backfill dos capítulos já existentes. Aceita tanto a URL de página ("/api/storage/<arquivo>",
-- formato gravado hoje pelo frontend) quanto o nome puro do arquivo. Cada capítulo é processado em
-- um sub-bloco com tratador de exceção para que um pages_json malformado seja apenas ignorado (com
-- aviso no log), sem abortar a migração e derrubar o boot.
DO $$
DECLARE
    cap RECORD;
    page RECORD;
    stored_name TEXT;
BEGIN
    FOR cap IN SELECT id, pages_json FROM chapters LOOP
        BEGIN
            FOR page IN
                SELECT value, ordinality
                FROM json_array_elements_text(cap.pages_json::json) WITH ORDINALITY AS t(value, ordinality)
            LOOP
                -- Tudo depois da última '/' e antes de '?' -- mesma normalização do StorageFileNames.
                stored_name := split_part(regexp_replace(page.value, '^.*/', ''), '?', 1);
                IF stored_name <> '' THEN
                    INSERT INTO chapter_files (id, chapter_id, filename, position)
                    VALUES (gen_random_uuid(), cap.id, stored_name, (page.ordinality - 1)::int)
                    ON CONFLICT (filename) DO NOTHING;
                END IF;
            END LOOP;
        EXCEPTION WHEN others THEN
            RAISE WARNING 'chapter_files: backfill ignorado no capítulo % (pages_json inválido: %)',
                cap.id, SQLERRM;
        END;
    END LOOP;
END $$;

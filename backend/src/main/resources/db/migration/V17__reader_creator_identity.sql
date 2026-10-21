-- Identidade do usuário, vínculo social do escritor, seguidores e comentários.
--
-- 1) `users.username`: identificador único e imutável, usado como segunda forma de login
--    (além do e-mail). Backfill determinístico para as contas existentes.
-- 2) `users.sex`: dado de perfil exigido no cadastro (MASCULINO/FEMININO/OUTRO/NAO_INFORMADO).
-- 3) `creator_follows`: seguidores. Só escritores (linhas em `creators`) podem ser seguidos;
--    leitores não têm seguidores.
-- 4) `work_comments`: comentários da obra. Mostram o username do autor; os demais dados do
--    perfil só aparecem para quem tem perfil público (regra aplicada no serviço).
ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(30);

UPDATE users
SET username = 'user_' || substr(replace(id::text, '-', ''), 1, 12)
WHERE username IS NULL;

ALTER TABLE users ALTER COLUMN username SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS users_username_lower_key ON users (lower(username));

ALTER TABLE users ADD COLUMN IF NOT EXISTS sex VARCHAR(20) NOT NULL DEFAULT 'NAO_INFORMADO';

CREATE TABLE IF NOT EXISTS creator_follows (
    follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (follower_id, creator_id),
    CONSTRAINT creator_follows_no_self_follow CHECK (follower_id <> creator_id)
);

CREATE INDEX IF NOT EXISTS idx_creator_follows_creator ON creator_follows (creator_id, created_at DESC);

CREATE TABLE IF NOT EXISTS work_comments (
    id UUID PRIMARY KEY,
    work_id UUID NOT NULL REFERENCES works(id) ON DELETE CASCADE,
    chapter_id UUID REFERENCES chapters(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body VARCHAR(1000) NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT work_comments_body_length CHECK (char_length(btrim(body)) BETWEEN 1 AND 1000)
);

CREATE INDEX IF NOT EXISTS idx_work_comments_work ON work_comments (work_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_work_comments_user ON work_comments (user_id);

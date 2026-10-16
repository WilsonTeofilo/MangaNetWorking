-- Papel editorial de moderação (anti-pirataria / anti-hentai).
-- Nunca concedido pelo cliente: apenas via banco ou processo interno.
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_moderator BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_users_is_moderator ON users (is_moderator) WHERE is_moderator = TRUE;

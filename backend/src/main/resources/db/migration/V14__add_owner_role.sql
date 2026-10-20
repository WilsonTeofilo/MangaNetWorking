-- Papel de proprietário da plataforma. Não é concedido por cadastro público:
-- apenas por processo administrativo interno (seed/operação), como o de moderador.
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_owner BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_users_is_owner ON users (is_owner) WHERE is_owner = TRUE;

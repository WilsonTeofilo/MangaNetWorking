CREATE TABLE password_reset_tokens (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    -- SHA-256 em hexadecimal tem 64 caracteres; VARCHAR alinha a validação do Hibernate
    -- (CHAR vira bpchar no PostgreSQL e o ddl-auto=validate recusaria a coluna).
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);

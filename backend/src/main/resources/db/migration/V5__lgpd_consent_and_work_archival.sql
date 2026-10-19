-- V5__lgpd_consent_and_work_archival.sql
-- Conformidade LGPD (Lei 13.709/2018):
-- 1. Registro explícito de consentimento e termos (Art. 7º, I e Art. 8º)
-- 2. Data de nascimento para proteção e segregação de menores de 18 anos (Art. 14)
-- 3. Suporte ao arquivamento de obras no direito ao esquecimento (Art. 18, VI)

-- 1. Colunas de Consentimento e Maioridade na tabela users
ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMP WITHOUT TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS privacy_policy_version VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS birth_date DATE;

-- 2. Backfill seguro para usuários existentes (preserva integridade)
UPDATE users 
SET terms_accepted_at = created_at,
    privacy_policy_version = 'v1.0'
WHERE terms_accepted_at IS NULL;

-- 3. Índice para auditoria rápida de consentimento
CREATE INDEX IF NOT EXISTS idx_users_terms_accepted ON users (terms_accepted_at);

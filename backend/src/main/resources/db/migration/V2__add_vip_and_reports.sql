-- V2__add_vip_and_reports.sql
-- Adiciona suporte a Assinatura VIP (Sem Anúncios) e Tabela de Denúncias/Moderação Anti-Pirataria

-- 1. Colunas de Assinatura VIP na tabela users
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_vip BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS vip_expires_at TIMESTAMP WITHOUT TIME ZONE;

-- 2. Expansão de tamanho para suportar criptografia AES-256 em dados sensíveis do Criador
ALTER TABLE creators ALTER COLUMN document_cpf TYPE VARCHAR(255);

-- 2. Tabela de Denúncias e Moderação Anti-Pirataria / Anti-Hentai
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY,
    reporter_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    work_id UUID REFERENCES works(id) ON DELETE CASCADE,
    chapter_id UUID REFERENCES chapters(id) ON DELETE SET NULL,
    reason VARCHAR(50) NOT NULL, -- COPYRIGHT_PIRACY, PORNOGRAPHY_HENTAI, HARASSMENT, OTHER
    description TEXT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING', -- PENDING, INVESTIGATING, RESOLVED_SUSPENDED, DISMISSED
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITHOUT TIME ZONE,
    resolution_notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_work ON reports(work_id);

-- 4. Ajuste no Ledger Financeiro para suportar transações globais da plataforma (ex: Assinatura VIP sem anúncios)
ALTER TABLE financial_ledger ALTER COLUMN creator_id DROP NOT NULL;
ALTER TABLE financial_ledger ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;


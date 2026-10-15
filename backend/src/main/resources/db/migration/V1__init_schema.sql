-- V1__init_schema.sql
-- MangaNetWorking: Schema Relacional PostgreSQL Inicial com Flyway

-- Tabela de Usuários
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    avatar_url VARCHAR(500),
    is_creator BOOLEAN NOT NULL DEFAULT FALSE,
    is_profile_public BOOLEAN NOT NULL DEFAULT TRUE,
    password_hash VARCHAR(255),
    two_factor_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    two_factor_secret VARCHAR(255),
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Criadores / Autores
CREATE TABLE IF NOT EXISTS creators (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    handle VARCHAR(50) NOT NULL UNIQUE,
    bio TEXT,
    avatar_url VARCHAR(500),
    instagram_url VARCHAR(255),
    youtube_url VARCHAR(255),
    portfolio_url VARCHAR(255),
    monetization_level INTEGER NOT NULL DEFAULT 0,
    document_cpf VARCHAR(20) NOT NULL,
    pix_key VARCHAR(255) NOT NULL,
    pix_key_type VARCHAR(20) NOT NULL,
    membership_price_brl NUMERIC(10, 2) NOT NULL DEFAULT 23.00,
    wallet_balance_brl NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    monthly_members_count INTEGER NOT NULL DEFAULT 0,
    total_donations_brl NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    verified BOOLEAN NOT NULL DEFAULT FALSE,
    engagement_boost_mul DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    engagement_boost_until TIMESTAMP WITHOUT TIME ZONE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Obras de Mangá
CREATE TABLE IF NOT EXISTS works (
    id UUID PRIMARY KEY,
    author_id UUID NOT NULL REFERENCES creators(id) ON DELETE RESTRICT,
    title VARCHAR(150) NOT NULL,
    slug VARCHAR(150) NOT NULL UNIQUE,
    original_title VARCHAR(150),
    synopsis TEXT,
    cover_url VARCHAR(500) NOT NULL,
    banner_url VARCHAR(500),
    status VARCHAR(20) NOT NULL DEFAULT 'ongoing',
    total_chapters INTEGER NOT NULL DEFAULT 0,
    total_views BIGINT NOT NULL DEFAULT 0,
    total_likes BIGINT NOT NULL DEFAULT 0,
    total_comments BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Gêneros de Obra
CREATE TABLE IF NOT EXISTS work_genres (
    work_id UUID NOT NULL REFERENCES works(id) ON DELETE CASCADE,
    genre VARCHAR(50) NOT NULL,
    PRIMARY KEY (work_id, genre)
);

-- Tabela de Capítulos
CREATE TABLE IF NOT EXISTS chapters (
    id UUID PRIMARY KEY,
    work_id UUID NOT NULL REFERENCES works(id) ON DELETE CASCADE,
    chapter_number INTEGER NOT NULL,
    title VARCHAR(200) NOT NULL,
    cover_url VARCHAR(500),
    pages_json TEXT NOT NULL,
    public_release_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    views BIGINT NOT NULL DEFAULT 0,
    likes BIGINT NOT NULL DEFAULT 0,
    comments_count BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_work_chapter_number UNIQUE (work_id, chapter_number)
);

-- Tabela de Obras Curtidas pelo Usuário (Biblioteca)
CREATE TABLE IF NOT EXISTS user_liked_works (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    work_id UUID NOT NULL REFERENCES works(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, work_id)
);

-- Tabela de Doações Avulsas (Split 17% / 83%)
CREATE TABLE IF NOT EXISTS donations (
    id UUID PRIMARY KEY,
    donor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE RESTRICT,
    work_id UUID REFERENCES works(id) ON DELETE SET NULL,
    chapter_id UUID REFERENCES chapters(id) ON DELETE SET NULL,
    gross_amount_brl NUMERIC(10, 2) NOT NULL,
    platform_fee_brl NUMERIC(10, 2) NOT NULL, -- 17%
    creator_net_brl NUMERIC(10, 2) NOT NULL,  -- 83%
    message VARCHAR(300),
    status VARCHAR(30) NOT NULL,
    payment_external_id VARCHAR(100),
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Assinaturas de Membros
CREATE TABLE IF NOT EXISTS membership_subscriptions (
    id UUID PRIMARY KEY,
    subscriber_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE RESTRICT,
    monthly_price_brl NUMERIC(10, 2) NOT NULL,
    platform_fee_brl NUMERIC(10, 2) NOT NULL,
    creator_net_brl NUMERIC(10, 2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    starts_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    expires_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_subscriber_creator UNIQUE (subscriber_user_id, creator_id)
);

-- Tabela de Ledger Financeiro Append-Only (Idempotente)
CREATE TABLE IF NOT EXISTS financial_ledger (
    id UUID PRIMARY KEY,
    payment_external_id VARCHAR(120) NOT NULL UNIQUE,
    creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE RESTRICT,
    transaction_type VARCHAR(40) NOT NULL,
    gross_amount_brl NUMERIC(12, 2) NOT NULL,
    fee_rate_percent NUMERIC(5, 2) NOT NULL DEFAULT 17.00,
    platform_fee_brl NUMERIC(12, 2) NOT NULL,
    creator_net_brl NUMERIC(12, 2) NOT NULL,
    wallet_balance_after_brl NUMERIC(12, 2) NOT NULL,
    description VARCHAR(200),
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_ledger_creator ON financial_ledger(creator_id);

-- Tabela de Ledger de Anúncios (A cada 30 páginas lidas: split 58% / 42%)
CREATE TABLE IF NOT EXISTS ad_revenue_ledger (
    id UUID PRIMARY KEY,
    creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE RESTRICT,
    work_id UUID NOT NULL REFERENCES works(id) ON DELETE CASCADE,
    pages_read_threshold INTEGER NOT NULL DEFAULT 30,
    gross_ad_value_brl NUMERIC(10, 4) NOT NULL,
    creator_share_brl NUMERIC(10, 4) NOT NULL,   -- 58%
    platform_share_brl NUMERIC(10, 4) NOT NULL,  -- 42%
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_ad_creator ON ad_revenue_ledger(creator_id);

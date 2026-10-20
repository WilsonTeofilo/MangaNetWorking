-- Checkouts avulsos de apoio. O identificador idempotente é por conta e produto;
-- o webhook continua sendo a única origem de ativação/crédito.
CREATE TABLE support_checkout_intents (
    checkout_reference VARCHAR(16) PRIMARY KEY,
    payer_user_id UUID NOT NULL REFERENCES users(id),
    creator_id UUID NOT NULL REFERENCES creators(id),
    work_id UUID REFERENCES works(id),
    chapter_id UUID REFERENCES chapters(id),
    product_type VARCHAR(20) NOT NULL CHECK (product_type IN ('DONATION', 'MEMBERSHIP')),
    idempotency_key VARCHAR(36) NOT NULL,
    expected_amount_brl NUMERIC(12, 2) NOT NULL CHECK (expected_amount_brl > 0),
    message VARCHAR(300),
    preference_id VARCHAR(120) UNIQUE,
    checkout_url VARCHAR(500),
    processed_payment_id VARCHAR(100) UNIQUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_support_checkout_idempotency UNIQUE (payer_user_id, product_type, idempotency_key)
);

CREATE INDEX idx_support_checkout_creator ON support_checkout_intents (creator_id, created_at DESC);

-- Associação autoritativa entre o checkout criado no servidor e o pagamento notificado.
-- O vínculo vem de external_reference (MN_VIP|<userId>|<checkout_reference>), que o
-- Mercado Pago devolve no objeto de pagamento. metadata NÃO é fonte de verdade.
CREATE TABLE mercadopago_checkout_preferences (
    checkout_reference VARCHAR(64) PRIMARY KEY,
    preference_id VARCHAR(120) NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES users(id),
    expected_amount_brl NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_mercadopago_checkout_user ON mercadopago_checkout_preferences(user_id);

-- Idempotência de pagamentos: financial_ledger.payment_external_id já é UNIQUE.
-- Não há tabela paralela de pagamentos processados (fonte única transacional).

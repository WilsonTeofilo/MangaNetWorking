-- Eventos de entrega de e-mail (item 46 do roadmap: monitorar bounces).
--
-- O endereço do destinatário NÃO é gravado em claro: guardamos o hash SHA-256, o que
-- permite correlacionar e suprimir o envio sem duplicar dado pessoal em log.
-- A tabela é append-only: bounce, complaint e eventos de entrega não podem ser reescritos.
CREATE TABLE email_delivery_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email_hash CHAR(64) NOT NULL,
    event_type VARCHAR(30) NOT NULL,
    reason VARCHAR(120),
    provider VARCHAR(40),
    occurred_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_email_delivery_events_hash ON email_delivery_events(email_hash, occurred_at DESC);
CREATE INDEX idx_email_delivery_events_type ON email_delivery_events(event_type, occurred_at DESC);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'email_delivery_events_append_only'
    ) THEN
        CREATE TRIGGER email_delivery_events_append_only
        BEFORE UPDATE OR DELETE ON email_delivery_events
        FOR EACH ROW EXECUTE FUNCTION prevent_privacy_audit_mutation();
    END IF;
END;
$$;

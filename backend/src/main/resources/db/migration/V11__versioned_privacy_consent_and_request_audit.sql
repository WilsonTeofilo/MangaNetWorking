-- V5 inferiu aceite ao copiar created_at para terms_accepted_at. Isso não prova consentimento.
-- Neutralizamos apenas esse padrão para exigir aceite explícito na versão configurada pela plataforma.
UPDATE users
SET terms_accepted_at = NULL,
    privacy_policy_version = NULL
WHERE terms_accepted_at = created_at
  AND privacy_policy_version = 'v1.0';

CREATE TABLE privacy_consent_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    policy_version VARCHAR(80) NOT NULL,
    purpose VARCHAR(40) NOT NULL,
    accepted_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    remote_ip VARCHAR(64),
    user_agent VARCHAR(500)
);
CREATE INDEX idx_privacy_consent_user_time ON privacy_consent_events(user_id, accepted_at DESC);

CREATE TABLE privacy_request_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    request_type VARCHAR(40) NOT NULL,
    completed_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    remote_ip VARCHAR(64)
);
CREATE INDEX idx_privacy_request_user_time ON privacy_request_audit(user_id, completed_at DESC);

CREATE FUNCTION prevent_privacy_audit_mutation() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'Privacy audit events are append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER privacy_consent_events_append_only
BEFORE UPDATE OR DELETE ON privacy_consent_events
FOR EACH ROW EXECUTE FUNCTION prevent_privacy_audit_mutation();

CREATE TRIGGER privacy_request_audit_append_only
BEFORE UPDATE OR DELETE ON privacy_request_audit
FOR EACH ROW EXECUTE FUNCTION prevent_privacy_audit_mutation();

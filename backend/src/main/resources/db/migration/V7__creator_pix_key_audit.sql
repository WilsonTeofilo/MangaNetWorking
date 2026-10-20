CREATE TABLE creator_pix_key_audit (
    id UUID PRIMARY KEY,
    creator_id UUID NOT NULL REFERENCES creators(id),
    actor_user_id UUID NOT NULL REFERENCES users(id),
    previous_key_type VARCHAR(30),
    previous_key_mask VARCHAR(8) NOT NULL,
    new_key_type VARCHAR(30) NOT NULL,
    new_key_mask VARCHAR(8) NOT NULL,
    client_ip VARCHAR(45) NOT NULL,
    changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_creator_pix_key_audit_creator_changed
    ON creator_pix_key_audit(creator_id, changed_at DESC);

CREATE FUNCTION prevent_creator_pix_key_audit_mutation() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'creator_pix_key_audit is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER creator_pix_key_audit_append_only
    BEFORE UPDATE OR DELETE ON creator_pix_key_audit
    FOR EACH ROW EXECUTE FUNCTION prevent_creator_pix_key_audit_mutation();

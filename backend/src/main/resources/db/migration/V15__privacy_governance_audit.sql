-- Auditoria append-only das ações de governança de dados (item 48 do roadmap).
--
-- O saneamento de CPF sentinela legado é executado pelo servidor (o CPF é cifrado em repouso
-- e não pode ser inspecionado por SQL) e cada ação fica registrada aqui, com ator,
-- alvo e detalhes, em uma tabela que não aceita UPDATE nem DELETE.
CREATE TABLE privacy_governance_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action VARCHAR(60) NOT NULL,
    actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    target_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    target_creator_id UUID REFERENCES creators(id) ON DELETE SET NULL,
    details JSONB,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_privacy_governance_action_time ON privacy_governance_actions(action, created_at DESC);
CREATE INDEX idx_privacy_governance_actor ON privacy_governance_actions(actor_user_id, created_at DESC);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'privacy_governance_actions_append_only'
    ) THEN
        CREATE TRIGGER privacy_governance_actions_append_only
        BEFORE UPDATE OR DELETE ON privacy_governance_actions
        FOR EACH ROW EXECUTE FUNCTION prevent_privacy_audit_mutation();
    END IF;
END;
$$;

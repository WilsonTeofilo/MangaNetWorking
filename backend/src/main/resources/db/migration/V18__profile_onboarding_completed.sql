-- Perfil configurado: o titular já escolheu foto e/ou visibilidade.
--
-- A sessão usa este sinal para decidir entre abrir o app ou levar ao primeiro
-- acesso (montar o perfil). Sem ele, todo login caía no onboarding mesmo com o
-- perfil já pronto.
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_onboarding_completed_at TIMESTAMP WITHOUT TIME ZONE;

-- Contas antigas que já têm foto (ou que já interagiram com o perfil) contam
-- como configuradas: não devem voltar ao primeiro acesso.
UPDATE users
SET profile_onboarding_completed_at = COALESCE(updated_at, created_at, CURRENT_TIMESTAMP)
WHERE profile_onboarding_completed_at IS NULL
  AND (avatar_url IS NOT NULL AND btrim(avatar_url) <> '');

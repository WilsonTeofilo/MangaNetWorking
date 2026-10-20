-- Novos criadores podem concluir cadastro sem CPF, mas não monetizam sem CPF válido.
-- Dados legados permanecem intactos para onboarding corretivo e auditoria.
ALTER TABLE creators ALTER COLUMN document_cpf DROP NOT NULL;

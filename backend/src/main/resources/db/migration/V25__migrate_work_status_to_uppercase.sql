-- Migration V25: Normaliza a coluna status da tabela works para UPPERCASE
-- e define o valor default alinhado ao enum WorkStatus.ONGOING.

UPDATE works
   SET status = UPPER(status)
 WHERE status IS NOT NULL;

ALTER TABLE works
  ALTER COLUMN status SET DEFAULT 'ONGOING';

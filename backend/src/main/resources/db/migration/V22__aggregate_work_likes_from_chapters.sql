-- Curtidas de obra passam a ser a soma das curtidas dos capítulos.
-- A tabela work_likes era uma curtida separada da obra e foi removida do produto:
-- curtir é uma ação do capítulo; a obra apenas agrega os capítulos.
UPDATE works w
SET total_likes = COALESCE(
    (SELECT SUM(c.likes)::bigint FROM chapters c WHERE c.work_id = w.id),
    0
);

DROP TABLE IF EXISTS work_likes;

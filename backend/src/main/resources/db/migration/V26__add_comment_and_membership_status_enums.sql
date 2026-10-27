-- V26: Normalizacao de status de comentarios, denuncias de comentarios e assinaturas de membro
-- Assegura consistencia com os novos enums (CommentStatus, CommentReportStatus, MembershipStatus)

UPDATE work_comments
   SET status = UPPER(TRIM(status))
 WHERE status IS NOT NULL;

UPDATE comment_reports
   SET status = UPPER(TRIM(status))
 WHERE status IS NOT NULL;

UPDATE membership_subscriptions
   SET status = UPPER(TRIM(status))
 WHERE status IS NOT NULL;

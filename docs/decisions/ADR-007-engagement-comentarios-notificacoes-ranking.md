# ADR-007 — Engajamento, comentários, notificações e ranking

- **Data:** 2026-10-22
- **Status:** aceito para a implementação local; push real pendente de infraestrutura
- **Contexto:** curtidas, favoritos, views, comentários e notificações precisavam de fontes de
  verdade distintas. O legado chamava favorito de "like" (`works.total_likes`), a view era
  deduplicada para sempre e não havia comunidade nem central de avisos.

## Decisões

1. **Favorito ≠ curtida.** `user_liked_works` + `works.total_favorites` representam a biblioteca.
   Curtidas ficam em `work_likes`/`chapter_likes`, com contadores próprios (`works.total_likes`,
   `chapters.likes`). Toggle usa `INSERT ... ON CONFLICT DO NOTHING` e só altera contador quando a
   linha realmente mudou.
2. **View diária qualificada.** `VIEW` vale 1 por leitor/capítulo/dia em `America/Sao_Paulo`
   (`userId:VIEW:chapterId:AAAA-MM-DD`, `eventVersion=2`). O front só envia depois que a primeira
   página fica ≥50% visível por ~1 s ou após navegar para página >1. Abrir e sair não conta.
   Visitante sem sessão não gera view; não usamos fingerprint/IP.
3. **Comentários com profundidade 1.** `work_comments` ganhou `parent_id`, `likes_count`, `status`,
   `edited_at` e `deleted_at`; curtidas em `comment_likes` e denúncias em `comment_reports`, ambas
   com unicidade por usuário. Exclusão é lógica para preservar respostas. O corpo é sanitizado e
   renderizado como texto. Publicação tem limite por minuto e só em obra publicada.
4. **Selo de membro calculado no servidor.** A estrela amarela exige assinatura `ACTIVE` e não
   expirada do criador dono da obra; não é VIP/Premium e não aceita campo do cliente.
5. **Notificação interna ≠ push.** A central em `notifications` é persistida e idempotente por
   `(user_id, dedup_key)`. Eventos: novo capítulo de favorito (acesso antecipado respeitado e job
   de liberação para os demais), resposta e marcos de curtida. A própria ação nunca notifica.
   Push real depende de VAPID, HTTPS/domínio e serviço de entrega; permanece bloqueado.
6. **Rankings separados.** Obras usam `log1p` para views/curtidas/favoritos/comentários/capítulos,
   bônus de recência, decaimento temporal, qualidade de engajamento e boost de criador. Comentários
   usam `curtidas × 2 + respostas × 0,5 − idade_em_dias × 0,1`, com desempate por data e id.
   Curadoria/diversidade de superfície continua responsabilidade do feed/catálogo.

## Consequências

- O legado `total_likes` foi renomeado para `total_favorites` na V19; contratos antigos que
  esperavam "like" como biblioteca precisam usar `favorite`/`totalFavorites`.
- V20 e V21 são migrations aditivas; não há backfill de notificações nem de curtidas antigas.
- A moderação de comentários tem API (`/api/reports/comments/**`) e fila, mas ainda não tem tela
  dedicada. Push, leitura anônima, progresso de prosa e coortes seguem fora de escopo.

# Inventário de dados e encarregado (DPO)

> Item 47 do roadmap (`ROADMAP-FASES.md`). Este documento é o **modelo operacional** do
> inventário e do canal do encarregado. Nome, prazo, base legal e canal **não são inventados
> aqui**: as colunas marcadas como ⛔ dependem de decisão/aprovação humana.

## 1. Inventário de tratamento (Art. 6º e Art. 30 da LGPD)

| # | Dado/categoria | Finalidade | Base legal (a aprovar) | Retenção (a aprovar) | Onde fica | Cifra/controle | Status |
|---|---|---|---|---|---|---|---|
| 1 | Cadastro (nome, e-mail, data de nascimento) | conta e autenticação | execução de contrato / consentimento ⛔ | enquanto a conta existir ⛔ | PostgreSQL `users` | senha com hash; sessão em cookie HttpOnly | implementado |
| 2 | Identidade fiscal (CPF) e chave PIX | repasses a criadores | obrigação legal/fiscal ⛔ | enquanto houver repasse ⛔ | PostgreSQL `creators` | AES-256-GCM em repouso | implementado |
| 3 | Eventos de consentimento e auditoria de privacidade | prova de consentimento (Art. 8º) | obrigação legal ⛔ | append-only; prazo ⛔ | PostgreSQL `privacy_consent_events`, `privacy_request_audit` | append-only (trigger) | implementado |
| 4 | Ações de governança (saneamento de dados legados) | rastreabilidade do saneamento | obrigação legal ⛔ | append-only; prazo ⛔ | PostgreSQL `privacy_governance_actions` (V15) | append-only (trigger) | implementado |
| 5 | Eventos de entrega de e-mail (bounce/complaint) | reputação do domínio e supressão | legítimo interesse ⛔ | 180 dias ⛔ | PostgreSQL `email_delivery_events` (V16) | e-mail não gravado em claro (SHA-256) | implementado |
| 6 | Progresso de leitura e eventos de engajamento | recomendação e analytics | consentimento/legítimo interesse ⛔ | prazo ⛔ | MongoDB `reading_progress`, `engagement_events` | volume interno; sem CPF/PIX | implementado |
| 7 | Conteúdo publicado (obras, capítulos, páginas) | produto | contrato com autor | enquanto publicado | PostgreSQL + `data/uploads` | acesso por capítulo (guard de arquivo) | implementado |
| 8 | Denúncias e moderação | segurança da comunidade | obrigação legal/legítimo interesse ⛔ | prazo ⛔ | PostgreSQL `reports` | papel de moderação | implementado |
| 9 | Logs de aplicação e métricas | operação e segurança | legítimo interesse ⛔ | prazo ⛔ | stdout (structured logs), Prometheus | destinatários de e-mail mascarados | implementado |

Observações:

- Itens 3, 4 e 5 são **append-only**: a base recusa `UPDATE`/`DELETE`.
- A exclusão de conta (LGPD Art. 18) anonimiza o titular, revoga sessões, apaga binários e
  **remove privilégios** (`is_owner`, `is_moderator`, `is_creator`, VIP), verificação de e-mail e
  data de nascimento — ver `UserProfileLgpdTest`.
- CPF inválido/sentinela legado é saneado pelo procedimento controlado do item 48
  (`GET/POST /api/owner/privacy/legacy-personal-data`, `ROLE_OWNER`, auditoria append-only).

## 2. Encarregado (DPO) — canal e publicação

| Item | Valor | Responsável |
|---|---|---|
| Nome do encarregado | ⛔ pendente de nomeação | direção |
| Canal de contato publicado (e-mail institucional) | ⛔ pendente | direção |
| Prazo de resposta ao titular | ⛔ pendente | direção/jurídico |
| Canal do titular para exercício de direitos | rota da interface + e-mail institucional | produto |
| Publicação do contato | página pública + política de privacidade | produto/jurídico |

O sistema já oferece o que o encarregado precisa para operar: exportação de dados
(`GET /api/users/me/export`), exclusão de conta (`DELETE /api/users/me`), auditoria append-only
das operações e supressão de envio após bounce. O que falta é **a nomeação e a publicação** —
decisão humana, sem atalho técnico.

## 3. Como preencher e aprovar

1. Preencher as colunas ⛔ com a decisão aprovada (nome, prazos, base legal, canal).
2. Revisar a tabela com o encarregado e o jurídico; registrar data, responsável e a versão do documento.
3. Publicar a versão aprovada da Política de Privacidade via
   `ops/legal/publish-privacy-policy.ps1` (procedimento controlado, log append-only).
4. Atualizar este arquivo e `docs/orquestracao/AUDITORIA-ATUAL.md` com a evidência da aprovação.
5. Só então automatizar jobs de retenção por dataset e alertas de falha.

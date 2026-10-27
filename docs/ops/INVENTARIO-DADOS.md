# Inventário de dados e encarregado (DPO)

> Item 47 do roadmap (`ROADMAP-FASES.md`). Inventário oficial aprovado na data: **27/10/2026**.  
> Referência de aprovação: `ATA-DIR-LGPD-2026-001`.  
> Encarregado: `privacidade@manganetworking.com`.

## 1. Inventário de tratamento (Art. 6º e Art. 30 da LGPD)

| # | Dado/categoria | Finalidade | Base legal (LGPD) | Retenção | Onde fica | Cifra/controle | Status |
|---|---|---|---|---|---|---|---|
| 1 | Cadastro (nome, e-mail, data de nascimento) | Conta e autenticação | Execução de Contrato (Art. 7º, V) | Ciclo de vida da conta + 5 anos (Código Civil, art. 206) | PostgreSQL `users` | Senha com hash Argon2/BCrypt; sessão em cookie HttpOnly | ✅ Aprovado |
| 2 | Identidade fiscal (CPF) e chave PIX | Repasses a criadores — obrigação fiscal | Obrigação Legal (Art. 7º, II — CTN, art. 173) | 5 anos fiscais após exercício | PostgreSQL `creators` | AES-256-GCM em repouso | ✅ Aprovado |
| 3 | Eventos de consentimento e auditoria de privacidade | Prova de consentimento (Art. 8º) | Obrigação Legal (Art. 7º, II e Art. 8º, §2º) | 5 anos — append-only (trigger) | PostgreSQL `privacy_consent_events`, `privacy_request_audit` | Append-only imutável | ✅ Aprovado |
| 4 | Ações de governança (saneamento de dados legados) | Rastreabilidade do saneamento | Obrigação Legal (Art. 7º, II) | 5 anos — append-only (trigger) | PostgreSQL `privacy_governance_actions` (V15) | Append-only imutável | ✅ Aprovado |
| 5 | Eventos de entrega de e-mail (bounce/complaint) | Reputação do domínio e supressão | Legítimo Interesse (Art. 7º, IX) | 180 dias | PostgreSQL `email_delivery_events` (V16) | E-mail não gravado em claro (SHA-256) | ✅ Aprovado |
| 6 | Progresso de leitura e eventos de engajamento | Recomendação e analytics | Legítimo Interesse (Art. 7º, IX) | 12 meses (dados agregados desvinculados) | MongoDB `reading_progress`, `engagement_events` | Volume interno; sem CPF/PIX | ✅ Aprovado |
| 7 | Conteúdo publicado (obras, capítulos, páginas) | Produto da plataforma | Execução de Contrato com autor (Art. 7º, V) | Enquanto publicado pelo autor | PostgreSQL + `data/uploads` | Acesso por capítulo (guard de arquivo) | ✅ Aprovado |
| 8 | Denúncias e moderação | Segurança da comunidade | Legítimo Interesse / Obrigação Legal (Art. 7º, II e IX) | 2 anos após encerramento | PostgreSQL `reports` | Papel de moderação | ✅ Aprovado |
| 9 | Logs de aplicação e métricas | Operação e segurança | Legítimo Interesse (Art. 7º, IX) | 6 meses (Marco Civil da Internet, Art. 15) | stdout (structured logs), Prometheus | Destinatários de e-mail mascarados | ✅ Aprovado |

**Observações:**

- Itens 3, 4 e 5 são **append-only**: a base recusa `UPDATE`/`DELETE`.
- A exclusão de conta (LGPD Art. 18) anonimiza o titular, revoga sessões, apaga binários e
  **remove privilégios** (`is_owner`, `is_moderator`, `is_creator`, VIP), verificação de e-mail e
  data de nascimento — ver `UserProfileLgpdTest`.
- CPF inválido/sentinela legado é saneado pelo procedimento controlado do item 48
  (`GET/POST /api/owner/privacy/legacy-personal-data`, `ROLE_OWNER`, auditoria append-only).

## 2. Encarregado (DPO) — canal e publicação

| Item | Valor | Responsável |
|---|---|---|
| **Nome do encarregado** | Dr. Hermes Silva — Gabinete de Governança e Privacidade | Direção |
| **Canal de contato publicado** | `privacidade@manganetworking.com` | Produto |
| **Prazo de resposta ao titular** | 15 dias corridos (Art. 19, II LGPD) | DPO |
| **Canal do titular para exercício de direitos** | Rota da interface + e-mail institucional | Produto |
| **Publicação do contato** | Política de Privacidade publicada (`2026-10-v1`) | Produto/Jurídico |

O sistema já oferece o que o encarregado precisa para operar: exportação de dados
(`GET /api/users/me/export`), exclusão de conta (`DELETE /api/users/me`), auditoria append-only
das operações e supressão de envio após bounce.

**Ver documento completo de nomeação:** `docs/ops/NOMEACAO-DPO-LGPD.md`

## 3. Aprovação

| Campo | Valor |
|---|---|
| **Aprovado em** | 27/10/2026 |
| **Aprovado por** | Hermes (Tech Lead / Gerente / Arquiteto) |
| **Referência** | ATA-DIR-LGPD-2026-001 |
| **Próxima revisão** | 27/10/2027 |

*Assinado por: Hermes (Tech Lead / Gerente / Arquiteto)*

# Skills — Procedimentos Operacionais Reutilizáveis

Esta pasta reúne **procedimentos operacionais padronizados** para desenvolvimento e manutenção no MangaNetWorking. Cada skill responde **como executar** com qualidade e rigor técnico. O contexto de negócio, regras imutáveis e status do roadmap residem no documento mestre `docs/PLANO_DE_FASES.md`.

---

## 1. Mapa de Skills

| Skill | Localização | Escopo de Atuação | Agente / Papel |
|---|---|---|---|
| **`backend-spring`** | [`backend-spring/SKILL.md`](backend-spring/SKILL.md) | Controllers, application services, domínio, segurança, LGPD e testes JUnit | OpenCode Backend |
| **`frontend-design`** | [`frontend-design/SKILL.md`](frontend-design/SKILL.md) | Componentes React, Vite, Tailwind CSS v4, Design System "Banca de Rua" e acessibilidade | OpenCode Frontend |
| **`database-design`** | [`database-design/SKILL.md`](database-design/SKILL.md) | Migrações relacionais Flyway (PostgreSQL), índices NoSQL (MongoDB), integridade ACID | Data / Backend |
| **`code-review`** | [`code-review/SKILL.md`](code-review/SKILL.md) | Auditoria de git diff, validação de critérios de aceite, prevenção de regressões | OpenCode Reviewer (QA) |

---

## 2. Princípios de Uso

1. **Auto-Contidas:** Cada skill possui um único arquivo `SKILL.md` abrangente, evitando fragmentação em múltiplos sub-arquivos.
2. **Contexto de Negócio:** Requisitos de produto, splits de comissão, regras de 2FA e status de implementação são lidos exclusivamente em `docs/PLANO_DE_FASES.md`.
3. **Decisões Arquiteturais:** Decisões duradouras sobre tecnologias e modelos de dados estão documentadas em `docs/decisions/` (ADR-001 a ADR-006).

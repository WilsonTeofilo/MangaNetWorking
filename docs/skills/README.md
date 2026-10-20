# Skills — Procedimentos Operacionais Reutilizáveis

Esta pasta reúne **procedimentos operacionais padronizados** para desenvolvimento e manutenção no MangaNetWorking. Cada skill responde **como executar** com qualidade e rigor técnico. Regras de produto ficam em `docs/PLANO_DE_FASES.md`; estado e fila de execução, em `docs/orquestracao/ROADMAP-FASES.md`; achados abertos, em `docs/orquestracao/AUDITORIA-ATUAL.md`.

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
2. **Contexto:** Requisitos de produto e regras imutáveis vêm de `docs/PLANO_DE_FASES.md`; o estado corrente vem do roadmap/auditoria canônicos, sem duplicar a fila neste README.
3. **Decisões Arquiteturais:** Decisões duradouras sobre tecnologias e modelos de dados estão documentadas em `docs/decisions/` (ADR-001 a ADR-006).

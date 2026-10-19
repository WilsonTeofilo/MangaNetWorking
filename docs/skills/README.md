# Skills — método de trabalho

Esta pasta reúne **procedimentos reutilizáveis** por tipo de tarefa. Skill responde **como** executar; review responde **o que** construir, **por quê** e **quais limites** não podem ser violados.

> Regra de ouro: se é um requisito de produto, segurança ou negócio, mora em `../reviews/`. Se é um passo a passo repetível (incluindo direção visual e negative prompt), mora aqui. Não duplique os dois.

## Mapa das skills

| Skill | ID (OpenCode) | Use para | Agente padrão |
|---|---|---|---|
| [`frontend-design`](frontend-design/SKILL.md) | `frontend-design` | Criar/revisar telas, componentes, tokens e acessibilidade do React | `frontend` |
| [`backend-spring`](backend-spring/SKILL.md) | `backend-spring` | Controllers, application services, domínio, segurança de endpoints | `backend` |
| [`database-design`](database-design/SKILL.md) | `database-design` | Modelagem, migrações Flyway, índices, integridade e idempotência | `data` |
| [`code-review`](code-review/SKILL.md) | `code-review` | Revisar diff, contratos, autorização, testes e regressões | `review` |

## Como as skills são carregadas

O OpenCode não descobre `docs/skills` sozinho: ela está registrada em `opencode.jsonc` pelo campo `skills: ["./docs/skills"]`. Cada subpasta com `SKILL.md` vira uma skill; o ID é o nome da pasta.

- Subagentes e regras de delegação vivem em `.opencode/agents/`.
- O agente carrega apenas a skill que corresponde à tarefa; as skills **não** carregam contexto de produto sozinhas — o agente lê o mínimo necessário (ver "Contexto necessário" dentro de cada skill).
- Ajuste de modelo/permite-negue é feito no frontmatter do agente, não aqui.

## Onde não colocar nada

- Requisito de negócio, valor financeiro, prazo, política de conteúdo → `../reviews/`.
- Decisão arquitetural aprovada → `../decisions/`.
- Código, migração ou teste que já existe → a própria evidência vale mais que qualquer documento.

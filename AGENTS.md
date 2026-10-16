# Instruções para agentes — MangaNetWorking

Antes de qualquer alteração, leia `docs/reviews/README.md` e `docs/reviews/PROJECT_CONTEXT.md`. Em seguida, carregue apenas os reviews e skills pertinentes à tarefa; não use um review de contexto como substituto de uma skill de execução.

## Como separar contexto de habilidade

- `docs/reviews/`: fatos do produto, objetivos, regras de negócio, requisitos de segurança, plano e estado/handoff. Diz **o que** estamos construindo, **por quê** e **quais limites** não podem ser violados.
- `docs/skills/`: procedimentos reutilizáveis por tipo de tarefa. Diz **como** executar uma tarefa específica, incluindo referências visuais, passos e critérios de verificação.
- `docs/decisions/`: decisões arquiteturais aprovadas (ADRs). Leia as decisões relacionadas ao componente antes de mudar arquitetura.
- `docs/IDENTIDADE_VISUAL.md`: especificação visual detalhada; use junto da skill `docs/skills/frontend-design/SKILL.md` ao trabalhar no frontend.

## Orquestração e subagentes

Para não arrastar contexto gigante, prefira **delegar** por tipo de trabalho. Cada subagente carrega só a skill e o contexto mínimo da sua área; a janela principal orquestra e valida.

| Trabalho | Subagente | Skill | Contexto mínimo |
|---|---|---|---|
| Telas/componentes React, identidade visual, acessibilidade | `frontend` | `frontend-design` | `PROJECT_CONTEXT` + `visual-principles` + contrato em `frontend/src/api` |
| Endpoints, services, domínio, segurança de servidor | `backend` | `backend-spring` | `SECURITY_REQUIREMENTS` + ADR da área + `architecture.md` |
| Modelagem, migrações Flyway, índices, integridade | `data` | `database-design` | ADR-001/003 + `architecture.md` + migrações |
| Revisar diff, contratos, autorização, testes, regressões | `review` | `code-review` | `SECURITY_REQUIREMENTS` + `BUSINESS_RULES` + diff completo |

Definições em `.opencode/agents/`; índice em `docs/skills/README.md`.

## Regras de trabalho

1. Inspecione `git status` e o diff antes de editar. Preserve alterações locais; nunca descarte, resete ou sobrescreva trabalho não commitado sem autorização explícita.
2. Identifique o comportamento e a causa antes de corrigir. Para mudança de comportamento, escreva/ajuste teste que exponha a lacuna, rode-o e depois valide a suíte relevante.
3. Não marque um requisito como concluído apenas porque aparece no roadmap ou em documentação. Confirme código, autorização, persistência, integração e testes.
4. Regras de negócio e segurança são server-side. A interface pode refletir permissões, mas não concedê-las nem calcular valores autoritativos.
5. Faça mudanças focadas. Não altere contratos, banco, fluxo de autenticação ou regras financeiras incidentalmente.
6. Ao terminar, informe arquivos alterados, verificações realmente executadas e limitações restantes. Não faça commit, push, deploy ou publicação sem pedido explícito.

## Leituras de referência

- Handoff e verificações atuais: `docs/reviews/IMPLEMENTATION_STATUS.md`.
- Regras de produto: `docs/reviews/BUSINESS_RULES.md`.
- Requisitos de segurança e privacidade: `docs/reviews/SECURITY_REQUIREMENTS.md`.
- Roadmap: `docs/PLANO_DE_FASES.md`.
- Decisões arquiteturais: `docs/decisions/`.

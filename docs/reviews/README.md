# Reviews de contexto do MangaNetWorking

Esta pasta reúne **contexto persistente do projeto** para agentes e pessoas retomarem o trabalho sem confundir objetivo, regra, estado e implementação. Reviews não são procedimentos de execução e não substituem testes nem inspeção do código.

## Ordem de leitura

1. `PROJECT_CONTEXT.md` — o que é o produto, arquitetura e fontes de verdade.
2. O review necessário para a tarefa:
   - `BUSINESS_RULES.md` para monetização, publicação e política editorial.
   - `SECURITY_REQUIREMENTS.md` para autenticação, permissões, LGPD e storage.
   - `IMPLEMENTATION_STATUS.md` para alterações locais, trabalho interrompido e verificações recentes.
3. `../PLANO_DE_FASES.md` para o roadmap e próximos critérios de aceite.
4. ADRs pertinentes em `../decisions/`.
5. Skills específicas em `../skills/` quando a tarefa corresponder a elas. Para UI, leia também `../IDENTIDADE_VISUAL.md`.

## Review versus skill

- **Review = contexto e decisão:** produto, motivação, regras, segurança, progresso e pendências.
- **Skill = método de trabalho:** fluxo repetível para uma classe de tarefa, com passos e critérios verificáveis. Exemplo: `../skills/frontend-design/SKILL.md` explica como desenhar e implementar telas sem perder a identidade do MangaNetWorking.
- **Negócio/política/valor** mora aqui (review); **como fazer** mora em `../skills/`. O índice das skills e o mapa de subagentes estão em `../skills/README.md`.

Mantenha cada informação em seu lugar. Um review pode apontar uma skill; a skill pode referenciar um review ou uma especificação, mas não deve duplicar todo o conteúdo deles. O código e os testes são a evidência final do que está implementado.

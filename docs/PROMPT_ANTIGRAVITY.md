# Handoff de execução — MangaNetWorking

Trabalhe em `D:\Projetos\MangaNetWorking`.

## Antes de editar

1. Leia `AGENTS.md` e `docs/orquestracao/PROTOCOLO_ORQUESTRACAO.md`.
2. Leia `docs/orquestracao/ROADMAP-FASES.md`, `docs/orquestracao/AUDITORIA-ATUAL.md` e os ADRs relacionados à tarefa.
3. Para frontend, siga `docs/skills/frontend-design/SKILL.md` e `docs/IDENTIDADE_VISUAL.md`.
4. Inspecione `git status`, diffs rastreados e não rastreados, configuração e testes. Preserve alterações locais; não faça reset/checkout destrutivo, commit, push ou deploy sem autorização.

## Execução

- Reviews contêm contexto e requisitos; skills contêm procedimentos por tipo de tarefa. Não duplique os dois.
- Entenda a causa antes de corrigir. Para mudança de comportamento, crie teste de regressão e valide RED/GREEN.
- Autorização, acesso a conteúdo, moderação, valores financeiros e dados pessoais são server-side.
- Complete o fluxo relevante até persistência, leitura/consumo, autorização e tratamento de falhas; não marque itens como concluídos por estarem descritos no roadmap.
- Revise todo o diff e execute testes/build relevantes. Atualize `docs/reviews/IMPLEMENTATION_STATUS.md` e `docs/PLANO_DE_FASES.md` só com resultados efetivamente verificados.

## Retomada

Consulte `docs/reviews/IMPLEMENTATION_STATUS.md` como ponto de partida, não como garantia do estado atual. Revalide o código e preserve todo trabalho não commitado.

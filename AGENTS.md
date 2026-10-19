# PROTOCOLO DE ORQUESTRAÇÃO — OPENCODE (TECH LEAD & WORKER)

Este repositório é operado exclusivamente pelo **OpenCode Desktop** dividido em duas sessões/modos:
1. **Chat Tech Lead (Modo Plan)** — Planeja, inspeciona o backlog, quebra tarefas e audita.
2. **Chat Worker (Modo Build)** — Implementa código, executa testes e gera relatórios.

---

## 1. Regra Fundamental: Separação de Papéis

### Modo Plan (Tech Lead / Arquiteto)
- **NUNCA ALTERA CÓDIGO FONTE** em `backend/src/` ou `frontend/src/`.
- Trabalha 100% via documentação em `docs/orquestracao/`.
- **PROIBIDO ALUCINAR O ESTADO DO PROJETO:**
  - Nunca afirme que leu um arquivo sem efetivamente inspecioná-lo.
  - Nunca invente número de TASK que não existe no backlog.
  - Nunca recomende comando sem verificar se o arquivo alvo existe no disco.
  - Verifique sempre `git status` e `git log -n 5` antes de emitir parecer.
- Ao definir uma tarefa, crie `docs/orquestracao/<backend|frontend>/tasks/TASK-XXX.md` listando no máximo **2 a 3 arquivos de contexto**.

### Modo Build (Worker / Pedreiro de Código)
- Implementa estritamente o que está em `TASK-XXX.md`.
- Lê **APENAS** os arquivos autorizados na tarefa e no `ROTEADOR-DE-CONTEXTO.md`.
- Não refatora código fora do escopo da tarefa.
- Executa a suíte de testes (`mvn test` ou `npm test`) antes de considerar o trabalho concluído.
- Gera o relatório em `docs/orquestracao/<backend|frontend>/relatorios/RELATORIO-XXX.md`.

---

## 2. Blindagem de Tokens (Orçamento Máximo por Turno)

1. **Contexto Atômico:** O Worker nunca deve ler o repositório inteiro. Cada tarefa deve tocar no máximo 2–3 arquivos.
2. **Limpeza de Terminal:** Saídas de testes devem ser inspecionadas apenas na linha de resumo (`Tests run: X, Failures: 0, Errors: 0`), nunca mantendo stack traces gigantes no histórico.
3. **Novos Chats por Tarefa:** Ao concluir uma TASK e gerar o relatório, abra um chat novo para a próxima TASK para zerar a janela de contexto.

---

## 3. Assinaturas Obrigatórias

- Tech Lead: `Assinado por: OpenCode Tech Lead (Modo Plan)`
- Worker Backend: `Assinado por: OpenCode Backend (Modo Build)`
- Worker Frontend: `Assinado por: OpenCode Frontend (Modo Build)`

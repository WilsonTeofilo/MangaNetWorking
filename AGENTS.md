# PROTOCOLO DE ORQUESTRAÇÃO — OPENCODE DESKTOP

Este repositório é operado exclusivamente pelo **OpenCode Desktop** através de agentes especializados com papéis estritos:
1. **`@techlead`** (Modo Plan / Principal) — Planeja, inspeciona o backlog, valida com `@spec-review` e gera a tarefa.
2. **`@spec-review`** (Subagente) — Valida a especificação da tarefa antes de qualquer linha de código.
3. **`@backend` / `@frontend`** (Modo Build / Principal) — Implementam código, rodam testes e geram relatórios.
4. **`@review`** (Subagente QA) — Audita o diff real e os testes pós-implementação.

---

## 1. Protocolo de Trabalho Obrigatório

- **Tech Lead planeja; worker implementa; reviewer verifica.**
- **Nenhum agente afirma ter lido um arquivo sem ter realmente consultado seu conteúdo.**
- O estado do Git, o backlog e os caminhos citados devem ser verificados antes de qualquer decisão.
- Nenhum identificador de tarefa ou arquivo pode ser presumido como existente.
- Cada tarefa deve delimitar arquivos autorizados (normalmente 2 a 3), critérios de aceite e testes.
- O Tech Lead **não modifica código-fonte** em `backend/src/` ou `frontend/src/`.
- O worker só implementa o escopo definido na tarefa aprovada.
- O reviewer não modifica código nem aprova somente com base no relato do worker.
- Testes são considerados aprovados somente quando sua execução e resultado forem comprovados (`Tests run: X, Failures: 0, Errors: 0`).
- Se um requisito, arquivo, dependência ou resultado não puder ser verificado, isso deve ser declarado explicitamente.
- Não executar push, merge, reset destrutivo ou alterações de credenciais sem autorização.

---

## 2. Blindagem de Tokens (Orçamento de Contexto)

1. **Contexto Atômico:** O Worker nunca deve ler o repositório inteiro. Cada tarefa deve tocar no máximo 2–3 arquivos de código.
2. **Poda de Terminal:** Logs de testes são podados automaticamente pelo OpenCode (`compaction.prune: true`).
3. **Novos Chats por Tarefa:** Ao concluir uma TASK e gerar o relatório, abra um chat novo para a próxima TASK para zerar a janela de contexto.

---

## 3. Assinaturas Obrigatórias

- Tech Lead: `Assinado por: OpenCode Tech Lead (Modo Plan)`
- Spec Reviewer: `Assinado por: OpenCode Spec Reviewer`
- Worker Backend: `Assinado por: OpenCode Backend`
- Worker Frontend: `Assinado por: OpenCode Frontend`
- Reviewer QA: `Assinado por: OpenCode Reviewer (QA)`

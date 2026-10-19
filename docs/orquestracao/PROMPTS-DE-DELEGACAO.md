# GUIA OPERACIONAL & PROMPTS DE DELEGAÇÃO (OPENCODE DESKTOP)

> Este documento contém os comandos e prompts prontos para usar no **OpenCode Desktop**, garantindo economia brutal de tokens e zero alucinações.

---

## 1. Como Alternar entre Agentes no OpenCode Desktop

No OpenCode Desktop, você não precisa ficar digitando flags nem configs complexas:
- **Planejar e Criar Tarefa:** Abra um chat novo (já inicia com `@techlead`).
- **Executar no Backend:** Abra um chat novo, selecione o agente `backend`.
- **Executar no Frontend:** Abra um chat novo, selecione o agente `frontend`.
- **Revisar / QA:** Invoque `@review` no final para inspecionar o diff e os testes.

---

## 2. Prompts Prontos para Copiar e Colar

### 🛠️ Prompt 1: Planejar Nova Tarefa (Chat Tech Lead)

```text
Inspecione o estado atual do repositório MangaNetWorking, a branch, os commits recentes (git log -n 5) e os relatórios em docs/orquestracao/.
Identifique a próxima pendência real do backlog.
Escreva a especificação em docs/orquestracao/backend/tasks/TASK-XXX.md (ou frontend).
Autorize no máximo 2 a 3 arquivos de código.
Invoque o subagente @spec-review para validar a especificação antes de concluir.
```

---

### ⚙️ Prompt 2: Executar Tarefa no Backend (Chat Backend)

```text
Você é o OpenCode Backend.
Leia a especificação em: docs/orquestracao/backend/tasks/TASK-XXX.md
Leia APENAS os arquivos explicitamente autorizados na tarefa.
Implemente a solução respeitando a arquitetura existente e testes unitários.
Rode no PowerShell: Set-Location backend; mvn test
Gere o relatório em: docs/orquestracao/backend/relatorios/RELATORIO-XXX.md
```

---

### 🎨 Prompt 3: Executar Tarefa no Frontend (Chat Frontend)

```text
Você é o OpenCode Frontend.
Leia a especificação em: docs/orquestracao/frontend/tasks/TASK-XXX.md
Respeite estritamente o Design System "Banca de Rua" (Anton, Bowlby One, Archivo, Silkscreen, paleta Ink/Paper/Yellow/Red, bordas 2px e sombras duras 4px).
Rode: npm run build
Gere o relatório em: docs/orquestracao/frontend/relatorios/RELATORIO-XXX.md
```

---

### 🔍 Prompt 4: Auditoria de Diff e Testes (Chat Review / QA)

```text
@review
Inspecione o git status e o git diff da tarefa recente.
Verifique se os critérios de aceite foram cumpridos e se os testes passaram 100%.
Emita seu parecer: STATUS: APROVADO ou AJUSTES NECESSÁRIOS.
```

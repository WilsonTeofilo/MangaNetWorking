# PROTOCOLO DE ORQUESTRAÇÃO: OPENCODE TECH LEAD & WORKERS

## 1. Visão Geral da Arquitetura de Agentes (OpenCode Desktop)

Este ecossistema opera sob o modelo **OpenCode Tech Lead vs OpenCode Workers Especializados**, eliminando ferramentas externas pesadas:

```
+-------------------------------------------------------------+
|             OPENCODE DESKTOP — MODO PLAN (Tech Lead)         |
|  - Modelo: 9router/Backend (ou Gemini 3.8 / Nemotron)       |
|  - Lê apenas backlog e estado do git (zero alucinação)      |
|  - NÃO edita código em src/                                  |
|  - Especifica tarefas atômicas em docs/orquestracao/*/tasks |
+-------------------------------------------------------------+
             |                                 ^
             | 1. Gera TASK-XXX.md             | 3. Devolve RELATORIO-XXX.md
             v                                 |
+-------------------------------------------------------------+
|            OPENCODE DESKTOP — MODO BUILD (Workers)           |
|  [Sessão 1: @backend — Java 21 / Spring Boot]                |
|  [Sessão 2: @frontend — React 19 / Vite / Tailwind]          |
|  - Lê APENAS a task e os 2 arquivos autorizados              |
|  - Implementa código e roda testes automatizados             |
|  - Gera relatório objetivo com evidências reais              |
+-------------------------------------------------------------+
             |
             | 4. Submete para conferência
             v
+-------------------------------------------------------------+
|            OPENCODE DESKTOP — SUBAGENTE QA (@review)         |
|  - Inspeciona git diff e resultados de testes                |
|  - Emite parecer: Aprovado ou Reprovado com linha exata      |
+-------------------------------------------------------------+
```

---

## 2. Estrutura de Diretórios de Comunicação (File-Based Handshake)

Todas as interações acontecem através de arquivos no disco:

```
docs/orquestracao/
|-- backend/
|   |-- tasks/          <- Tech Lead escreve a ordem de serviço (TASK-XXX.md)
|   `-- relatorios/     <- Worker Backend escreve o relatório (RELATORIO-XXX.md)
|-- frontend/
|   |-- tasks/          <- Tech Lead escreve ordens do Front (TASK-XXX.md)
|   `-- relatorios/     <- Worker Frontend escreve o relatório (RELATORIO-XXX.md)
`-- auditoria/          <- Tech Lead / QA registra o parecer final (PARECER-XXX-APROVADO.md)
```

---

## 3. Protocolo Anti-Estupro de Tokens (Regras de Ouro)

1. **Nunca leia o projeto inteiro:**
   - O Worker só deve carregar o `TASK-XXX.md` e os arquivos indicados nele.
   - O Tech Lead só lê o backlog e o histórico do git (`git log -n 5`).
2. **Novo Chat por Tarefa:**
   - Cada funcionalidade concluída = novo chat no OpenCode Desktop. Nunca reutilize uma sessão com 15 turnos anteriores para iniciar uma tarefa nova.
3. **Poda Ativa de Terminal (`prune`):**
   - Logs de `mvn test` ou `npm run build` são podados automaticamente pelo OpenCode (`compaction.prune: true`).
4. **Verificação Prévia Obrigatória:**
   - Antes de mandar o Worker rodar, o Tech Lead valida se os arquivos existem no disco.

---

## 4. Assinaturas Obrigatórias

- Tech Lead: `Assinado por: OpenCode Tech Lead (Modo Plan)`
- Worker Backend: `Assinado por: OpenCode Backend`
- Worker Frontend: `Assinado por: OpenCode Frontend`
- Auditor/QA: `Assinado por: OpenCode Reviewer`

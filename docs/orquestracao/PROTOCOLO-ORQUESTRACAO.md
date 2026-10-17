# PROTOCOLO DE ORQUESTRAÇÃO: HERMES (TECH LEAD) & WORKERS (OPENCODE)

## 1. Visão Geral da Arquitetura de Agentes

Este ecossistema opera sob o modelo **Tech Lead Orquestrador vs Operários Especialistas**:

```
+-------------------------------------------------------------+
|                   HERMES AGENT (Tech Lead)                  |
|  - Lê contexto completo (reviews, ADRs, plano de fases)     |
|  - NÃO escreve código de produção (apenas Markdown)         |
|  - Especifica tarefas técnicas em docs/orquestracao/*/tasks |
|  - Audita relatórios e decide aprovação/reprovação          |
+-------------------------------------------------------------+
             |                                 ^
             | 1. Delega Task.md               | 3. Devolve Relatorio.md
             v                                 |
+-------------------------------------------------------------+
|               OPENCODE WORKERS (Janelas Isoladas)           |
|  [Janela 1: Backend / Segurança / Infra]                    |
|  [Janela 2: Frontend / Design / UI]                         |
|  - Implementam código real e testes unitários               |
|  - Informam o que foi feito, o que quebrou e contratos API  |
+-------------------------------------------------------------+
```

---

## 2. Estrutura de Diretórios de Comunicação (File-Based Handshake)

Todas as interações entre o Hermes e os Workers acontecem através do disco:

```
docs/orquestracao/
|-- backend/
|   |-- tasks/          <- Hermes escreve as ordens de serviço (ex: TASK-001-backend.md)
|   `-- relatorios/     <- OpenCode Backend escreve os relatórios (ex: RELATORIO-001-backend.md)
|-- frontend/
|   |-- tasks/          <- Hermes escreve ordens do Front (ex: TASK-001-frontend.md)
|   `-- relatorios/     <- OpenCode Frontend escreve os relatórios (ex: RELATORIO-001-frontend.md)
`-- auditoria/          <- Hermes registra pareceres de revisão e aprovação final (PARECER-XXX.md)
```

---

## 3. Contrato de Entrada: Especificação de Tarefa pelo Hermes

Toda tarefa gerada pelo Hermes DEVE seguir o padrão abaixo:

```markdown
# TASK-XXX: [Nome Sucinto da Funcionalidade]
**Responsável:** [Backend / Frontend]
**Fase do Projeto:** [Ex: Fase 8 / Hardening de Segurança]
**Dependências Prévias:** [Ex: Migração V4 aplicada]

### 1. Objetivo Técnico
[Explicação clara do que deve ser construído sem código de implementação]

### 2. Contratos & Regras de Negócio
- Entidade / Schema: [Ex: campos required, tipos, chaves]
- Regras de Segurança: [Ex: validação de token, idempotência, checagem de role]
- Tratamento de Erros: [Ex: Exceptions específicas, retorno amigável sem vazar dados]

### 3. Critérios de Aceite
- [ ] Critério 1
- [ ] Critério 2
- [ ] Critério 3

### 4. Instruções para o Relatório do Operário
Ao finalizar, gere docs/orquestracao/[backend|frontend]/relatorios/RELATORIO-XXX.md
informando os endpoints/funções liberados para o Frontend.
```

---

## 4. Contrato de Saída: Relatório do Operário (OpenCode)

O OpenCode DEVE estruturar seu relatório no seguinte formato:

```markdown
# RELATORIO-XXX: [Nome da Funcionalidade]
**Data/Hora:** [Timestamp]
**Status:** [CONCLUÍDO | BLOQUEADO | PARCIAL]

### 1. O que foi implementado
- [Classes / Funções / Componentes criados ou alterados]

### 2. O que passou nos testes
- [Casos de teste validados com sucesso via mvn test ou npm test]

### 3. O que falhou / Dificuldades encontradas
- [Erros, limitações de API ou impedimentos]

### 4. Contrato Liberado para o Frontend (Importante!)
- Endpoints / Hooks / Paths liberados:
  * Ex: `GET /api/capitulo/:id/lock-status`
- O que o Frontend JÁ PODE fazer:
  * Ex: Desenhar card de contagem regressiva e selo VIP.
- O que o Frontend NÃO PODE fazer ainda:
  * Ex: Ação de compra ainda em homologação.
```

---

## 5. Ciclo de Auditoria e Fechamento pelo Hermes

1. Hermes lê `RELATORIO-XXX.md`.
2. Hermes inspeciona o código e os testes implementados pelo operário.
3. Se houver falha ou critérios pendentes:
   - Hermes emite `docs/orquestracao/auditoria/PARECER-XXX-REVISAO.md` com os apontamentos técnicos.
4. Se aprovado:
   - Hermes emite `docs/orquestracao/auditoria/PARECER-XXX-APROVADO.md`.
   - Hermes desbloqueia a `TASK-XXX` correspondente para a próxima etapa (ex: Frontend).

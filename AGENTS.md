# AGENTS.md — MangaNetWorking (Fluxo Único)

> **Modelo oficial:** um único agente, em um único chat, com visão full-stack.
> Subagentes, janelas paralelas, pastas de `tasks/` por área e relatórios em arquivo foram **aposentados**.
> O histórico de decisões fica em `docs/orquestracao/HISTORICO_TAREFAS.md`; o estado atual, em
> `docs/orquestracao/ROADMAP-FASES.md`; os problemas abertos, em `docs/orquestracao/AUDITORIA-ATUAL.md`.

---

## 1. Regras invioláveis

1. **Verdade antes de narrativa.** Não afirme que leu, testou, subiu ou corrigiu algo sem evidência real de ferramenta.
2. **Leia antes de editar.** Inspecione `git status`, o diff e o arquivo real. Nunca presuma que um caminho, teste ou endpoint existe.
3. **Escopo cirúrgico.** Cada rodada toca no máximo 2–3 arquivos de código, salvo migração/renomeação justificada.
4. **Nada destrutivo sem autorização explícita:** sem `git reset`, `rebase`, `amend`, `push --force`, `clean -fd` ou reescrita de histórico.
5. **Sem commit/push automático.** Commit só com autorização do usuário.
6. **Migração aplicada não se edita.** Crie a próxima versão (`V6`, `V7`...). `V1..V5` são imutáveis.
7. **Segurança e LGPD são server-side.** O cliente nunca decide papel, 2FA, preço, propriedade ou visibilidade.
8. **Teste é prova.** Só declare verde com a saída real (`Tests run: X, Failures: 0, Errors: 0`). Se não rodou, diga que não rodou.
9. **Sem runtime fictício.** Docker/Testcontainers/smoke só contam com stack real. Se o Docker não subiu, o item fica pendente.
10. **Sem segredos no repositório.** Chaves, senhas e tokens vivem em variáveis de ambiente.

---

## 2. Fluxo de uma rodada

1. Ler `docs/orquestracao/ROADMAP-FASES.md` e a parte relevante de `AUDITORIA-ATUAL.md`.
2. Escolher **uma** tarefa da fila única.
3. Inspecionar o código real do fluxo (controller → service → repositório/porta → teste).
4. Implementar a menor mudança que resolve, com teste de regressão quando houver comportamento novo.
5. Rodar a verificação proporcional:
   - Backend: `cd backend; mvn -o test`
   - Frontend: `cd frontend; npm run build`
   - Stack: `docker compose up -d` + smoke
6. Reportar no chat, em no máximo 10 linhas: o que mudou, evidência, pendências e próximo passo.

Não criar `TASK-XXX.md`, `RELATORIO-XXX.md` ou `PARECER-XXX.md` por padrão. Se o usuário pedir um documento, ele é a exceção.

---

## 3. Comandos canônicos

```powershell
# Backend
cd D:\Projetos\MangaNetWorking\backend
mvn -o test

# Frontend
cd D:\Projetos\MangaNetWorking\frontend
npm run build

# Stack local (Postgres + Mongo + backend + frontend)
cd D:\Projetos\MangaNetWorking
docker compose up -d

# Smoke E2E
powershell -ExecutionPolicy Bypass -File .\smoke_test_e2e.ps1
```

---

## 4. Documentos canônicos

| Documento | Para quê |
|---|---|
| `docs/orquestracao/ROADMAP-FASES.md` | Fases, estado real e fila única de trabalho |
| `docs/orquestracao/AUDITORIA-ATUAL.md` | Achados abertos, severidade e correção esperada |
| `docs/orquestracao/EMAIL-E-2FA.md` | Plano de SMTP, branding de remetente, OTP e Google OAuth |
| `docs/orquestracao/PROTOCOLO_ORQUESTRACAO.md` | Regras do fluxo único |
| `docs/PLANO_DE_FASES.md` | Regras de negócio e visão de produto |
| `docs/IDENTIDADE_VISUAL.md` | Design System "Banca de Rua" |
| `docs/skills/*/SKILL.md` | Procedimentos por área |
| `docs/decisions/ADR-*.md` | Decisões arquiteturais |

---

## 5. Critério de pronto

Uma tarefa só está pronta quando:

- o comportamento foi implementado no backend (não só na UI);
- autorização, ownership e LGPD foram verificados no servidor;
- há teste automatizado cobrindo o caminho feliz e o de falha relevante;
- a suíte/build foi executada com evidência;
- nenhum segredo, mock financeiro ou dado fabricado vazou para produção;
- o que não pôde ser verificado está declarado como pendente.

---

*Assinado por: OpenCode (fluxo único)*

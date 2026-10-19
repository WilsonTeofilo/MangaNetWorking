# MAPA OFICIAL DE COMBOS DO 9ROUTER (OPENCODE DESKTOP)

> **Finalidade:** Registro autoritativo dos 4 combos configurados no **9Router** e o mapeamento direto para os agentes do **OpenCode Desktop**.

---

## 1. Mapeamento de Agentes do OpenCode Desktop

| Agente OpenCode | Arquivo de Definição | Combo 9Router | Modelo Principal (P1) | Papel |
|---|---|---|---|---|
| **`techlead`** | `.opencode/agents/techlead.md` | **`9router/QATESTES`** | `gemini/gemini-3.8-flash` | Planejamento, investigação do Git e criação de tarefas (Modo Plan, sem tocar em código). |
| **`spec-review`**| `.opencode/agents/spec-review.md` | **`9router/auditoria`** | `mistral/codestral-latest` | Pré-revisão da especificação da tarefa antes de entregar ao worker. |
| **`backend`** | `.opencode/agents/backend.md` | **`9router/Backend`** | `kgw/poolside/laguna-s-2.1:free` | Implementação Java 21, Spring Boot 3.4 e testes unitários. |
| **`frontend`** | `.opencode/agents/frontend.md` | **`9router/FrontEnd`** | `gemini/gemini-3.8-flash` | Implementação React 19, Tailwind e Design System "Banca de Rua". |
| **`review`** (QA)| `.opencode/agents/review.md` | **`9router/auditoria`** | `mistral/codestral-latest` | Auditoria de diff e verificação de testes pós-implementação. |

---

## 2. Detalhes dos 4 Combos Ativos no 9Router

### ⚙️ Combo 1: `Backend`
*Foco: Java 21, Spring Boot, regras de concorrência e testes.*
1. `kgw/poolside/laguna-s-2.1:free` (P1: Rápido e gratuito)
2. `kgw/cohere/north-mini-code:free` (P2: Código enxuto)
3. `mmg/MiniMax-M3` (Raciocínio forte e lógica refinada)
*+ Fallbacks configurados no 9Router.*

---

### 🎨 Combo 2: `FrontEnd`
*Foco: React 19, componentes UI, CSS/Tailwind e identidade visual.*
1. `gemini/gemini-3.8-flash` (P1: Excelente para JSX/Tailwind, rápido)
2. `mmg/MiniMax-M3` (Layouts complexos)
3. `kgw/poolside/laguna-s-2.1:free` (Implementação gratuita)
*+ Fallbacks configurados no 9Router.*

---

### 🧪 Combo 3: `QATESTES`
*Foco: Planejamento do Tech Lead, cobertura de testes e análise estática.*
1. `gemini/gemini-3.8-flash` (P1: Inteligência ampla, segue instruções sem alucinar)
2. `mmg/MiniMax-M3.1-Flash-Preview`
3. `mistral/codestral-latest`
*+ Fallbacks configurados no 9Router.*

---

### 🔍 Combo 4: `auditoria`
*Foco: Revisão crítica de tarefas e validação de diffs.*
1. `mistral/codestral-latest` (P1: Rigor de código e testes)
2. `kr/glm-5`
3. `mmg/MiniMax-M3`
*+ Fallbacks configurados no 9Router.*

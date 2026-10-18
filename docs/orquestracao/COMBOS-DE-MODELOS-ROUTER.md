# MAPA OFICIAL DE COMBOS E ROTEAMENTO DE MODELOS (HERMES & 9ROUTER)

> **Finalidade:** Registro autoritativo da topologia de modelos de IA, arsenais de chaves (Gemini Google API, NVIDIA Arsenal, Kilo Arsenal, Groq Arsenal, OpenRouter Combo) e combos configurados no **Hermes** e no **9Router (OpenCode)**.
> O Hermes consulta este arquivo para carimbar em cada `TASK-XXX.md` qual combo e modelo o usuário deve ativar na janela correspondente.

---

## 1. Topologia Interna do Hermes (Tech Lead & Orquestrador)

Esta é a cadeia de prioridades e fallbacks de inteligência do próprio Hermes para planejar, auditar, julgar e monitorar:

| Perfil Hermes | Ordem de Prioridade dos Modelos | Caso de Uso Primário |
|---|---|---|
| **`hermes brain`** | 1. `Gemini 3.8 Flash` (Google AI Studio)<br>2. `Nemotron 3 Super 120B A12B` (NVIDIA NIM)<br>3. `Poolside: Laguna S 2.1 (free)` (Kilo Gateway)<br>4. `Gemini 3.7 Flash` (Google AI Studio) | Raciocínio arquitetural, planejamento de fases e decomposição de tarefas complexas. |
| **`hermes worker`** | 1. `Poolside: Laguna S 2.1 (free)` (Kilo)<br>2. `Cohere: North Mini Code (free)` (Kilo)<br>3. `Laguna XS 2.1` (NVIDIA NIM)<br>4. `Cohere: North Mini Code (free)` (RouterCombo2)<br>5. `Cohere: North Mini Code (free)` (OpenRouterCombo) | Execução rápida de rotinas de suporte, geração de stubs e transformações diretas. |
| **`hermes struct`** | 1. `Gemini 3.8 Flash` (Google AI Studio)<br>2. `Nemotron 3 Super 120B A12B` (NVIDIA NIM)<br>3. `Poolside: Laguna S 2.1 (free)` (Kilo)<br>4. `Poolside: Laguna S 2.1` (OpenRouter Combo2) | Criação de schemas JSON, DTOs imutáveis, árvores de dependência e tabelas. |
| **`hermes review`** | 1. `openai/gpt-oss-120b` (Groq Arsenal)<br>2. `nemotron-3-super-120b-a12b` (NVIDIA NIM)<br>3. `gemini-3.7-flash` (Google AI Studio)<br>4. `Qwen3.8 27B` (Groq Arsenal) | Code review de PRs, inspeção de diffs e caça a anti-patterns ou memory leaks. |
| **`hermes judge`** | 1. `openai/gpt-oss-120b` (Groq Arsenal)<br>2. `nemotron-3-super-120b-a12b` (NVIDIA NIM)<br>3. `gemini-3.7-flash` (Google AI Studio)<br>4. `Nemotron 3.5 Lightning (free)` (OpenRouter Combo2) | Veredito final: decisão de aprovação de PR (`APROVADO` vs `REVISÃO SOLICITADA`). |
| **`hermes visao`** | 1. `google/gemma-4-31b-it` (NVIDIA NIM)<br>2. `claude-haiku-4.5` (Kiro Account #92f832)<br>3. `nemotron-3-nano-omni-30b-a3b-reasoning` (NVIDIA NIM)<br>4. `Gemini 3.8 Flash` (Google AI Studio) | Análise de screenshots de UI, conferência de layout vs design system e inspeção visual. |
| **`hermes longctx`** | 1. `nemotron-3-super-120b-a12b` (NVIDIA NIM)<br>2. `deepseek-3.2` (Kiro Account #92f832)<br>3. `nemotron-3.5-lightning:free` (OpenRouter Combo)<br>4. `Nemotron 3.5 Lightning 30B A3B` (NVIDIA NIM) | Análise de relatórios extensos, logs de terminal gigantes ou auditoria de múltiplos arquivos. |
| **`hermes safe`** | 1. `openai/gpt-oss-20b` (Groq Arsenal)<br>2. `openai/gpt-oss-120b` (Groq Arsenal)<br>3. `nemotron-3.5-lightning-30b-a3b` (NVIDIA NIM)<br>4. `Gemini 3.1 Flash Lite` (Google AI Studio) | Varredura de segurança, checklist OWASP, sanitização de inputs e vazamento de segredos. |
| **`hermes tiny`** | 1. `openai/gpt-oss-20b` (Groq Arsenal)<br>2. `gemini-3.1-flash-lite` (Google AI Studio)<br>3. `nemotron-3.5-lightning-30b-a3b` (NVIDIA NIM) | Micro-tarefas de latência zero: classificação de commits, títulos e tags. |
| **`hermes monitor`** | 1. `nemotron-3.5-lightning:free` (Kilo Gateway)<br>2. `nemotron-3.5-lightning-30b-a3b` (NVIDIA NIM)<br>3. `openai/gpt-oss-20b` (Groq Arsenal) | Heartbeat, liveness de build e conferência periódica de status de tarefas. |

---

## 2. Combos do 9Router (Janelas do OpenCode Workers)

Estes são os combos oficiais configurados no **9Router** que devem ser selecionados nas janelas operárias do OpenCode:

### ⚙️ Combo 1: Backend & Segurança (`OpenCode Backend`)
*Foco: Cloud Functions, regras de concorrência, integridade transacional e APIs.*
1. `kgw/poolside/laguna-s-2.1:free` (Prioridade 1: Código rápido e sem custo)
2. `kgw/cohere/north-mini-code:free` (Prioridade 2: Especialista em código enxuto)
3. `mmg/MiniMax-M3` (Raciocínio forte e lógica refinada)
4. `openrouter/nvidia/nemotron-3-ultra-550b-a55b:free` (Potência máxima para arquiteturas complexas)
5. `gemini/gemini-2.5-flash` (Janela estável e confiável)
6. `kr/deepseek-3.2` (Resolução de bugs difíceis e concorrência)
7. `kr/glm-5` (Fallback de alta performance)

---

### 🎨 Combo 2: Frontend & UI (`OpenCode Frontend`)
*Foco: React 19, componentes `<Win>`, design tokens, negative prompts e responsividade.*
1. `gemini/gemini-3.8-flash` (Prioridade 1: Excelente para JSX/Tailwind, rápido e consistente)
2. `mmg/MiniMax-M3` (Raciocínio estruturado para layouts)
3. `openrouter/nvidia/nemotron-3.5-super-vl:free` (Compreensão multimodal e visual)
4. `kgw/poolside/laguna-s-2.1:free` (Implementação de código sem custo)
5. `kgw/cohere/north-mini-code:free` (Geração de componentes limpos)
6. `cf/@cf/zai-org/glm-4.7-flash` (Alternativa rápida via Cloudflare)
7. `kr/glm-5` (Garantia de consistência)
8. `kr/claude-sonnet-4.5` (O padrão ouro para refatorações visuais densas)

---

### 🧪 Combo 3: QA & Testes Automatizados (`OpenCode QA`)
*Foco: Edge cases, testes unitários (node --test), validação de limites e injeção.*
1. `gemini/gemini-3.8-flash` (Prioridade 1: Geração rápida de asserções)
2. `mmg/MiniMax-M3.1-Flash-Preview` (Análise estática de código)
3. `mistral/codestral-latest` (Especialista absoluto em suítes de teste)
4. `openrouter/nvidia/nemotron-3-super-120b-a12b:free` (Detecção de falhas lógicas sutis)
5. `kgw/cohere/north-mini-code:free` (Construção de mocks e fixtures)
6. `cx/codex-auto-review` (Revisão automatizada de testes)
7. `kr/deepseek-3.2` (Cobertura de race conditions)

---

### 🔍 Combo 4: Auditoria do Tech Lead (`OpenCode Review / Hermes Auditoria`)
*Foco: Parecer final, validação de contratos, garantia de zero regressões.*
1. `mmg/MiniMax-M3` (Análise de conformidade)
2. `mistral/codestral-latest` (Inspeção profunda de sintaxe e padrões)
3. `openrouter/nvidia/nemotron-3-ultra-550b-a55b:free` (Supercomputação de 550B para avaliar riscos)
4. `cf/@cf/zai-org/glm-4.7-flash` (Varredura rápida)
5. `cx/gpt-5.6-luna-review` (Critério sênior de engenharia)
6. `kr/glm-5` (Segunda opinião de arquitetura)
7. `kr/claude-haiku-4.5-agentic` (Síntese executiva e emissão do `PARECER-XXX.md`)

---

## 3. Diretriz para o Hermes ao Criar uma Task

Em toda nova especificação em `docs/orquestracao/[backend|frontend]/tasks/TASK-XXX.md`, o Hermes incluirá no cabeçalho:

```markdown
**Combo Recomendado no 9Router:** [Backend | FrontEnd | QATESTES | Auditoria]
**Modelo Sugerido para Iniciar:** kgw/poolside/laguna-s-2.1:free (ou gemini-3.8-flash)
**Modelo de Fallback se Falhar:** mmg/MiniMax-M3 ou openrouter/nvidia/nemotron-3-ultra-550b-a55b:free
```

Dessa forma, você só precisa olhar o cabeçalho da task e já sabe exatamente qual combo/modelo deixar selecionado no OpenCode!

# ROTEADOR DE CONTEXTO & ECONOMIA DE TOKENS (MANGANETWORKING)

> **Regra Fundamental:** O operário (OpenCode) NUNCA deve ler o repositório inteiro.
> Ler pastas inteiras causa estouro de cota (erro 429) e perda de atenção (*lost-in-the-middle*).
> **Orçamento Máximo por Tarefa:** Ler no máximo **2 a 3 arquivos** indicados na matriz abaixo.

---

## 1. Matriz de Roteamento por Domínio (MangaNetWorking)

| Domínio de Negócio | O que o Backend deve ler | O que o Frontend deve ler | Doc de Suporte |
| :--- | :--- | :--- | :--- |
| **1. Autenticação & 2FA** | `backend/src/main/java/com/manganetworking/service/auth/`<br>`backend/src/main/java/com/manganetworking/controller/AuthController.java` | `frontend/src/pages/LoginPage.tsx`<br>`frontend/src/api/authApi.ts` | `docs/reviews/SECURITY_REQUIREMENTS.md` |
| **2. Sessão & Rate Limiting** | `backend/src/main/java/com/manganetworking/service/session/SessionStore.java`<br>`backend/src/main/java/com/manganetworking/config/security/RateLimitingFilter.java` | `frontend/src/api/client.ts` | `docs/decisions/ADR-002-seguranca-sessoes-e-cookies.md` |
| **3. Armazenamento & Uploads** | `backend/src/main/java/com/manganetworking/service/storage/FileStorageService.java`<br>`backend/src/main/java/com/manganetworking/service/storage/LocalFileStorageService.java`<br>`backend/src/main/java/com/manganetworking/service/storage/ChapterFileAccessGuard.java` | `frontend/src/api/storageApi.ts` | `docs/decisions/ADR-001-arquitetura-bancos-e-storage.md` |
| **4. Obras, Capítulos & Leitor** | `backend/src/main/java/com/manganetworking/service/work/WorkApplicationService.java`<br>`backend/src/main/java/com/manganetworking/controller/WorkController.java` | `frontend/src/pages/ReaderPage.tsx`<br>`frontend/src/pages/WorkDetailPage.tsx` | `docs/reviews/BUSINESS_RULES.md` |
| **5. Monetização, Doação & VIP** | `backend/src/main/java/com/manganetworking/service/monetization/`<br>`backend/src/main/java/com/manganetworking/controller/MonetizationController.java` | `frontend/src/components/VipModal.tsx`<br>`frontend/src/api/monetizationApi.ts` | `docs/reviews/BUSINESS_RULES.md` |
| **6. Denúncias & Moderação** | `backend/src/main/java/com/manganetworking/service/report/`<br>`backend/src/main/java/com/manganetworking/controller/ReportController.java` | `frontend/src/pages/ModerationBackofficePage.tsx`<br>`frontend/src/components/ReportModal.tsx` | `docs/reviews/BUSINESS_RULES.md` |
| **7. Feed, Descoberta & Seasons** | `backend/src/main/java/com/manganetworking/service/creator/`<br>`backend/src/main/java/com/manganetworking/service/recommendation/` | `frontend/src/pages/HomePage.tsx`<br>`frontend/src/pages/CreatorWorkspacePage.tsx` | `docs/reviews/BUSINESS_RULES.md` |

---

## 2. Princípios de Execução para o OpenCode

1. **Caminhos Reais:** Todo arquivo Java fica dentro de `backend/src/main/java/com/manganetworking/...`.
2. **Execução de Testes:** Para rodar os testes via PowerShell:
   ```powershell
   Set-Location backend; mvn test
   ```
3. **Relatório de Saída:** Gravar em `docs/orquestracao/backend/relatorios/RELATORIO-XXX.md`.

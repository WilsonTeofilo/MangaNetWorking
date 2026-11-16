# TASK-101: Decomposição SRP de AuthApplicationService e Extração de GoogleAuthService

## 1. Contexto & Problema
O serviço `AuthApplicationService.java` acumulava mais de 400 linhas, misturando o fluxo de registro e 2FA do MangaNetWorking com lógica específica de transporte HTTP e verificação de JWT do Google Identity Services (GoogleIdTokenVerifier, GsonFactory, NetHttpTransport, parsing de claims e mocks de staging).

## 2. Escopo da Solução
1. Criar `GoogleAuthService.java` com responsabilidade única de validar tokens OpenID Connect do Google Identity Services e extrair claims verificadas do usuário.
2. Injetar `GoogleAuthService` em `AuthApplicationService` e delegar a verificação de token para `googleAuthService.verifyToken(dto.googleToken())`.
3. Criar suíte de testes unitários dedicada `GoogleAuthServiceTest.java`.

## 3. Critérios de Aceite
- [x] Extração de `GoogleAuthService` isolando transporte HTTP e mock de staging.
- [x] Suíte `AuthApplicationServiceTest` com 15/15 testes passando.
- [x] Suíte `GoogleAuthServiceTest` com 3/3 testes passando.

Assinado por: Hermes (Tech Lead / Gerente / Arquiteto)

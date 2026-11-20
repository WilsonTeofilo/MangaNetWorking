# RELATORIO-TASK-129 — Inversão de Dependência no MercadoPagoController & Endpoint de Preço VIP

**Tarefa:** TASK-129  
**Executor:** OpenCode Backend  
**Data:** 20/11/2026  
**Status:** CONCLUÍDO COM SUCESSO  

---

## 1. Resumo Executivo das Alterações

Em conformidade com a especificação técnica da TASK-129 e os princípios de Clean Architecture (Inversão de Dependência - DIP da ADR-003):

1. **Desacoplamento de `MercadoPagoController`**:
   - Removida a injeção concreta de `MercadoPagoService`.
   - Injetada exclusivamente a porta de saída agnóstica `PaymentGatewayPort` juntamente com `AuthApplicationService`.
   - Chamadas de criação de checkout VIP (`createVipCheckoutPreference`), consulta de preço (`getVipPrice`), validação de webhook (`verifyWebhookSignature`) e processamento (`processPaymentNotification`) foram todas redirecionadas para a interface `PaymentGatewayPort`.

2. **Criação do Endpoint de Consulta de Preço VIP**:
   - Implementado endpoint `GET /api/monetization/mercadopago/vip/price` retornando status 200 com JSON contendo `{"priceBrl": <valor>}`.
   - Endpoint liberado no `SecurityConfig.java` como rota pública (`permitAll()`), permitindo tanto a consulta antes do login no frontend quanto por usuários autenticados (método GET idempotente livre de CSRF).

3. **Atualização da Suíte de Testes Unitários**:
   - `MercadoPagoControllerTest` atualizado para instanciar o controller com mock de `PaymentGatewayPort`.
   - Adicionados testes unitários específicos:
     - `getVipPriceReturnsConfiguredAmount`: valida status HTTP 200 e payload com `priceBrl`.
     - `createVipCheckoutReturnsCheckoutUrlAndPrice`: valida delegação para a porta e resposta correta.
     - `webhookProcessesPaymentWhenSignatureIsValid`: valida o fluxo feliz do webhook processando o pagamento.
     - Preservados os testes existentes de rejeição de assinatura inválida/ausente e notificação não-payment.

4. **Resultados de Execução e Testes**:
   - Suíte Maven executada localmente: `mvn -o test`.
   - **478 testes executados com 0 falhas, 0 erros e 0 ignorados** (100% verde).
   - Commit `89159e5` realizado e enviado com sucesso para a branch `develop` do repositório `MangaNetWorking`.

---

## 2. Verificação dos Critérios de Aceite

- [x] `MercadoPagoController` importa e injeta exclusivamente `PaymentGatewayPort` e `AuthApplicationService` (sem acoplamento direto com `MercadoPagoService`).
- [x] Endpoint `GET /api/monetization/mercadopago/vip/price` implementado e retornando HTTP 200 com `priceBrl`.
- [x] Endpoint `POST /api/monetization/mercadopago/vip/checkout` continua funcionando através de `paymentGatewayPort.createVipCheckoutPreference(...)`.
- [x] Endpoint `POST /api/monetization/mercadopago/webhook` continua validando assinatura e processando via `paymentGatewayPort`.
- [x] `mvn test` no backend passa com 0 falhas e 0 erros (478 testes verdes).

---

## 3. Evidência Real da Suíte de Testes

```powershell
Set-Location D:\Projetos\MangaNetWorking\backend; mvn -o test
```

```text
[INFO] Scanning for projects...
[INFO] 
[INFO] ------------< com.manganetworking:manganetworking-backend >-------------
[INFO] Building MangaNetWorking Backend 1.0.0-SNAPSHOT
[INFO]   from pom.xml
[INFO] --------------------------------[ jar ]---------------------------------
[INFO] 
[INFO] --- resources:3.3.1:resources (default-resources) @ manganetworking-backend ---
[INFO] Copying 1 resource from src\main\resources to target\classes
[INFO] Copying 28 resources from src\main\resources to target\classes
[INFO] 
[INFO] --- compiler:3.13.0:compile (default-compile) @ manganetworking-backend ---
[INFO] Recompiling the module because of changed source code.
[INFO] Compiling 250 source files with javac [debug parameters release 21] to target\classes
[INFO] 
[INFO] --- resources:3.3.1:testResources (default-testResources) @ manganetworking-backend ---
[INFO] skip non existing resourceDirectory D:\Projetos\MangaNetWorking\backend\src\test\resources
[INFO] 
[INFO] --- compiler:3.13.0:testCompile (default-testCompile) @ manganetworking-backend ---
[INFO] Recompiling the module because of changed dependency.
[INFO] Compiling 82 source files with javac [debug parameters release 21] to target\test-classes
[INFO] 
[INFO] --- surefire:3.5.2:test (default-test) @ manganetworking-backend ---
[INFO] Using auto detected provider org.apache.maven.surefire.junitplatform.JUnitPlatformProvider
[INFO] 
[INFO] -------------------------------------------------------
[INFO]  T E S T S
[INFO] -------------------------------------------------------
...
[INFO] Results:
[INFO] 
[INFO] Tests run: 478, Failures: 0, Errors: 0, Skipped: 0
[INFO] 
[INFO] ------------------------------------------------------------------------
[INFO] BUILD SUCCESS
[INFO] ------------------------------------------------------------------------
[INFO] Total time:  01:10 min
[INFO] Finished at: 2026-11-20T14:54:12-03:00
[INFO] ------------------------------------------------------------------------
```

---

Assinado por: OpenCode Backend

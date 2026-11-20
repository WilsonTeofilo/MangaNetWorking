# TASK-129 — Inversão de Dependência no MercadoPagoController & Endpoint de Preço VIP

## Contexto & Motivação
Atualmente, `MercadoPagoController` injeta diretamente a classe concreta `MercadoPagoService` em vez da porta de saída `PaymentGatewayPort` (definida na ADR-003). Isso viola o Princípio da Inversão de Dependência (DIP) da Clean Architecture.
Além disso, para atender à TASK-128 no frontend (onde o `VipModal` precisa exibir o valor da assinatura antes do clique), precisamos de um endpoint leve para consultar o preço VIP atual.

## Objetivos
1. **Substituir a injeção concreta no Controller:**
   - Trocar `MercadoPagoService` por `PaymentGatewayPort` em `MercadoPagoController`.
2. **Adicionar endpoint para consulta de preço VIP:**
   - Adicionar `GET /api/monetization/mercadopago/vip/price` retornando `{"priceBrl": <valor>}`.
   - Endpoint deve ser público ou acessível por usuários autenticados (livre de CSRF pois é método idempotente GET).
3. **Ajustar testes existentes:**
   - Atualizar testes de controller / integração onde `MercadoPagoController` é instanciado ou mockado, garantindo que o Spring Context injete o bean via `PaymentGatewayPort`.
   - Garantir que todos os testes unitários e de integração continuem 100% verdes.

## Critérios de Aceite
- [ ] `MercadoPagoController` importa e injeta exclusivamente `PaymentGatewayPort` e `AuthApplicationService` (sem acoplamento direto com `MercadoPagoService`).
- [ ] Endpoint `GET /api/monetization/mercadopago/vip/price` implementado e retornando HTTP 200 com `priceBrl`.
- [ ] Endpoint `POST /api/monetization/mercadopago/vip/checkout` continua funcionando através de `paymentGatewayPort.createVipCheckoutPreference(...)`.
- [ ] Endpoint `POST /api/monetization/mercadopago/webhook` continua validando assinatura e processando via `paymentGatewayPort`.
- [ ] `mvn test` no backend passa com 0 falhas e 0 erros.

---
*Assinado por: Hermes (Tech Lead / Gerente / Arquiteto)*

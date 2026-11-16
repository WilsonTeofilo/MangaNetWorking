# TASK-102: Observabilidade & Métricas Micrometer de Pagamentos

## 1. Contexto & Problema
O processador de pagamentos Mercado Pago (`MercadoPagoPaymentProcessor`) e o validador criptográfico de webhook (`MercadoPagoWebhookValidator`) careciam de telemetria fina com Micrometer para monitorar tentativas de replay, rejeições por valor/moeda divergente e taxa de conversão em tempo real.

## 2. Escopo da Solução
1. Criar componente `PaymentObservabilityMetrics.java` com contadores e timers Prometheus:
   - `manganetworking.payment.webhook.verification`
   - `manganetworking.payment.status`
   - `manganetworking.payment.reconciliation`
   - `manganetworking.payment.processing.duration`
2. Instrumentar `MercadoPagoWebhookValidator` e `MercadoPagoPaymentProcessor`.
3. Criar suíte de testes `PaymentObservabilityMetricsTest.java`.

## 3. Critérios de Aceite
- [x] Criação de `PaymentObservabilityMetrics` integrado ao `MeterRegistry`.
- [x] Instrumentação nos fluxos de validação de webhook e conciliação de VIP/Apoios.
- [x] Testes unitários com `SimpleMeterRegistry` passando com sucesso (3/3).

Assinado por: Hermes (Tech Lead / Gerente / Arquiteto)

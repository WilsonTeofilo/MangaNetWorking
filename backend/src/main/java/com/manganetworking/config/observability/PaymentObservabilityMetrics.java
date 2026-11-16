package com.manganetworking.config.observability;

import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import org.springframework.stereotype.Component;

import java.time.Duration;

/**
 * Métricas de observabilidade Micrometer para o fluxo financeiro e pagamentos Mercado Pago.
 * <p>
 * Permite monitorar:
 * <ul>
 *   <li>Tentativas de replay e integridade de webhooks: {@code manganetworking.payment.webhook.verification}</li>
 *   <li>Taxas de conversão e status recebidos do gateway: {@code manganetworking.payment.status}</li>
 *   <li>Reconciliação idempotente no Ledger e ativação de benefícios: {@code manganetworking.payment.reconciliation}</li>
 *   <li>Latência do processamento assíncrono de notificações: {@code manganetworking.payment.processing.duration}</li>
 * </ul>
 * </p>
 */
@Component
public class PaymentObservabilityMetrics {

    private final MeterRegistry registry;

    public PaymentObservabilityMetrics(MeterRegistry registry) {
        this.registry = registry;
    }

    /**
     * Registra o resultado da verificação de assinatura e janela temporal do webhook.
     *
     * @param outcome "valid", "invalid_signature", "expired_replay", "missing_secret", "malformed_headers"
     */
    public void recordWebhookVerification(String outcome) {
        registry.counter("manganetworking.payment.webhook.verification", "outcome", outcome).increment();
    }

    /**
     * Registra o status de um pagamento processado do Mercado Pago.
     *
     * @param type "vip", "donation", "membership", "unknown"
     * @param status "approved", "pending", "refunded", "charged_back", "amount_mismatch", "currency_mismatch", "invalid_ref"
     */
    public void recordPaymentStatus(String type, String status) {
        registry.counter("manganetworking.payment.status", "type", type, "status", status).increment();
    }

    /**
     * Registra a ativação de benefícios ou escrita no Ledger.
     *
     * @param type "vip", "donation", "membership"
     * @param outcome "success", "already_processed", "error"
     */
    public void recordReconciliation(String type, String outcome) {
        registry.counter("manganetworking.payment.reconciliation", "type", type, "outcome", outcome).increment();
    }

    /**
     * Registra a duração do ciclo de processamento do pagamento.
     *
     * @param type "vip", "donation", "membership"
     * @param duration tempo de execução do processamento
     */
    public void recordProcessingDuration(String type, Duration duration) {
        Timer.builder("manganetworking.payment.processing.duration")
                .tag("type", type)
                .description("Tempo total para processar e reconciliar a notificação de pagamento")
                .register(registry)
                .record(duration);
    }
}

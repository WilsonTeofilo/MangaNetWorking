package com.manganetworking.service.monetization;

import com.manganetworking.config.properties.PlatformProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Supplier;

/**
 * Processador de notificações de pagamento do Mercado Pago.
 *
 * <p>Valida status (aprovado), moeda (BRL), valores esperados, referências de checkout
 * persistidas e ativa os benefícios via {@link MonetizationService} de forma estritamente idempotente.</p>
 */
@Service
public class MercadoPagoPaymentProcessor {

    private static final Logger log = LoggerFactory.getLogger(MercadoPagoPaymentProcessor.class);
    private static final String MP_API_BASE = "https://api.mercadopago.com";
    public static final String VIP_REFERENCE_PREFIX = "MN_VIP|";
    public static final String VIP_PAYMENT_PREFIX = "MP_PAYMENT_";
    public static final String SUPPORT_REFERENCE_PREFIX = "MN_SUPPORT|";
    public static final int CHECKOUT_REFERENCE_LENGTH = 16;

    private final PlatformProperties properties;
    private final MonetizationService monetizationService;
    private final JdbcTemplate jdbcTemplate;
    private RestClient defaultRestClient;
    private Supplier<RestClient> restClientSupplier;

    public MercadoPagoPaymentProcessor(
            PlatformProperties properties,
            MonetizationService monetizationService,
            JdbcTemplate jdbcTemplate
    ) {
        this(properties, monetizationService, jdbcTemplate, null);
    }

    public MercadoPagoPaymentProcessor(
            PlatformProperties properties,
            MonetizationService monetizationService,
            JdbcTemplate jdbcTemplate,
            Supplier<RestClient> restClientSupplier
    ) {
        this.properties = properties;
        this.monetizationService = monetizationService;
        this.jdbcTemplate = jdbcTemplate;
        this.restClientSupplier = restClientSupplier;

        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofSeconds(5));
        requestFactory.setReadTimeout(Duration.ofSeconds(10));
        this.defaultRestClient = RestClient.builder()
                .baseUrl(MP_API_BASE)
                .requestFactory(requestFactory)
                .build();
    }

    private RestClient restClient() {
        if (restClientSupplier != null) {
            RestClient supplied = restClientSupplier.get();
            if (supplied != null) {
                return supplied;
            }
        }
        return defaultRestClient;
    }

    public void setRestClient(RestClient restClient) {
        if (restClient != null) {
            this.defaultRestClient = restClient;
        }
    }

    /**
     * Processa a notificação de pagamento. Só ativa o VIP ou apoio quando o pagamento
     * estiver aprovado, em BRL, com o valor configurado e referência de checkout persistida.
     */
    @Transactional
    public void processPaymentNotification(String paymentId) {
        if (paymentId == null || !paymentId.matches("[A-Za-z0-9_-]{1,100}")) {
            return;
        }
        String accessToken = properties.getMercadopago().getAccessToken();
        if (accessToken == null || accessToken.isBlank()) {
            throw new IllegalStateException("MERCADOPAGO_ACCESS_TOKEN não configurado.");
        }

        Map<?, ?> payment = fetchPayment(paymentId, accessToken);
        if (payment == null) {
            return;
        }

        String status = String.valueOf(payment.get("status"));
        if (!"approved".equals(status)) {
            if ("refunded".equals(status) || "charged_back".equals(status)) {
                log.warn("[MERCADO-PAGO] Pagamento {} exige conciliação de estorno/chargeback.", paymentId);
            }
            return;
        }
        if (!"BRL".equals(payment.get("currency_id"))) {
            log.warn("[MERCADO-PAGO] Pagamento {} com moeda divergente; ignorado.", paymentId);
            return;
        }
        if (payment.get("external_reference") instanceof String externalReference
                && externalReference.startsWith(SUPPORT_REFERENCE_PREFIX)) {
            if (payment.get("transaction_amount") instanceof Number amount) {
                processSupportPayment(paymentId, new BigDecimal(amount.toString()).setScale(2, RoundingMode.HALF_EVEN),
                        externalReference, accessToken);
            }
            return;
        }
        if (!(payment.get("transaction_amount") instanceof Number amount)
                || new BigDecimal(amount.toString()).setScale(2, RoundingMode.HALF_EVEN)
                .compareTo(properties.getVipPrice().setScale(2, RoundingMode.HALF_EVEN)) != 0) {
            log.warn("[MERCADO-PAGO] Pagamento {} com valor divergente; ignorado.", paymentId);
            return;
        }

        Optional<CheckoutReference> reference = parseExternalReference(payment.get("external_reference"));
        if (reference.isEmpty()) {
            log.warn("[MERCADO-PAGO] Pagamento {} sem referência de checkout válida; ignorado.", paymentId);
            return;
        }
        CheckoutReference checkout = reference.get();

        Optional<String> preferenceId = findPreferenceId(checkout.checkoutReference(), checkout.userId());
        if (preferenceId.isEmpty()) {
            log.warn("[MERCADO-PAGO] Pagamento {} sem checkout persistido para o usuário; ignorado.", paymentId);
            return;
        }

        String expectedExternalReference = VIP_REFERENCE_PREFIX + checkout.userId()
                + "|" + checkout.checkoutReference();
        Map<?, ?> preference = fetchPreference(preferenceId.get(), accessToken);
        if (!isExpectedVipPreference(preference, preferenceId.get(), expectedExternalReference)) {
            log.warn("[MERCADO-PAGO] Pagamento {} não corresponde à preferência persistida; ignorado.", paymentId);
            return;
        }

        monetizationService.subscribePlatformVip(checkout.userId(), VIP_PAYMENT_PREFIX + paymentId);
    }

    private void processSupportPayment(String paymentId, BigDecimal paidAmount, String externalReference, String accessToken) {
        String reference = externalReference.substring(SUPPORT_REFERENCE_PREFIX.length());
        if (!reference.matches("[0-9a-f]{16}")) {
            return;
        }
        SupportCheckoutRecord checkout = jdbcTemplate.query("""
                SELECT checkout_reference, payer_user_id, creator_id, work_id, chapter_id, product_type,
                       expected_amount_brl, message, preference_id, checkout_url, processed_payment_id
                FROM support_checkout_intents WHERE checkout_reference = ? FOR UPDATE
                """, resultSet -> resultSet.next() ? new SupportCheckoutRecord(
                resultSet.getString("checkout_reference"),
                resultSet.getObject("creator_id", UUID.class),
                resultSet.getObject("work_id", UUID.class),
                resultSet.getObject("chapter_id", UUID.class),
                resultSet.getString("product_type"),
                resultSet.getBigDecimal("expected_amount_brl"),
                resultSet.getString("message"),
                resultSet.getString("preference_id"),
                resultSet.getString("checkout_url"),
                resultSet.getObject("payer_user_id", UUID.class),
                resultSet.getString("processed_payment_id")) : null, reference);

        if (checkout == null || checkout.preferenceId() == null
                || paidAmount.compareTo(checkout.amount()) != 0) {
            return;
        }
        String expectedReference = SUPPORT_REFERENCE_PREFIX + checkout.reference();
        Map<?, ?> preference = fetchPreference(checkout.preferenceId(), accessToken);
        if (!isExpectedSupportPreference(preference, checkout, expectedReference)) {
            return;
        }
        if (checkout.processedPaymentId() != null) {
            return;
        }

        int claimed = jdbcTemplate.update("""
                UPDATE support_checkout_intents SET processed_payment_id = ?
                WHERE checkout_reference = ? AND processed_payment_id IS NULL
                """, paymentId, checkout.reference());
        if (claimed != 1) {
            return;
        }

        String externalPaymentId = VIP_PAYMENT_PREFIX + paymentId;
        if ("DONATION".equals(checkout.productType())) {
            monetizationService.processDonation(checkout.payerUserId(), checkout.creatorId(),
                    checkout.workId(), checkout.chapterId(), checkout.amount(), checkout.message(), externalPaymentId);
        } else if ("MEMBERSHIP".equals(checkout.productType())) {
            monetizationService.subscribeMembership(checkout.payerUserId(), checkout.creatorId(), checkout.amount(), externalPaymentId);
        }
    }

    private boolean isExpectedSupportPreference(Map<?, ?> preference, SupportCheckoutRecord checkout, String reference) {
        if (preference == null || !checkout.preferenceId().equals(String.valueOf(preference.get("id")))
                || !reference.equals(preference.get("external_reference"))) {
            return false;
        }
        if (!(preference.get("items") instanceof List<?> items) || items.size() != 1
                || !(items.get(0) instanceof Map<?, ?> item)
                || !(item.get("unit_price") instanceof Number price)) {
            return false;
        }
        String title = String.valueOf(item.get("title"));
        String expectedTitleStart = "MEMBERSHIP".equals(checkout.productType())
                ? "Clube de Membros — " : "Apoio ao criador — ";
        return title.startsWith(expectedTitleStart)
                && new BigDecimal(price.toString()).setScale(2, RoundingMode.HALF_EVEN).compareTo(checkout.amount().setScale(2, RoundingMode.HALF_EVEN)) == 0
                && "BRL".equals(item.get("currency_id"));
    }

    public Map<?, ?> fetchPayment(String paymentId, String accessToken) {
        try {
            return restClient().get()
                    .uri("/v1/payments/{id}", paymentId)
                    .header("Authorization", "Bearer " + accessToken)
                    .retrieve()
                    .body(Map.class);
        } catch (RestClientResponseException exception) {
            if (exception.getStatusCode().is4xxClientError()) {
                log.warn("[MERCADO-PAGO] Pagamento {} recusado pela API ({}).",
                        paymentId, exception.getStatusCode().value());
                return null;
            }
            throw exception;
        }
    }

    public Map<?, ?> fetchPreference(String preferenceId, String accessToken) {
        try {
            return restClient().get()
                    .uri("/checkout/preferences/{id}", preferenceId)
                    .header("Authorization", "Bearer " + accessToken)
                    .retrieve()
                    .body(Map.class);
        } catch (RestClientResponseException exception) {
            if (exception.getStatusCode().is4xxClientError()) {
                log.warn("[MERCADO-PAGO] Preferência {} recusada pela API ({}).",
                        preferenceId, exception.getStatusCode().value());
                return null;
            }
            throw exception;
        }
    }

    private Optional<CheckoutReference> parseExternalReference(Object value) {
        if (!(value instanceof String reference) || !reference.startsWith(VIP_REFERENCE_PREFIX)) {
            return Optional.empty();
        }
        String[] parts = reference.split("\\|", 3);
        if (parts.length != 3 || !"MN_VIP".equals(parts[0])) {
            return Optional.empty();
        }

        String checkoutReference = parts[2];
        if (checkoutReference.length() != CHECKOUT_REFERENCE_LENGTH
                || !checkoutReference.matches("[0-9a-f]{" + CHECKOUT_REFERENCE_LENGTH + "}")) {
            return Optional.empty();
        }
        try {
            return Optional.of(new CheckoutReference(UUID.fromString(parts[1]), checkoutReference));
        } catch (IllegalArgumentException exception) {
            return Optional.empty();
        }
    }

    private Optional<String> findPreferenceId(String checkoutReference, UUID userId) {
        String preferenceId = jdbcTemplate.query(
                "SELECT preference_id FROM mercadopago_checkout_preferences "
                        + "WHERE checkout_reference = ? AND user_id = ? AND expected_amount_brl = ?",
                resultSet -> resultSet.next() ? resultSet.getString("preference_id") : null,
                checkoutReference, userId, properties.getVipPrice());
        return Optional.ofNullable(preferenceId);
    }

    private boolean isExpectedVipPreference(
            Map<?, ?> preference,
            String preferenceId,
            String expectedExternalReference
    ) {
        if (preference == null || !preferenceId.equals(preference.get("id"))) {
            return false;
        }
        if (!expectedExternalReference.equals(preference.get("external_reference"))) {
            return false;
        }
        if (!(preference.get("items") instanceof List<?> items) || items.size() != 1) {
            return false;
        }
        if (!(items.get(0) instanceof Map<?, ?> item)) {
            return false;
        }
        if (!(item.get("unit_price") instanceof Number unitPrice)) {
            return false;
        }
        if (new BigDecimal(unitPrice.toString()).setScale(2, RoundingMode.HALF_EVEN)
                .compareTo(properties.getVipPrice().setScale(2, RoundingMode.HALF_EVEN)) != 0) {
            return false;
        }
        return "BRL".equals(item.get("currency_id"));
    }

    private record CheckoutReference(UUID userId, String checkoutReference) {}

    private record SupportCheckoutRecord(
            String reference, UUID creatorId, UUID workId, UUID chapterId, String productType,
            BigDecimal amount, String message, String preferenceId, String checkoutUrl,
            UUID payerUserId, String processedPaymentId
    ) {}
}

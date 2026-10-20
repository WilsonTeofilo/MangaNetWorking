package com.manganetworking.service.monetization;

import com.manganetworking.config.properties.PlatformProperties;
import com.manganetworking.domain.relational.UserEntity;
import com.manganetworking.domain.relational.CreatorEntity;
import com.manganetworking.domain.enums.ChapterFormat;
import com.manganetworking.repository.jpa.ChapterRepository;
import com.manganetworking.repository.jpa.CreatorRepository;
import com.manganetworking.repository.jpa.UserRepository;
import com.manganetworking.repository.jpa.WorkRepository;
import com.manganetworking.service.monetization.dto.CheckoutResponseDto;
import com.manganetworking.util.CpfValidator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
public class MercadoPagoService {

    private static final Logger log = LoggerFactory.getLogger(MercadoPagoService.class);
    private static final String MP_API_BASE = "https://api.mercadopago.com";
    private static final String VIP_REFERENCE_PREFIX = "MN_VIP|";
    private static final String VIP_PRODUCT = "VIP_30_DAYS";
    private static final String VIP_PAYMENT_PREFIX = "MP_PAYMENT_";
    private static final String SUPPORT_REFERENCE_PREFIX = "MN_SUPPORT|";
    private static final int CHECKOUT_REFERENCE_LENGTH = 16;
    private static final Duration WEBHOOK_SIGNATURE_MAX_AGE = Duration.ofMinutes(15);

    private final PlatformProperties properties;
    private final UserRepository userRepository;
    private final MonetizationService monetizationService;
    private final JdbcTemplate jdbcTemplate;
    private final CreatorRepository creatorRepository;
    private final WorkRepository workRepository;
    private final ChapterRepository chapterRepository;
    private final RestClient restClient;

    public MercadoPagoService(
            PlatformProperties properties,
            UserRepository userRepository,
            MonetizationService monetizationService,
            JdbcTemplate jdbcTemplate,
            CreatorRepository creatorRepository,
            WorkRepository workRepository,
            ChapterRepository chapterRepository
    ) {
        this.properties = properties;
        this.userRepository = userRepository;
        this.monetizationService = monetizationService;
        this.jdbcTemplate = jdbcTemplate;
        this.creatorRepository = creatorRepository;
        this.workRepository = workRepository;
        this.chapterRepository = chapterRepository;

        // Sem timeout, uma indisponibilidade do Mercado Pago prenderia a transação do webhook.
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofSeconds(5));
        requestFactory.setReadTimeout(Duration.ofSeconds(10));
        this.restClient = RestClient.builder()
                .baseUrl(MP_API_BASE)
                .requestFactory(requestFactory)
                .build();
    }

    @Transactional
    public CheckoutResponseDto createDonationCheckoutPreference(
            UUID payerUserId, UUID creatorId, UUID workId, UUID chapterId,
            BigDecimal amountBrl, String message, String idempotencyKey
    ) {
        if (amountBrl == null || amountBrl.compareTo(new BigDecimal("2.00")) < 0
                || amountBrl.compareTo(new BigDecimal("10000.00")) > 0) {
            throw new IllegalArgumentException("O valor do apoio deve estar entre R$ 2,00 e R$ 10.000,00.");
        }
        return createSupportCheckout(payerUserId, creatorId, workId, chapterId, "DONATION",
                amountBrl.setScale(2, java.math.RoundingMode.UNNECESSARY), message, idempotencyKey);
    }

    @Transactional
    public CheckoutResponseDto createMembershipCheckoutPreference(UUID payerUserId, UUID creatorId, String idempotencyKey) {
        CreatorEntity creator = creatorRepository.findById(creatorId)
                .orElseThrow(() -> new IllegalArgumentException("Criador não encontrado."));
        return createSupportCheckout(payerUserId, creatorId, null, null, "MEMBERSHIP",
                creator.getMembershipPriceBrl(), null, idempotencyKey);
    }

    private CheckoutResponseDto createSupportCheckout(
            UUID payerUserId, UUID creatorId, UUID workId, UUID chapterId,
            String productType, BigDecimal amount, String message, String idempotencyKey
    ) {
        if (idempotencyKey == null || !idempotencyKey.matches("[0-9a-fA-F-]{36}")) {
            throw new IllegalArgumentException("Chave de idempotência inválida.");
        }
        String accessToken = requireAccessToken();
        UserEntity payer = userRepository.findById(payerUserId)
                .orElseThrow(() -> new IllegalArgumentException("Usuário não encontrado."));
        if (payer.getEmail() == null || payer.getEmail().isBlank()) {
            throw new IllegalStateException("Usuário sem e-mail não pode iniciar o checkout.");
        }
        CreatorEntity creator = creatorRepository.findById(creatorId)
                .orElseThrow(() -> new IllegalArgumentException("Criador não encontrado."));
        if (!creator.isMonetizationUnlocked() || !CpfValidator.isValid(creator.getDocumentCpf())) {
            throw new IllegalStateException("O criador ainda não está habilitado para receber apoio financeiro.");
        }
        if (workId != null && workRepository.findById(workId).filter(work -> work.getAuthor().getId().equals(creatorId)).isEmpty()) {
            throw new IllegalArgumentException("A obra informada não pertence a este criador.");
        }
        if (chapterId != null && (workId == null || chapterRepository.findById(chapterId)
                .filter(chapter -> chapter.getWork().getId().equals(workId)).isEmpty())) {
            throw new IllegalArgumentException("O capítulo informado não pertence à obra.");
        }

        String checkoutReference = newCheckoutReference();
        jdbcTemplate.update("""
                INSERT INTO support_checkout_intents
                    (checkout_reference, payer_user_id, creator_id, work_id, chapter_id,
                     product_type, idempotency_key, expected_amount_brl, message)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT (payer_user_id, product_type, idempotency_key) DO NOTHING
                """, checkoutReference, payerUserId, creatorId, workId, chapterId,
                productType, idempotencyKey.toLowerCase(Locale.ROOT), amount, message);

        SupportCheckout checkout = jdbcTemplate.query("""
                SELECT checkout_reference, creator_id, work_id, chapter_id, product_type,
                       expected_amount_brl, message, preference_id, checkout_url
                FROM support_checkout_intents
                WHERE payer_user_id = ? AND product_type = ? AND idempotency_key = ?
                FOR UPDATE
                """, resultSet -> resultSet.next() ? new SupportCheckout(
                resultSet.getString("checkout_reference"),
                resultSet.getObject("creator_id", UUID.class),
                resultSet.getObject("work_id", UUID.class),
                resultSet.getObject("chapter_id", UUID.class),
                resultSet.getString("product_type"),
                resultSet.getBigDecimal("expected_amount_brl"),
                resultSet.getString("message"),
                resultSet.getString("preference_id"),
                resultSet.getString("checkout_url")) : null,
                payerUserId, productType, idempotencyKey.toLowerCase(Locale.ROOT));
        if (checkout == null) throw new IllegalStateException("Não foi possível persistir o checkout.");
        if (!creatorId.equals(checkout.creatorId()) || !java.util.Objects.equals(workId, checkout.workId())
                || !java.util.Objects.equals(chapterId, checkout.chapterId()) || amount.compareTo(checkout.amount()) != 0
                || !java.util.Objects.equals(message, checkout.message())) {
            throw new IllegalArgumentException("A chave de idempotência já foi usada com dados diferentes.");
        }
        if (checkout.checkoutUrl() != null && checkout.preferenceId() != null) {
            return new CheckoutResponseDto(checkout.checkoutUrl(), checkout.amount());
        }

        String externalReference = SUPPORT_REFERENCE_PREFIX + checkout.reference();
        String title = "MEMBERSHIP".equals(productType) ? "Clube de Membros — " + creator.getHandle()
                : "Apoio ao criador — " + creator.getHandle();
        String backUrlBase = properties.getMercadopago().getBackUrlBase().replaceAll("/+$", "");
        if (backUrlBase.isBlank()) throw new IllegalStateException("MERCADOPAGO_BACK_URL_BASE não configurado.");
        Map<String, Object> body = new java.util.HashMap<>(Map.of(
                "items", List.of(Map.of("title", title, "quantity", 1, "currency_id", "BRL", "unit_price", amount)),
                "payer", Map.of("email", payer.getEmail()),
                "external_reference", externalReference,
                "back_urls", Map.of("success", backUrlBase + "/apoio?status=approved",
                        "pending", backUrlBase + "/apoio?status=pending",
                        "failure", backUrlBase + "/apoio?status=failure"),
                "statement_descriptor", "MANGANETWORKING",
                "binary_mode", true,
                "metadata", Map.of("product", productType, "creator_id", creatorId.toString())
        ));
        String notificationUrl = properties.getMercadopago().getNotificationUrl();
        if (notificationUrl != null && !notificationUrl.isBlank()) body.put("notification_url", notificationUrl);

        Map<?, ?> response = restClient.post().uri("/checkout/preferences")
                .header("Authorization", "Bearer " + accessToken)
                .header("X-Idempotency-Key", payerUserId + ":" + productType + ":" + idempotencyKey)
                .contentType(MediaType.APPLICATION_JSON).body(body).retrieve().body(Map.class);
        if (response == null || !(response.get("id") instanceof String preferenceId)
                || !(response.get("init_point") instanceof String checkoutUrl) || !isMercadoPagoCheckoutUrl(checkoutUrl)) {
            throw new IllegalStateException("Resposta inválida do Mercado Pago ao gerar Checkout.");
        }
        jdbcTemplate.update("UPDATE support_checkout_intents SET preference_id = ?, checkout_url = ? WHERE checkout_reference = ?",
                preferenceId, checkoutUrl, checkout.reference());
        return new CheckoutResponseDto(checkoutUrl, amount);
    }

    /**
     * Cria a preferência do Checkout Pro e persiste o vínculo (checkout -> usuário -> valor).
     * O {@code external_reference} carrega um checkout gerado aqui, porque o Mercado Pago não
     * garante o {@code preference_id} no objeto de pagamento notificado.
     */
    public String createVipCheckoutPreference(UUID userId) {
        if (userId == null) throw new IllegalArgumentException("Usuário não autenticado.");
        String accessToken = requireAccessToken();
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Usuário não encontrado."));
        if (user.getEmail() == null || user.getEmail().isBlank()) {
            throw new IllegalStateException("Usuário sem e-mail não pode iniciar o Checkout Pro.");
        }

        BigDecimal price = properties.getVipPrice();
        String backUrlBase = properties.getMercadopago().getBackUrlBase().replaceAll("/+$", "");
        if (backUrlBase.isBlank()) {
            throw new IllegalStateException("MERCADOPAGO_BACK_URL_BASE não configurado.");
        }
        String notificationUrl = properties.getMercadopago().getNotificationUrl();
        String checkoutReference = newCheckoutReference();
        String externalReference = VIP_REFERENCE_PREFIX + userId + "|" + checkoutReference;

        Map<String, Object> body = new java.util.HashMap<>(Map.of(
                "items", List.of(Map.of(
                        "title", "MangaNetWorking — Assinatura VIP (30 dias)",
                        "description", "Leitura sem anúncios por 30 dias.",
                        "quantity", 1,
                        "currency_id", "BRL",
                        "unit_price", price)),
                // Data minimization (LGPD): o Checkout Pro só exige o e-mail do pagador.
                "payer", Map.of("email", user.getEmail()),
                "external_reference", externalReference,
                "back_urls", Map.of(
                        "success", backUrlBase + "/vip?status=approved",
                        "pending", backUrlBase + "/vip?status=pending",
                        "failure", backUrlBase + "/vip?status=failure"),
                "auto_return", "approved",
                "statement_descriptor", "MANGANETWORKING",
                "binary_mode", true,
                // Informativo para suporte; a validação NÃO depende de metadata.
                "metadata", Map.of(
                        "product", VIP_PRODUCT,
                        "expected_amount", price.toPlainString(),
                        "checkout_reference", checkoutReference)
        ));
        if (notificationUrl != null && !notificationUrl.isBlank()) {
            body.put("notification_url", notificationUrl);
        }

        Map<?, ?> response;
        try {
            response = restClient.post()
                    .uri("/checkout/preferences")
                    .header("Authorization", "Bearer " + accessToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(Map.class);
        } catch (Exception exception) {
            log.error("[MERCADO-PAGO] Falha de comunicação ao criar preferência ({}).",
                    exception.getClass().getSimpleName());
            throw new IllegalStateException("Não foi possível criar o checkout no Mercado Pago.");
        }

        if (response == null || !(response.get("id") instanceof String preferenceId)
                || !(response.get("init_point") instanceof String checkoutUrl)
                || !isMercadoPagoCheckoutUrl(checkoutUrl)) {
            throw new IllegalStateException("Resposta inválida do Mercado Pago ao gerar Checkout.");
        }

        try {
            jdbcTemplate.update(
                    "INSERT INTO mercadopago_checkout_preferences "
                            + "(checkout_reference, preference_id, user_id, expected_amount_brl) "
                            + "VALUES (?, ?, ?, ?)",
                    checkoutReference, preferenceId, userId, price);
        } catch (Exception exception) {
            // Sem o vínculo persistido o webhook rejeitaria o pagamento. Falhe agora.
            log.error("[MERCADO-PAGO] Preferência {} criada, mas o vínculo local falhou ({}).",
                    preferenceId, exception.getClass().getSimpleName());
            throw new IllegalStateException("Não foi possível registrar o checkout com segurança. Tente novamente.");
        }
        return checkoutUrl;
    }

    private String newCheckoutReference() {
        return UUID.randomUUID().toString().replace("-", "")
                .substring(0, CHECKOUT_REFERENCE_LENGTH);
    }

    private boolean isMercadoPagoCheckoutUrl(String value) {
        try {
            java.net.URI uri = java.net.URI.create(value);
            String host = uri.getHost();
            return "https".equalsIgnoreCase(uri.getScheme()) && host != null
                    && (host.equalsIgnoreCase("mercadopago.com") || host.endsWith(".mercadopago.com")
                    || host.equalsIgnoreCase("mercadopago.com.br") || host.endsWith(".mercadopago.com.br"));
        } catch (IllegalArgumentException exception) {
            return false;
        }
    }

    public BigDecimal getVipPrice() {
        return properties.getVipPrice();
    }

    private String requireAccessToken() {
        String token = properties.getMercadopago().getAccessToken();
        if (token == null || token.isBlank()) {
            throw new IllegalStateException("MERCADOPAGO_ACCESS_TOKEN não configurado.");
        }
        return token;
    }

    /**
     * Valida a assinatura HMAC-SHA256 do webhook conforme o manifesto do Mercado Pago:
     * {@code id:<data.id>;request-id:<x-request-id>;ts:<ts>;}.
     */
    public boolean verifyWebhookSignature(String signatureHeader, String requestIdHeader, String dataId) {
        String secret = properties.getMercadopago().getWebhookSecret();
        if (secret == null || secret.isBlank() || signatureHeader == null
                || requestIdHeader == null || dataId == null) {
            return false;
        }
        String timestamp = null;
        String signature = null;
        for (String part : signatureHeader.split(",")) {
            String[] keyValue = part.split("=", 2);
            if (keyValue.length != 2) continue;
            String key = keyValue[0].trim();
            if ("ts".equalsIgnoreCase(key)) timestamp = keyValue[1].trim();
            if ("v1".equalsIgnoreCase(key)) signature = keyValue[1].trim();
        }
        if (timestamp == null || signature == null || !timestamp.matches("[0-9]{1,12}")) return false;

        try {
            long timestampSeconds = Long.parseLong(timestamp);
            if (Math.abs(Instant.now().getEpochSecond() - timestampSeconds)
                    > WEBHOOK_SIGNATURE_MAX_AGE.toSeconds()) {
                return false;
            }
            String manifest = "id:" + dataId.trim().toLowerCase(Locale.ROOT)
                    + ";request-id:" + requestIdHeader.trim() + ";ts:" + timestamp + ";";
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] expected = mac.doFinal(manifest.getBytes(StandardCharsets.UTF_8));
            byte[] actual = HexFormat.of().parseHex(signature);
            return MessageDigest.isEqual(expected, actual);
        } catch (Exception exception) {
            return false;
        }
    }

    /**
     * Processa a notificação de pagamento. Só ativa o VIP quando o pagamento está aprovado,
     * em BRL, com o valor configurado, referência de checkout persistida e preferência
     * correspondente. A idempotência é garantida pelo ledger ({@code payment_external_id} UNIQUE).
     */
    @Transactional
    public void processPaymentNotification(String paymentId) {
        if (paymentId == null || !paymentId.matches("[A-Za-z0-9_-]{1,100}")) return;
        String accessToken = properties.getMercadopago().getAccessToken();
        if (accessToken == null || accessToken.isBlank()) {
            throw new IllegalStateException("MERCADOPAGO_ACCESS_TOKEN não configurado.");
        }

        Map<?, ?> payment = fetchPayment(paymentId, accessToken);
        if (payment == null) return;

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
                processSupportPayment(paymentId, new BigDecimal(amount.toString()), externalReference, accessToken);
            }
            return;
        }
        if (!(payment.get("transaction_amount") instanceof Number amount)
                || new BigDecimal(amount.toString()).compareTo(properties.getVipPrice()) != 0) {
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
        if (!reference.matches("[0-9a-f]{16}")) return;
        SupportCheckout checkout = jdbcTemplate.query("""
                SELECT checkout_reference, payer_user_id, creator_id, work_id, chapter_id, product_type,
                       expected_amount_brl, message, preference_id, checkout_url, processed_payment_id
                FROM support_checkout_intents WHERE checkout_reference = ? FOR UPDATE
                """, resultSet -> resultSet.next() ? new SupportCheckout(
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
                || paidAmount.compareTo(checkout.amount()) != 0) return;
        String expectedReference = SUPPORT_REFERENCE_PREFIX + checkout.reference();
        Map<?, ?> preference = fetchPreference(checkout.preferenceId(), accessToken);
        if (!isExpectedSupportPreference(preference, checkout, expectedReference)) return;
        if (checkout.processedPaymentId() != null) return;

        int claimed = jdbcTemplate.update("""
                UPDATE support_checkout_intents SET processed_payment_id = ?
                WHERE checkout_reference = ? AND processed_payment_id IS NULL
                """, paymentId, checkout.reference());
        if (claimed != 1) return;

        String externalPaymentId = VIP_PAYMENT_PREFIX + paymentId;
        if ("DONATION".equals(checkout.productType())) {
            monetizationService.processDonation(checkout.payerUserId(), checkout.creatorId(),
                    checkout.workId(), checkout.chapterId(), checkout.amount(), checkout.message(), externalPaymentId);
        } else if ("MEMBERSHIP".equals(checkout.productType())) {
            monetizationService.subscribeMembership(checkout.payerUserId(), checkout.creatorId(), checkout.amount(), externalPaymentId);
        }
    }

    private boolean isExpectedSupportPreference(Map<?, ?> preference, SupportCheckout checkout, String reference) {
        if (preference == null || !checkout.preferenceId().equals(String.valueOf(preference.get("id")))
                || !reference.equals(preference.get("external_reference"))) return false;
        if (!(preference.get("items") instanceof List<?> items) || items.size() != 1
                || !(items.get(0) instanceof Map<?, ?> item)
                || !(item.get("unit_price") instanceof Number price)) return false;
        String title = String.valueOf(item.get("title"));
        String expectedTitleStart = "MEMBERSHIP".equals(checkout.productType())
                ? "Clube de Membros — " : "Apoio ao criador — ";
        return title.startsWith(expectedTitleStart)
                && new BigDecimal(price.toString()).compareTo(checkout.amount()) == 0
                && "BRL".equals(item.get("currency_id"));
    }

    private Map<?, ?> fetchPayment(String paymentId, String accessToken) {
        try {
            return restClient.get()
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

    private Map<?, ?> fetchPreference(String preferenceId, String accessToken) {
        try {
            return restClient.get()
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
        if (parts.length != 3 || !"MN_VIP".equals(parts[0])) return Optional.empty();

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
        if (preference == null || !preferenceId.equals(preference.get("id"))) return false;
        if (!expectedExternalReference.equals(preference.get("external_reference"))) return false;
        if (!(preference.get("items") instanceof List<?> items) || items.size() != 1) return false;
        if (!(items.get(0) instanceof Map<?, ?> item)) return false;
        if (!(item.get("unit_price") instanceof Number unitPrice)) return false;
        if (new BigDecimal(unitPrice.toString()).compareTo(properties.getVipPrice()) != 0) return false;
        return "BRL".equals(item.get("currency_id"));
    }

    private record CheckoutReference(UUID userId, String checkoutReference) {
    }

    private record SupportCheckout(
            String reference, UUID creatorId, UUID workId, UUID chapterId, String productType,
            BigDecimal amount, String message, String preferenceId, String checkoutUrl,
            UUID payerUserId, String processedPaymentId
    ) {
        private SupportCheckout(String reference, UUID creatorId, UUID workId, UUID chapterId,
                                String productType, BigDecimal amount, String message,
                                String preferenceId, String checkoutUrl) {
            this(reference, creatorId, workId, chapterId, productType, amount, message,
                    preferenceId, checkoutUrl, null, null);
        }
    }
}

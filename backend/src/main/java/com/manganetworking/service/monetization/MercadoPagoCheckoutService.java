package com.manganetworking.service.monetization;

import com.manganetworking.config.properties.PlatformProperties;
import com.manganetworking.domain.relational.CreatorEntity;
import com.manganetworking.domain.relational.UserEntity;
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

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URI;
import java.time.Duration;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.function.Supplier;

/**
 * Serviço responsável pela geração e persistência de preferências de checkout (Checkout Pro) no Mercado Pago.
 */
@Service
public class MercadoPagoCheckoutService {

    private static final Logger log = LoggerFactory.getLogger(MercadoPagoCheckoutService.class);
    private static final String MP_API_BASE = "https://api.mercadopago.com";
    public static final String VIP_REFERENCE_PREFIX = "MN_VIP|";
    public static final String VIP_PRODUCT = "VIP_30_DAYS";
    public static final String SUPPORT_REFERENCE_PREFIX = "MN_SUPPORT|";
    public static final int CHECKOUT_REFERENCE_LENGTH = 16;
    public static final BigDecimal MIN_SUPPORT_AMOUNT_BRL = new BigDecimal("2.00");
    public static final BigDecimal MAX_SUPPORT_AMOUNT_BRL = new BigDecimal("10000.00");

    private final PlatformProperties properties;
    private final UserRepository userRepository;
    private final CreatorRepository creatorRepository;
    private final WorkRepository workRepository;
    private final ChapterRepository chapterRepository;
    private final JdbcTemplate jdbcTemplate;
    private RestClient defaultRestClient;
    private Supplier<RestClient> restClientSupplier;

    public MercadoPagoCheckoutService(
            PlatformProperties properties,
            UserRepository userRepository,
            CreatorRepository creatorRepository,
            WorkRepository workRepository,
            ChapterRepository chapterRepository,
            JdbcTemplate jdbcTemplate
    ) {
        this(properties, userRepository, creatorRepository, workRepository, chapterRepository, jdbcTemplate, null);
    }

    public MercadoPagoCheckoutService(
            PlatformProperties properties,
            UserRepository userRepository,
            CreatorRepository creatorRepository,
            WorkRepository workRepository,
            ChapterRepository chapterRepository,
            JdbcTemplate jdbcTemplate,
            Supplier<RestClient> restClientSupplier
    ) {
        this.properties = properties;
        this.userRepository = userRepository;
        this.creatorRepository = creatorRepository;
        this.workRepository = workRepository;
        this.chapterRepository = chapterRepository;
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

    public BigDecimal getVipPrice() {
        return properties.getVipPrice();
    }

    @Transactional
    public CheckoutResponseDto createDonationCheckoutPreference(
            UUID payerUserId, UUID creatorId, UUID workId, UUID chapterId,
            BigDecimal amountBRL, String message, String idempotencyKey
    ) {
        if (amountBRL == null || amountBRL.compareTo(MIN_SUPPORT_AMOUNT_BRL) < 0
                || amountBRL.compareTo(MAX_SUPPORT_AMOUNT_BRL) > 0) {
            throw new IllegalArgumentException("O valor do apoio deve estar entre R$ 2,00 e R$ 10.000,00.");
        }
        return createSupportCheckout(payerUserId, creatorId, workId, chapterId, "DONATION",
                amountBRL.setScale(2, RoundingMode.HALF_EVEN), message, idempotencyKey);
    }

    @Transactional
    public CheckoutResponseDto createMembershipCheckoutPreference(UUID payerUserId, UUID creatorId, String idempotencyKey) {
        CreatorEntity creator = creatorRepository.findById(creatorId)
                .orElseThrow(() -> new IllegalArgumentException("Criador não encontrado."));
        return createSupportCheckout(payerUserId, creatorId, null, null, "MEMBERSHIP",
                creator.getMembershipPriceBrl() != null ? creator.getMembershipPriceBrl().setScale(2, RoundingMode.HALF_EVEN) : null,
                null, idempotencyKey);
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

        SupportCheckoutIntent checkout = jdbcTemplate.query("""
                SELECT checkout_reference, creator_id, work_id, chapter_id, product_type,
                       expected_amount_brl, message, preference_id, checkout_url
                FROM support_checkout_intents
                WHERE payer_user_id = ? AND product_type = ? AND idempotency_key = ?
                FOR UPDATE
                """, resultSet -> resultSet.next() ? new SupportCheckoutIntent(
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

        if (checkout == null) {
            throw new IllegalStateException("Não foi possível persistir o checkout.");
        }
        if (!creatorId.equals(checkout.creatorId()) || !Objects.equals(workId, checkout.workId())
                || !Objects.equals(chapterId, checkout.chapterId()) || amount.compareTo(checkout.amount()) != 0
                || !Objects.equals(message, checkout.message())) {
            throw new IllegalArgumentException("A chave de idempotência já foi usada com dados diferentes.");
        }
        if (checkout.checkoutUrl() != null && checkout.preferenceId() != null) {
            return new CheckoutResponseDto(checkout.checkoutUrl(), checkout.amount());
        }

        String externalReference = SUPPORT_REFERENCE_PREFIX + checkout.reference();
        String title = "MEMBERSHIP".equals(productType) ? "Clube de Membros — " + creator.getHandle()
                : "Apoio ao criador — " + creator.getHandle();
        String backUrlBase = properties.getMercadopago().getBackUrlBase().replaceAll("/+$", "");
        if (backUrlBase.isBlank()) {
            throw new IllegalStateException("MERCADOPAGO_BACK_URL_BASE não configurado.");
        }
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
        if (notificationUrl != null && !notificationUrl.isBlank()) {
            body.put("notification_url", notificationUrl);
        }

        Map<?, ?> response = restClient().post().uri("/checkout/preferences")
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

    public String createVipCheckoutPreference(UUID userId) {
        if (userId == null) {
            throw new IllegalArgumentException("Usuário não autenticado.");
        }
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
                "payer", Map.of("email", user.getEmail()),
                "external_reference", externalReference,
                "back_urls", Map.of(
                        "success", backUrlBase + "/vip?status=approved",
                        "pending", backUrlBase + "/vip?status=pending",
                        "failure", backUrlBase + "/vip?status=failure"),
                "auto_return", "approved",
                "statement_descriptor", "MANGANETWORKING",
                "binary_mode", true,
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
            response = restClient().post()
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
            log.error("[MERCADO-PAGO] Preferência {} criada, mas o vínculo local falhou ({}).",
                    preferenceId, exception.getClass().getSimpleName());
            throw new IllegalStateException("Não foi possível registrar o checkout com segurança. Tente novamente.");
        }
        return checkoutUrl;
    }

    public String newCheckoutReference() {
        return UUID.randomUUID().toString().replace("-", "")
                .substring(0, CHECKOUT_REFERENCE_LENGTH);
    }

    public boolean isMercadoPagoCheckoutUrl(String value) {
        try {
            URI uri = URI.create(value);
            String host = uri.getHost();
            return "https".equalsIgnoreCase(uri.getScheme()) && host != null
                    && (host.equalsIgnoreCase("mercadopago.com") || host.endsWith(".mercadopago.com")
                    || host.equalsIgnoreCase("mercadopago.com.br") || host.endsWith(".mercadopago.com.br"));
        } catch (IllegalArgumentException exception) {
            return false;
        }
    }

    private String requireAccessToken() {
        String token = properties.getMercadopago().getAccessToken();
        if (token == null || token.isBlank()) {
            throw new IllegalStateException("MERCADOPAGO_ACCESS_TOKEN não configurado.");
        }
        return token;
    }

    public record SupportCheckoutIntent(
            String reference, UUID creatorId, UUID workId, UUID chapterId, String productType,
            BigDecimal amount, String message, String preferenceId, String checkoutUrl
    ) {}
}

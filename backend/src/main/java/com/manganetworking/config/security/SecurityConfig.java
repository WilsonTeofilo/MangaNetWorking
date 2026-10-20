package com.manganetworking.config.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpMethod;
import org.springframework.security.authorization.AuthorizationDecision;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.core.Authentication;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter;
import org.springframework.security.web.header.writers.XXssProtectionHeaderWriter;

import jakarta.servlet.http.HttpServletResponse;

import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private final SessionAuthenticationFilter sessionAuthenticationFilter;
    private final RateLimitingFilter rateLimitingFilter;

    /**
     * Perfis em que os endpoints de desenvolvimento (outbox de teste) podem ser expostos.
     * Fora deles a rota cai em {@code authenticated}, mesmo que o controller esteja no classpath.
     */
    private static final String[] DEV_PROFILES = {"dev", "test", "local"};

    private final boolean devEndpointsEnabled;

    /**
     * Origens autorizadas para CORS (lista separada por vírgula). Antes fixas no código; agora
     * parametrizáveis por {@code platform.cors.allowed-origins} / variável de ambiente.
     */
    @Value("${platform.cors.allowed-origins:http://localhost:5180,http://localhost:5173,http://localhost:3000,http://127.0.0.1:5180,http://127.0.0.1:5173,http://127.0.0.1:3000}")
    private List<String> allowedOrigins;

    /**
     * Token dedicado de coleta de métricas ({@code platform.metrics.scrape-token}).
     * <p>
     * O Prometheus não consegue usar a sessão por cookie HttpOnly; com o token configurado,
     * {@code Authorization: Bearer <token>} libera apenas {@code /actuator/prometheus} e
     * {@code /actuator/metrics/**}. Sem token, essas rotas continuam exigindo papel de
     * moderação, como antes.
     * </p>
     */
    @Value("${platform.metrics.scrape-token:}")
    private String metricsScrapeToken;

    public SecurityConfig(
            SessionAuthenticationFilter sessionAuthenticationFilter,
            RateLimitingFilter rateLimitingFilter,
            Environment environment
    ) {
        this.sessionAuthenticationFilter = sessionAuthenticationFilter;
        this.rateLimitingFilter = rateLimitingFilter;
        this.devEndpointsEnabled = environment.matchesProfiles(DEV_PROFILES);
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new UnicodeAwarePasswordEncoder(12);
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .formLogin(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                // Sem credencial → 401 (autenticação necessária); com credencial sem papel → 403.
                // Sem isto o Spring Security devolve 403 para requisições anônimas, escondendo a
                // diferença entre "não autenticado" e "sem permissão" do cliente da API.
                .exceptionHandling(exceptionHandling -> exceptionHandling
                        .authenticationEntryPoint((request, response, authException) ->
                                response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Autenticação necessária")))
                .headers(headers -> headers
                        .frameOptions(frame -> frame.deny())
                        .contentTypeOptions(content -> {})
                        // X-XSS-Protection: 0 — o filtro legado do navegador é vulnerável e foi
                        // removido dos browsers modernos; a defesa é CSP + escaping no React.
                        .xssProtection(xss -> xss.headerValue(XXssProtectionHeaderWriter.HeaderValue.DISABLED))
                        // HSTS: o Spring só envia em requisições HTTPS, então é seguro manter ligado.
                        .httpStrictTransportSecurity(hsts -> hsts
                                .includeSubDomains(true)
                                .maxAgeInSeconds(31_536_000L))
                        .referrerPolicy(referrer -> referrer.policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN))
                )
                .authorizeHttpRequests(auth -> auth
                        // Observabilidade e Healthcheck de Containers / Prometheus
                        .requestMatchers("/actuator/health/**", "/actuator/info").permitAll()
                        // Métricas expõem topologia, pool de conexões e latência: NÃO ficam públicas.
                        // Health segue público para os probes; métricas exigem papel de moderação
                        // ou o token dedicado de coleta (Bearer) configurado para o Prometheus.
                .requestMatchers("/actuator/prometheus", "/actuator/metrics/**")
                .access((authentication, context) -> new AuthorizationDecision(
                        hasValidScrapeToken(context.getRequest())
                                || hasModeratorRole(authentication)
                ))
                        // Endpoints Públicos de Autenticação
                        .requestMatchers("/api/auth/**").permitAll()
                        // Documentos legais públicos (Política de Privacidade publicada)
                        .requestMatchers(HttpMethod.GET, "/api/legal/**").permitAll()
                        // Webhook assinado do Mercado Pago para confirmação de pagamentos
                        .requestMatchers(HttpMethod.POST, "/api/monetization/mercadopago/webhook").permitAll()
                        // Webhook de bounce/complaint do provedor de e-mail: a autenticação é o
                        // segredo compartilhado conferido no controller (rota fechada sem ele).
                        .requestMatchers(HttpMethod.POST, "/api/webhooks/email/**").permitAll()
                        // Dev outbox: apenas em perfis locais (defesa em profundidade além do @Profile do controller).
                        .requestMatchers("/api/dev/**")
                        .access((authentication, context) -> new AuthorizationDecision(devEndpointsEnabled))
                        // Conteúdo público e uploads separados por método/papel
                        .requestMatchers(HttpMethod.GET, "/api/storage/**", "/api/uploads/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/storage/upload", "/api/storage/upload/batch",
                                "/api/uploads/upload", "/api/uploads/upload/batch").hasRole("CREATOR")
                        .requestMatchers(HttpMethod.GET, "/api/feed/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/feed/sync").hasRole("MODERATOR")
                        .requestMatchers(HttpMethod.GET, "/api/works/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/works/**").hasRole("CREATOR")
                        // Workspace do criador é dado privado (saldo, doações, chave PIX): exige sessão de criador.
                        // Deve vir ANTES do permitAll de /api/creators/** (primeiro match vence).
                        .requestMatchers(HttpMethod.GET, "/api/creators/workspace").hasRole("CREATOR")
                        .requestMatchers(HttpMethod.GET, "/api/creators/analytics", "/api/creators/season").hasRole("CREATOR")
                        .requestMatchers(HttpMethod.PUT, "/api/creators/**").hasRole("CREATOR")
                        .requestMatchers(HttpMethod.POST, "/api/creators/**").hasRole("CREATOR")
                        .requestMatchers(HttpMethod.GET, "/api/creators/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/profile/public/**").permitAll()
                        // O serviço ainda aplica a privacidade do perfil; identidade ausente significa visitante.
                        .requestMatchers(HttpMethod.GET, "/api/users/*/profile").permitAll()
                        // Envio de denúncia é público; fila e ações são exclusivas de moderadores
                        .requestMatchers(HttpMethod.POST, "/api/reports").permitAll()
                        .requestMatchers("/api/reports/**").hasRole("MODERATOR")
                        // Área administrativa do proprietário: papel exclusivo, nunca inferido do cliente.
                        .requestMatchers("/api/owner/**").hasRole("OWNER")
                        .requestMatchers("/error").permitAll()
                        // Qualquer outra rota exige sessão autenticada
                        .anyRequest().authenticated()
                )
                .addFilterBefore(rateLimitingFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(sessionAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    /**
     * Impede o registro duplicado dos filtros: {@code @Component} em um {@code Filter} faz o
     * Spring Boot registrá-lo também na cadeia do servlet container, fora da ordem do Spring
     * Security (o filtro rodaria antes/depois sem os matchers de autorização). O
     * {@link SecurityFilterChain} é a única porta de entrada.
     */
    /**
     * Verifica o token de coleta de métricas no header {@code Authorization: Bearer}.
     * A comparação é em tempo constante para não vazar o token por tempo de resposta.
     */
    private boolean hasValidScrapeToken(jakarta.servlet.http.HttpServletRequest request) {
        if (metricsScrapeToken == null || metricsScrapeToken.isBlank()) {
            return false;
        }
        String header = request.getHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")) {
            return false;
        }
        byte[] presented = header.substring("Bearer ".length()).trim().getBytes(java.nio.charset.StandardCharsets.UTF_8);
        byte[] expected = metricsScrapeToken.trim().getBytes(java.nio.charset.StandardCharsets.UTF_8);
        return java.security.MessageDigest.isEqual(presented, expected);
    }

    private boolean hasModeratorRole(java.util.function.Supplier<Authentication> authenticationSupplier) {
        Authentication authentication = authenticationSupplier == null ? null : authenticationSupplier.get();
        return authentication != null && authentication.getAuthorities().stream()
                .anyMatch(authority -> "ROLE_MODERATOR".equals(authority.getAuthority()));
    }

    @Bean
    public FilterRegistrationBean<RateLimitingFilter> rateLimitingFilterRegistration(RateLimitingFilter filter) {
        FilterRegistrationBean<RateLimitingFilter> registration = new FilterRegistrationBean<>(filter);
        registration.setEnabled(false);
        return registration;
    }

    @Bean
    public FilterRegistrationBean<SessionAuthenticationFilter> sessionAuthenticationFilterRegistration(
            SessionAuthenticationFilter filter) {
        FilterRegistrationBean<SessionAuthenticationFilter> registration = new FilterRegistrationBean<>(filter);
        registration.setEnabled(false);
        return registration;
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        // Normaliza a lista (remove espaços/entradas vazias de um env var separado por vírgula).
        List<String> origins = allowedOrigins.stream()
                .map(String::trim)
                .filter(origin -> !origin.isEmpty())
                .toList();

        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(origins);
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        // Curinga de origem é incompatível com credenciais: desliga credentials em vez de estourar em runtime.
        configuration.setAllowCredentials(!origins.contains("*"));
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}

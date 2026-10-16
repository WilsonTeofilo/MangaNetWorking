package com.manganetworking.config.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
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
     * Origens autorizadas para CORS (lista separada por vírgula). Antes fixas no código; agora
     * parametrizáveis por {@code platform.cors.allowed-origins} / variável de ambiente.
     */
    @Value("${platform.cors.allowed-origins:http://localhost:5180,http://localhost:5173,http://localhost:3000,http://127.0.0.1:5180,http://127.0.0.1:5173,http://127.0.0.1:3000}")
    private List<String> allowedOrigins;

    public SecurityConfig(
            SessionAuthenticationFilter sessionAuthenticationFilter,
            RateLimitingFilter rateLimitingFilter
    ) {
        this.sessionAuthenticationFilter = sessionAuthenticationFilter;
        this.rateLimitingFilter = rateLimitingFilter;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
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
                        .xssProtection(xss -> xss.headerValue(XXssProtectionHeaderWriter.HeaderValue.ENABLED_MODE_BLOCK))
                        .referrerPolicy(referrer -> referrer.policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN))
                )
                .authorizeHttpRequests(auth -> auth
                        // Endpoints Públicos de Autenticação e Dev Outbox
                        .requestMatchers("/api/auth/**").permitAll()
                        .requestMatchers("/api/dev/**").permitAll()
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
                        .requestMatchers(HttpMethod.PUT, "/api/creators/**").hasRole("CREATOR")
                        .requestMatchers(HttpMethod.POST, "/api/creators/**").hasRole("CREATOR")
                        .requestMatchers(HttpMethod.GET, "/api/creators/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/profile/public/**").permitAll()
                        // Envio de denúncia é público; fila e ações são exclusivas de moderadores
                        .requestMatchers(HttpMethod.POST, "/api/reports").permitAll()
                        .requestMatchers("/api/reports/**").hasRole("MODERATOR")
                        .requestMatchers("/error").permitAll()
                        // Qualquer outra rota exige sessão autenticada
                        .anyRequest().authenticated()
                )
                .addFilterBefore(rateLimitingFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(sessionAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
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

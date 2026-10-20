package com.manganetworking.config.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

/**
 * Exige, no perfil {@code prod}, um token dedicado de coleta de métricas.
 * <p>
 * O Prometheus precisa raspar {@code /actuator/prometheus}, que fica atrás de papel de
 * moderação (a sessão é um cookie HttpOnly e não serve para scraping). Sem um token
 * dedicado, ou o Prometheus não coleta nada, ou a rota é liberada para todos. Este guard
 * recusa o boot em produção sem token, mantendo o padrão "deny by default".
 * </p>
 */
@Component
@Profile("prod")
public class ProductionMetricsScrapeTokenGuard {

    private static final int MIN_TOKEN_LENGTH = 32;

    public ProductionMetricsScrapeTokenGuard(
            @Value("${platform.metrics.scrape-token:}") String scrapeToken
    ) {
        if (scrapeToken == null || scrapeToken.isBlank() || scrapeToken.length() < MIN_TOKEN_LENGTH) {
            throw new IllegalStateException(
                    "O perfil prod exige METRICS_SCRAPE_TOKEN com ao menos " + MIN_TOKEN_LENGTH
                            + " caracteres para permitir a coleta de métricas pelo Prometheus. "
                            + "Sem ele, /actuator/prometheus permanece restrito ao papel de moderação."
            );
        }
    }
}

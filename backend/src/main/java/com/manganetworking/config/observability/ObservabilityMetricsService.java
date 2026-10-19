package com.manganetworking.config.observability;

import com.manganetworking.config.security.RateLimitStore;
import com.manganetworking.service.session.SessionStore;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.stereotype.Service;

/**
 * Serviço de observabilidade e métricas de telemetria da plataforma MangaNetWorking.
 * <p>
 * Registra medidores via Micrometer para exportação automática ao Prometheus/Grafana:
 * <ul>
 *   <li>Contador de páginas de capítulos consumidas: {@code manganetworking.pages.read.total}</li>
 *   <li>Contador de impressões de anúncios publicitários: {@code manganetworking.ads.impression.total}</li>
 *   <li>Gauge de sessões ativas no store: {@code manganetworking.sessions.active}</li>
 *   <li>Gauge de buckets de rate limiting sob monitoramento: {@code manganetworking.ratelimit.buckets.active}</li>
 * </ul>
 * </p>
 */
@Service
public class ObservabilityMetricsService {

    private final Counter pagesReadCounter;
    private final Counter adsImpressionCounter;

    public ObservabilityMetricsService(
            MeterRegistry meterRegistry,
            SessionStore sessionStore,
            RateLimitStore rateLimitStore
    ) {
        this.pagesReadCounter = Counter.builder("manganetworking.pages.read.total")
                .description("Total de páginas de obras e capítulos lidas pelos usuários")
                .register(meterRegistry);

        this.adsImpressionCounter = Counter.builder("manganetworking.ads.impression.total")
                .description("Total de impressões publicitárias contabilizadas (ciclos de 30 páginas)")
                .register(meterRegistry);

        Gauge.builder("manganetworking.sessions.active", sessionStore, SessionStore::countActive)
                .description("Número de sessões ativas armazenadas atualmente")
                .register(meterRegistry);

        Gauge.builder("manganetworking.ratelimit.buckets.active", rateLimitStore, RateLimitStore::countActiveBuckets)
                .description("Número de buckets ativos de rate limiting")
                .register(meterRegistry);
    }

    /**
     * Incrementa o contador de páginas lidas.
     */
    public void recordPageRead() {
        pagesReadCounter.increment();
    }

    /**
     * Incrementa o contador de impressões publicitárias geradas.
     */
    public void recordAdImpression() {
        adsImpressionCounter.increment();
    }
}

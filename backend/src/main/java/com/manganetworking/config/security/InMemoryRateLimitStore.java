package com.manganetworking.config.security;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Implementação em memória do {@link RateLimitStore}.
 * <p>
 * Adotando o padrão Strategy/Repository (GoF), permite intercambialidade futura
 * para stores distribuídos (Redis, Banco Relacional) sem modificar o filtro de rate limiting.
 * </p>
 * <p>
 * Referências técnicas:
 * <ul>
 *   <li>Strategy Pattern / Repository Pattern (GoF)</li>
 *   <li>Java Concurrency in Practice (Brian Goetz): uso thread-safe de
 *       {@link ConcurrentHashMap} e {@code compute()} atômico O(1)</li>
 *   <li>OWASP DoS Prevention Cheat Sheet: expuração ativa periódica para prevenir
 *       memory leaks e esgotamento de recursos (Unbounded Memory Allocation)</li>
 * </ul>
 * </p>
 */
@Component
public class InMemoryRateLimitStore implements RateLimitStore {

    private final ConcurrentHashMap<String, MinuteCounter> counters = new ConcurrentHashMap<>();

    /** Guarda de varredura anti-redundância: evita múltiplas expurgas dentro do mesmo minuto. */
    private final AtomicLong lastSweepMinute = new AtomicLong(0);

    @Override
    public int incrementAndGet(String key, long minuteBucket) {
        MinuteCounter current = counters.compute(key, (k, existing) -> {
            if (existing == null || existing.minuteBucket != minuteBucket) {
                return new MinuteCounter(minuteBucket, new AtomicInteger(1));
            }
            existing.count.incrementAndGet();
            return existing;
        });
        return current.count.get();
    }

    @Override
    public void evictStale(long currentMinute) {
        // Guarda idempotente: apenas uma varredura efetiva por minuto, mesmo sob
        // chamadas concorrentes do filtro e do @Scheduled.
        long previous = lastSweepMinute.get();
        if (previous == currentMinute || !lastSweepMinute.compareAndSet(previous, currentMinute)) {
            return;
        }
        counters.entrySet().removeIf(entry -> entry.getValue().minuteBucket < currentMinute);
    }

    @Override
    public int countActiveBuckets() {
        return counters.size();
    }

    /**
     * Rotina de limpeza ativa agendada.
     * <p>
     * Em cenários de ataque de spoofing com ampla gama de IPs (onde o filtro pode não ser
     * invocado o suficiente para expurgo inline), este agendado garante expuração periódica
     * de buckets obsoletos, prevenindo vazamento de memória.
     * </p>
     * <p>
     * Referência OWASP: expiração forçada periódica para prevenir memory leaks e
     * esgotamento de recursos (Unbounded Memory Allocation).
     * </p>
     */
    @Scheduled(fixedDelayString = "${platform.security.rate-limit-cleanup-interval-ms:300000}")
    public void scheduledEviction() {
        long currentMinute = System.currentTimeMillis() / 60_000;
        evictStale(currentMinute);
    }

    /**
     * Contador associado a um bucket de minuto.
     */
    private static final class MinuteCounter {
        final long minuteBucket;
        final AtomicInteger count;

        MinuteCounter(long minuteBucket, AtomicInteger count) {
            this.minuteBucket = minuteBucket;
            this.count = count;
        }
    }
}

package com.manganetworking.config.security;

/**
 * Porta de armazenamento de contadores de rate limiting orientada a domínio (Clean Architecture).
 * <p>
 * Segue os princípios SOLID e Ports &amp; Adapters: o {@link RateLimitingFilter} (módulo de alto nível)
 * depende desta abstração, não de detalhes de implementação em memória ou distribuída.
 * </p>
 * <p>
 * Referências técnicas:
 * <ul>
 *   <li>Ports and Adapters / Clean Architecture (Alistair Cockburn / Robert C. Martin)</li>
 *   <li>Dependency Inversion Principle (SOLID)</li>
 *   <li>Java Concurrency in Practice (Brian Goetz): atomicidade O(1) sem race conditions</li>
 *   <li>OWASP DoS Prevention Cheat Sheet: expuração ativa de buckets para prevenir
 *       memory leaks sob ataques de spoofing com ampla gama de IPs</li>
 * </ul>
 * </p>
 */
public interface RateLimitStore {

    /**
     * Incrementa atomicamente o contador para a chave especificada no minuto indicado e retorna
     * o valor após o incremento.
     * <p>
     * Se a chave ainda não existe ou está associada a um bucket de minuto diferente, o contador
     * é reiniciado em 1 para o novo {@code minuteBucket}.
     * </p>
     *
     * @param key chave composta (ex.: {@code ip:bucket})
     * @param minuteBucket identificador do minuto corrente ({@code System.currentTimeMillis() / 60_000})
     * @return valor do contador após o incremento (mínimo 1)
     */
    int incrementAndGet(String key, long minuteBucket);

    /**
     * Remove contadores de minutos anteriores ao {@code currentMinute} para evitar vazamento de memória.
     * <p>
     * Implementações devem garantir remoção atômica para evitar race conditions com operações
     * concorrentes de incremento (Java Concurrency in Practice). Uma guarda via
     * {@code compareAndSet} em {@code minuteBucket} evita varreduras redundantes dentro do mesmo minuto.
     * </p>
     *
     * @param currentMinute minuto corrente usado como referência para expurgo
     */
    void evictStale(long currentMinute);

    /**
     * Retorna a quantidade de buckets ativos no store.
     * <p>
     * Útil para métricas e diagnóstico de picos de tráfego.
     * </p>
     *
     * @return número de chaves com contador ativo
     */
    int countActiveBuckets();
}

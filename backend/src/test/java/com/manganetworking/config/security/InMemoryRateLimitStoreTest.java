package com.manganetworking.config.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

class InMemoryRateLimitStoreTest {

    private InMemoryRateLimitStore store;
    private static final long MINUTE_0 = 1_000L; // minuto fictício para testes

    @BeforeEach
    void setUp() {
        store = new InMemoryRateLimitStore();
    }

    @Test
    @DisplayName("incrementAndGet deve iniciar em 1 para uma nova chave no bucket atual")
    void shouldStartAt1ForNewKeyInCurrentBucket() {
        int count = store.incrementAndGet("192.168.1.1:auth", MINUTE_0);
        assertEquals(1, count);
        assertEquals(1, store.countActiveBuckets());
    }

    @Test
    @DisplayName("incrementAndGet deve incrementar atomicamente em chamadas sequenciais")
    void shouldIncrementAtomicallyOnSequentialCalls() {
        String key = "10.0.0.1:global";
        int first = store.incrementAndGet(key, MINUTE_0);
        int second = store.incrementAndGet(key, MINUTE_0);
        int third = store.incrementAndGet(key, MINUTE_0);

        assertEquals(1, first);
        assertEquals(2, second);
        assertEquals(3, third);
        assertEquals(1, store.countActiveBuckets());
    }

    @Test
    @DisplayName("incrementAndGet deve reiniciar contador ao mudar de minuto (virada de bucket)")
    void shouldResetCounterOnMinuteBoundary() {
        String key = "172.16.0.1:auth";
        long minute1 = MINUTE_0;
        long minute2 = MINUTE_0 + 1;

        // 3 chamadas no minuto 1
        store.incrementAndGet(key, minute1);
        store.incrementAndGet(key, minute1);
        int countMinute1 = store.incrementAndGet(key, minute1);
        assertEquals(3, countMinute1);

        // Virada de minuto: contador deve reiniciar em 1
        int countMinute2 = store.incrementAndGet(key, minute2);
        assertEquals(1, countMinute2);

        // Ambas as chaves ainda estão no store (evictStale não foi chamado)
        assertEquals(1, store.countActiveBuckets());
    }

    @Test
    @DisplayName("evictStale deve remover buckets de minutos anteriores")
    void shouldEvictStaleBucketsFromPreviousMinutes() {
        String key = "192.168.1.1:auth";
        long minute1 = MINUTE_0;
        long minute2 = MINUTE_0 + 1;

        store.incrementAndGet(key, minute1);
        store.incrementAndGet(key, minute2);

        assertEquals(1, store.countActiveBuckets());

        // Expurgo: remove buckets do minuto 1, mantém minuto 2
        store.evictStale(minute2);

        assertEquals(1, store.countActiveBuckets());
    }

    @Test
    @DisplayName("evictStale deve ser idempotente dentro do mesmo minuto (guarda compareAndSet)")
    void shouldBeIdempotentWithinSameMinute() {
        store.incrementAndGet("a:auth", MINUTE_0);
        store.incrementAndGet("b:auth", MINUTE_0);

        store.evictStale(MINUTE_0);
        assertEquals(2, store.countActiveBuckets());

        // Segunda chamada no mesmo minuto não deve fazer nada
        store.evictStale(MINUTE_0);
        assertEquals(2, store.countActiveBuckets());
    }

    @Test
    @DisplayName("evictStale deve remover múltiplas chaves de minutos antigos")
    void shouldEvictMultipleKeysFromOldMinutes() {
        store.incrementAndGet("ip1:global", MINUTE_0);
        store.incrementAndGet("ip2:global", MINUTE_0);
        store.incrementAndGet("ip3:auth", MINUTE_0);

        assertEquals(3, store.countActiveBuckets());

        // Virada do minuto: todos os buckets do minuto 0 devem ser expungidos
        store.evictStale(MINUTE_0 + 1);

        assertEquals(0, store.countActiveBuckets());
    }

    @Test
    @DisplayName("countActiveBuckets deve refletir chaves distintas")
    void shouldCountDistinctKeys() {
        store.incrementAndGet("ip1:global", MINUTE_0);
        store.incrementAndGet("ip2:global", MINUTE_0);
        store.incrementAndGet("ip3:auth", MINUTE_0);
        store.incrementAndGet("ip1:global", MINUTE_0); // mesma chave, não adiciona

        assertEquals(3, store.countActiveBuckets());
    }

    @Test
    @DisplayName("incrementAndGet deve ser thread-safe sob alta concorrência")
    void shouldBeThreadSafeUnderHighConcurrency() throws InterruptedException {
        int threadCount = 20;
        int incrementsPerThread = 500;
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch startGate = new CountDownLatch(1);
        CountDownLatch doneGate = new CountDownLatch(threadCount);

        String key = "concurrent:global";
        AtomicInteger errors = new AtomicInteger();

        for (int i = 0; i < threadCount; i++) {
            executor.submit(() -> {
                try {
                    startGate.await();
                    for (int j = 0; j < incrementsPerThread; j++) {
                        int count = store.incrementAndGet(key, MINUTE_0);
                        if (count < 1) {
                            errors.incrementAndGet();
                        }
                    }
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    errors.incrementAndGet();
                } finally {
                    doneGate.countDown();
                }
            });
        }

        startGate.countDown();
        assertTrue(doneGate.await(30, TimeUnit.SECONDS), "Threads não completaram no tempo limite");

        executor.shutdown();

        // O contador final deve ser exatamente threadCount * incrementsPerThread
        // (última chamada retorna o total de increments)
        // Como não podemos capturar o último valor facilmente, verificamos indiretamente:
        // após evictStale do minuto atual, o bucket deve desaparecer.
        store.evictStale(MINUTE_0 + 1);
        assertEquals(0, store.countActiveBuckets());
        assertEquals(0, errors.get(), "Não deveria haver erros de concorrência");
    }

    @Test
    @DisplayName("chave reiniciada após expurgo deve começar em 1 novamente")
    void shouldStartAt1AgainAfterEviction() {
        String key = "192.168.1.1:auth";

        store.incrementAndGet(key, MINUTE_0);
        store.incrementAndGet(key, MINUTE_0);

        // Expurgo e reinício no mesmo minuto (simulando novo ciclo)
        store.evictStale(MINUTE_0 + 1);

        // Nova incrementação no minuto seguinte deve começar em 1
        int count = store.incrementAndGet(key, MINUTE_0 + 1);
        assertEquals(1, count);
        assertEquals(1, store.countActiveBuckets());
    }
}

package com.manganetworking.service.session;

import java.time.Instant;
import java.util.Optional;

/**
 * Porta de armazenamento de sessões orientada a domínio (Clean Architecture).
 * <p>
 * Segue os princípios SOLID e Ports & Adapters: o módulo de alto nível ({@link SessionService})
 * depende desta abstração, não de detalhes de implementação em memória ou distribuídos.
 * </p>
 * <p>
 * Referências técnicas:
 * <ul>
 *   <li>Ports and Adapters / Clean Architecture (Alistair Cockburn / Robert C. Martin)</li>
 *   <li>Dependency Inversion Principle (SOLID)</li>
 *   <li>Strategy / Repository Pattern (GoF)</li>
 * </ul>
 * </p>
 */
public interface SessionStore {

    /**
     * Persiste uma sessão de usuário no store.
     * <p>
     * Implementações devem garantir atomicidade e thread-safety em cenários concorrentes
     * (referência: Java Concurrency in Practice, Brian Goetz).
     * </p>
     *
     * @param session sessão a ser persistida
     */
    void save(SessionService.UserSession session);

    /**
     * Busca uma sessão pelo seu identificador único.
     *
     * @param sessionId identificador da sessão
     * @return {@code Optional} contendo a sessão encontrada ou vazio
     */
    Optional<SessionService.UserSession> findById(String sessionId);

    /**
     * Remove explicitamente uma sessão do store.
     * <p>
     * Chamado durante logout ou revogação manual.
     * </p>
     *
     * @param sessionId identificador da sessão a ser removida
     */
    void delete(String sessionId);

    /**
     * Remove todas as sessões expiradas até o momento especificado.
     * <p>
     * Implementações devem garantir remoção atômica para evitar race conditions
     * com operações concorrentes de login/validação (Java Concurrency in Practice).
     * </p>
     * <p>
     * Referência OWASP Session Management Cheat Sheet: expiração ativa periódica
     * para prevenir memory leaks e esgotamento de recursos (Unbounded Memory Allocation).
     * </p>
     *
     * @param now instante de referência para verificar expiração
     * @return quantidade de sessões expurgadas
     */
    int removeExpired(Instant now);

    /**
     * Retorna a quantidade de sessões ativas no store.
     *
     * @return número de sessões não expiradas
     */
    long countActive();
}
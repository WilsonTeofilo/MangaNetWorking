package com.manganetworking.service.feed.event;

import java.util.UUID;

/**
 * Publicado dentro da transação relacional pedindo a (re)materialização de uma obra no feed (MongoDB).
 *
 * <p>O MongoDB não participa da transação JPA: escrever no feed dentro dela e falhar faria o transceptor
 * JPA marcar a transação como rollback-only. Por isso o pedido é tratado depois do commit.</p>
 *
 * @param workId  obra a sincronizar
 * @param context origem do pedido (uso em log)
 */
public record WorkFeedSyncEvent(UUID workId, String context) {}

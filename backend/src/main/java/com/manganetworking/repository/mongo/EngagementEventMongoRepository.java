package com.manganetworking.repository.mongo;

import com.manganetworking.domain.nosql.EngagementEventDocument;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Collection;
import java.util.List;

@Repository
public interface EngagementEventMongoRepository extends MongoRepository<EngagementEventDocument, String> {

    void deleteAllByUserId(String userId);

    /** Deduplicação de descoberta/visualização: chave de idempotência única. */
    boolean existsByIdempotencyKey(String idempotencyKey);

    /** Deduplicação de visualização: 1 por leitor por capítulo. */
    boolean existsByUserIdAndChapterIdAndEventType(String userId, String chapterId, String eventType);

    /**
     * Chaves de idempotência já gravadas. O serviço consulta em lote antes de inserir e
     * ainda trata {@code DuplicateKeyException} para cobrir duas requisições simultâneas.
     */
    List<EngagementEventDocument> findAllByIdempotencyKeyIn(Collection<String> idempotencyKeys);

    /**
     * Eventos de leitura de um conjunto de obras a partir de um instante.
     * O limite superior é filtrado no serviço porque a janela de temporada é fechada.
     */
    List<EngagementEventDocument> findByWorkIdInAndEventTypeAndTimestampBetween(
            Collection<String> workIds,
            String eventType,
            Instant fromInclusive,
            Instant toExclusive
    );
}

package com.manganetworking.repository.mongo;

import com.manganetworking.domain.nosql.EngagementEventDocument;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Collection;
import java.util.List;

@Repository
public interface EngagementEventMongoRepository extends MongoRepository<EngagementEventDocument, String> {

    /**
     * Eventos de leitura de um conjunto de obras a partir de um instante.
     * O limite superior é filtrado no serviço porque a janela de temporada é fechada.
     */
    List<EngagementEventDocument> findByWorkIdInAndEventTypeAndTimestampAfter(
            Collection<String> workIds,
            String eventType,
            Instant after
    );
}

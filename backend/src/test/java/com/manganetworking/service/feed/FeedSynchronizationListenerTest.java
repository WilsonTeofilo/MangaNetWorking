package com.manganetworking.service.feed;

import com.manganetworking.repository.mongo.WorkFeedMongoRepository;
import com.manganetworking.service.feed.event.WorkFeedRemovalEvent;
import com.manganetworking.service.feed.event.WorkFeedSyncEvent;
import com.manganetworking.service.recommendation.RecommendationAlgorithmService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class FeedSynchronizationListenerTest {

    private final RecommendationAlgorithmService algorithmService = mock(RecommendationAlgorithmService.class);
    private final WorkFeedMongoRepository workFeedMongoRepository = mock(WorkFeedMongoRepository.class);
    private final FeedSynchronizationListener listener =
            new FeedSynchronizationListener(algorithmService, workFeedMongoRepository);

    @Test
    @DisplayName("Evento de sincronização materializa a obra no feed pelo id (transação própria)")
    void syncDelegatesToAlgorithmById() {
        UUID workId = UUID.randomUUID();

        listener.onWorkFeedSync(new WorkFeedSyncEvent(workId, "cadastro"));

        verify(algorithmService).syncWorkById(workId);
    }

    @Test
    @DisplayName("Falha na sincronização do feed é tolerada (não propaga exceção)")
    void syncToleratesFailure() {
        UUID workId = UUID.randomUUID();
        when(algorithmService.syncWorkById(workId)).thenThrow(new RuntimeException("MongoDB indisponível"));

        assertDoesNotThrow(() -> listener.onWorkFeedSync(new WorkFeedSyncEvent(workId, "cadastro")));
    }

    @Test
    @DisplayName("Evento de remoção exclui a obra do feed")
    void removalDeletesFromFeed() {
        UUID workId = UUID.randomUUID();

        listener.onWorkFeedRemoval(new WorkFeedRemovalEvent(workId));

        verify(workFeedMongoRepository).deleteByWorkId(workId.toString());
    }

    @Test
    @DisplayName("Falha na remoção do feed é tolerada (não propaga exceção)")
    void removalToleratesFailure() {
        UUID workId = UUID.randomUUID();
        doThrow(new RuntimeException("MongoDB indisponível"))
                .when(workFeedMongoRepository).deleteByWorkId(workId.toString());

        assertDoesNotThrow(() -> listener.onWorkFeedRemoval(new WorkFeedRemovalEvent(workId)));
    }

    @Test
    @DisplayName("Tratamento dos eventos roda em AFTER_COMMIT (fora da transação JPA) com fallback sem transação")
    void handlersRunAfterCommitWithFallback() throws NoSuchMethodException {
        TransactionalEventListener sync = FeedSynchronizationListener.class
                .getMethod("onWorkFeedSync", WorkFeedSyncEvent.class)
                .getAnnotation(TransactionalEventListener.class);
        TransactionalEventListener removal = FeedSynchronizationListener.class
                .getMethod("onWorkFeedRemoval", WorkFeedRemovalEvent.class)
                .getAnnotation(TransactionalEventListener.class);

        assertNotNull(sync, "onWorkFeedSync precisa ser @TransactionalEventListener");
        assertNotNull(removal, "onWorkFeedRemoval precisa ser @TransactionalEventListener");
        assertEquals(TransactionPhase.AFTER_COMMIT, sync.phase());
        assertEquals(TransactionPhase.AFTER_COMMIT, removal.phase());
        assertTrue(sync.fallbackExecution(), "sem transação ativa, a sincronização deve rodar imediatamente");
    }
}

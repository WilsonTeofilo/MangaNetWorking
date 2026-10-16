package com.manganetworking.service.feed;

import com.manganetworking.repository.mongo.WorkFeedMongoRepository;
import com.manganetworking.service.feed.event.WorkFeedRemovalEvent;
import com.manganetworking.service.feed.event.WorkFeedSyncEvent;
import com.manganetworking.service.recommendation.RecommendationAlgorithmService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Sincroniza a coleção {@code feed_works} (MongoDB) reagindo a eventos publicados dentro das transações
 * relacionais.
 *
 * <p>O tratamento roda em {@code AFTER_COMMIT} — nunca dentro da transação JPA — e a escrita no Mongo é
 * delegada a {@code RecommendationAlgorithmService.syncWorkById}, que abre a própria transação de leitura.
 * Assim a sincronização não depende de a sessão JPA da requisição original continuar aberta na fase
 * {@code afterCommit} (OSIV desligado, sem sessão aberta na requisição).</p>
 *
 * <p>{@code fallbackExecution = true} preserva a sincronização imediata quando não há transação ativa
 * (chamadas administrativas e testes).</p>
 */
@Service
public class FeedSynchronizationListener {

    private static final Logger log = LoggerFactory.getLogger(FeedSynchronizationListener.class);

    private final RecommendationAlgorithmService algorithmService;
    private final WorkFeedMongoRepository workFeedMongoRepository;

    public FeedSynchronizationListener(
            RecommendationAlgorithmService algorithmService,
            WorkFeedMongoRepository workFeedMongoRepository
    ) {
        this.algorithmService = algorithmService;
        this.workFeedMongoRepository = workFeedMongoRepository;
    }

    /**
     * Falha do feed não pode derrubar o cadastro/publicação já commitados: o efeito colateral é tolerado
     * e apenas registrado (com causa) para não perder a stacktrace num caminho silencioso.
     */
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onWorkFeedSync(WorkFeedSyncEvent event) {
        try {
            algorithmService.syncWorkById(event.workId());
        } catch (Exception e) {
            log.warn("[FEED] Falha ao sincronizar obra {} após {}: {}", event.workId(), event.context(), e.getMessage(), e);
        }
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onWorkFeedRemoval(WorkFeedRemovalEvent event) {
        try {
            workFeedMongoRepository.deleteByWorkId(event.workId().toString());
        } catch (Exception e) {
            log.warn("[FEED] Falha ao remover obra {} do feed Mongo: {}", event.workId(), e.getMessage(), e);
        }
    }
}

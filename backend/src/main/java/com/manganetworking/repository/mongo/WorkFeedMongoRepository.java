package com.manganetworking.repository.mongo;

import com.manganetworking.domain.nosql.WorkFeedDocument;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface WorkFeedMongoRepository extends MongoRepository<WorkFeedDocument, String> {

    Optional<WorkFeedDocument> findByWorkId(String workId);

    Optional<WorkFeedDocument> findBySlug(String slug);

    // Feed Geral: ranqueado pelo algoritmo. Suspensas e obras arquivadas por LGPD são excluídas
    // na própria consulta para que uma página não seja consumida por documentos ocultos.
    List<WorkFeedDocument> findAllByStatusNotInOrderByDiscoveryScoreDesc(Collection<String> statuses, Pageable pageable);

    // Feed por Gênero: ranqueado pelo algoritmo, excluindo estados ocultos na consulta
    List<WorkFeedDocument> findAllByGenresContainingAndStatusNotInOrderByDiscoveryScoreDesc(
            String genre, Collection<String> statuses, Pageable pageable);

    // Obras Em Alta (Trending Score Desc), excluindo estados ocultos na consulta
    List<WorkFeedDocument> findAllByStatusNotInOrderByTrendingScoreDesc(Collection<String> statuses, Pageable pageable);

    // Lançamentos Recentes (Novos Capítulos), excluindo estados ocultos na consulta
    List<WorkFeedDocument> findAllByStatusNotInOrderByUpdatedAtDesc(Collection<String> statuses, Pageable pageable);

    // Feed filtrado pelo formato (primeiro eixo de navegação: mangá vs light novel).
    List<WorkFeedDocument> findAllByFormatAndStatusNotInOrderByDiscoveryScoreDesc(
            String format, Collection<String> statuses, Pageable pageable);

    List<WorkFeedDocument> findAllByFormatAndStatusNotInOrderByTrendingScoreDesc(
            String format, Collection<String> statuses, Pageable pageable);

    List<WorkFeedDocument> findAllByFormatAndStatusNotInOrderByUpdatedAtDesc(
            String format, Collection<String> statuses, Pageable pageable);

    List<WorkFeedDocument> findAllByGenresContainingAndFormatAndStatusNotInOrderByDiscoveryScoreDesc(
            String genre, String format, Collection<String> statuses, Pageable pageable);

    // Remoção imediata do Feed em caso de suspensão cautelar ou arquivamento por LGPD
    void deleteByWorkId(String workId);
}

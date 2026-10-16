package com.manganetworking.repository.mongo;

import com.manganetworking.domain.nosql.WorkFeedDocument;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WorkFeedMongoRepository extends MongoRepository<WorkFeedDocument, String> {

    Optional<WorkFeedDocument> findByWorkId(String workId);

    Optional<WorkFeedDocument> findBySlug(String slug);

    // Feed Geral: Ranqueado pelo Algoritmo (Discovery Score Desc)
    List<WorkFeedDocument> findAllByOrderByDiscoveryScoreDesc(Pageable pageable);

    // Feed por Gênero: Ranqueado pelo Algoritmo
    List<WorkFeedDocument> findAllByGenresContainingOrderByDiscoveryScoreDesc(String genre, Pageable pageable);

    // Obras Em Alta (Trending Score Desc)
    List<WorkFeedDocument> findAllByOrderByTrendingScoreDesc(Pageable pageable);

    // Lançamentos Recentes (Novos Capítulos)
    List<WorkFeedDocument> findAllByOrderByUpdatedAtDesc(Pageable pageable);

    // Remoção imediata do Feed em caso de suspensão cautelar por moderação
    void deleteByWorkId(String workId);
}

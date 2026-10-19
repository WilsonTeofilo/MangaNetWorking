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

    // Feed Geral: Ranqueado pelo Algoritmo (Discovery Score Desc). A exclusão de obras suspensas é feita
    // na própria consulta para que uma página não seja consumida por documentos suspensos antes de o
    // serviço filtrá-los em memória (senão a página retorna menos itens que o tamanho solicitado).
    List<WorkFeedDocument> findAllByStatusNotOrderByDiscoveryScoreDesc(String status, Pageable pageable);

    // Feed por Gênero: Ranqueado pelo Algoritmo, excluindo suspensas na consulta
    List<WorkFeedDocument> findAllByGenresContainingAndStatusNotOrderByDiscoveryScoreDesc(String genre, String status, Pageable pageable);

    // Obras Em Alta (Trending Score Desc), excluindo suspensas na consulta
    List<WorkFeedDocument> findAllByStatusNotOrderByTrendingScoreDesc(String status, Pageable pageable);

    // Lançamentos Recentes (Novos Capítulos), excluindo suspensas na consulta
    List<WorkFeedDocument> findAllByStatusNotOrderByUpdatedAtDesc(String status, Pageable pageable);

    // Remoção imediata do Feed em caso de suspensão cautelar por moderação
    void deleteByWorkId(String workId);
}

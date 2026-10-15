package com.manganetworking.repository.mongo;

import com.manganetworking.domain.nosql.ReadingProgressDocument;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ReadingProgressMongoRepository extends MongoRepository<ReadingProgressDocument, String> {

    Optional<ReadingProgressDocument> findByUserIdAndWorkId(String userId, String workId);

    List<ReadingProgressDocument> findAllByUserIdOrderByUpdatedAtDesc(String userId);
}

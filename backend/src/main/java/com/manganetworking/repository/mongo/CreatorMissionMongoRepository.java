package com.manganetworking.repository.mongo;

import com.manganetworking.domain.nosql.CreatorMissionDocument;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CreatorMissionMongoRepository extends MongoRepository<CreatorMissionDocument, String> {
    List<CreatorMissionDocument> findAllByCreatorId(String creatorId);
}

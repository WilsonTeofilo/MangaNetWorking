package com.manganetworking.service.feed;

import com.manganetworking.domain.nosql.WorkFeedDocument;
import com.manganetworking.repository.mongo.WorkFeedMongoRepository;
import com.manganetworking.service.recommendation.RecommendationAlgorithmService;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Pageable;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class FeedApplicationServiceTest {

    @Test
    void excludesSuspendedWorksFromPublicFeed() {
        WorkFeedMongoRepository repository = mock(WorkFeedMongoRepository.class);
        RecommendationAlgorithmService algorithm = mock(RecommendationAlgorithmService.class);
        FeedApplicationService service = new FeedApplicationService(repository, algorithm);

        WorkFeedDocument active = new WorkFeedDocument();
        active.setWorkId("active-work");
        active.setStatus("ongoing");
        WorkFeedDocument suspended = new WorkFeedDocument();
        suspended.setWorkId("suspended-work");
        suspended.setStatus("suspended");
        when(repository.findAllByOrderByDiscoveryScoreDesc(any(Pageable.class)))
                .thenReturn(List.of(active, suspended));

        List<WorkFeedDocument> results = service.getFeed("recommended", null, 0, 20);

        assertEquals(List.of(active), results);
        verify(repository).findAllByOrderByDiscoveryScoreDesc(any(Pageable.class));
    }
}

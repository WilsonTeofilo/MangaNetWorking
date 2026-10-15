package com.manganetworking.repository.jpa;

import com.manganetworking.domain.relational.MembershipSubscriptionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface MembershipSubscriptionRepository extends JpaRepository<MembershipSubscriptionEntity, UUID> {
    Optional<MembershipSubscriptionEntity> findBySubscriberIdAndCreatorId(UUID subscriberId, UUID creatorId);

    boolean existsBySubscriberIdAndCreatorIdAndStatusAndExpiresAtAfter(
        UUID subscriberId, 
        UUID creatorId, 
        String status, 
        LocalDateTime now
    );
}

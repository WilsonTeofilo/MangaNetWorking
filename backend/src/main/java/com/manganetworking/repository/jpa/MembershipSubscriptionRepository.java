package com.manganetworking.repository.jpa;

import com.manganetworking.domain.relational.MembershipSubscriptionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.Set;
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

    /** Assinantes ativos do criador, em uma consulta, para o selo de membro. */
    @Query("""
        select s.subscriber.id from MembershipSubscriptionEntity s
        where s.creator.id = :creatorId
          and s.status = 'ACTIVE'
          and s.expiresAt > :now
        """)
    Set<UUID> findActiveSubscriberIds(
        @Param("creatorId") UUID creatorId,
        @Param("now") LocalDateTime now
    );
}

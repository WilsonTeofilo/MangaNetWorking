package com.manganetworking.repository.jpa;

import com.manganetworking.domain.relational.PasswordResetTokenEntity;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetTokenEntity, UUID> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select t from PasswordResetTokenEntity t where t.tokenHash = :hash")
    Optional<PasswordResetTokenEntity> findByTokenHashForUpdate(@Param("hash") String hash);

    @Modifying
    @Query("delete from PasswordResetTokenEntity t where t.userId = :userId")
    void deleteForUser(@Param("userId") UUID userId);

    @Modifying
    @Query("delete from PasswordResetTokenEntity t where t.expiresAt <= :now")
    int deleteExpired(@Param("now") LocalDateTime now);
}

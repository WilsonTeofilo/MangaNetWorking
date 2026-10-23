package com.manganetworking.repository.jpa;

import com.manganetworking.domain.relational.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<UserEntity, UUID> {
    Optional<UserEntity> findByEmail(String email);

    /** Login pela segunda via: o mesmo identificador pode ser e-mail ou username. */
    @Query("select u from UserEntity u where lower(u.email) = lower(:identifier) or lower(u.username) = lower(:identifier)")
    Optional<UserEntity> findByEmailOrUsername(@Param("identifier") String identifier);

    @Query("select u from UserEntity u where lower(u.username) = lower(:username)")
    Optional<UserEntity> findByUsername(@Param("username") String username);

    boolean existsByUsernameIgnoreCase(String username);

    @Query("select count(w) from UserEntity u join u.likedWorks w where u.id = :userId")
    long countLikedWorks(@Param("userId") UUID userId);

    /** Leitores que favoritaram a obra; usado para notificar novo capítulo. */
    @Query("select u.id from UserEntity u join u.likedWorks w where w.id = :workId")
    List<UUID> findUserIdsByFavoriteWork(@Param("workId") UUID workId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select u from UserEntity u where u.id = :id")
    Optional<UserEntity> findByIdForUpdate(@Param("id") UUID id);
}

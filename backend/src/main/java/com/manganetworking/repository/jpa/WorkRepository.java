package com.manganetworking.repository.jpa;

import com.manganetworking.domain.relational.WorkEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface WorkRepository extends JpaRepository<WorkEntity, UUID> {
    Optional<WorkEntity> findBySlug(String slug);
    List<WorkEntity> findAllByAuthorId(UUID authorId);

    /** Carrega as obras com o autor em um único SELECT (evita N+1 na rotação de Season). */
    @Query("select w from WorkEntity w join fetch w.author")
    List<WorkEntity> findAllWithAuthor();
}

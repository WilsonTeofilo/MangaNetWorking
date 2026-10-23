package com.manganetworking.repository.jpa;

import com.manganetworking.domain.relational.WorkEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
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

    /**
     * Contadores atômicos: dois leitores curtindo ao mesmo tempo não podem perder
     * incremento por causa de leitura/gravação concorrente do mesmo registro.
     */
    @Modifying(flushAutomatically = true)
    @Query("update WorkEntity w set w.totalLikes = w.totalLikes + 1 where w.id = :id")
    int incrementTotalLikes(@Param("id") UUID id);

    @Modifying(flushAutomatically = true)
    @Query("update WorkEntity w set w.totalLikes = case when w.totalLikes > 0 then w.totalLikes - 1 else 0 end where w.id = :id")
    int decrementTotalLikes(@Param("id") UUID id);

    /** Remove do agregado as curtidas de um capítulo excluído. */
    @Modifying(flushAutomatically = true)
    @Query("update WorkEntity w set w.totalLikes = case when w.totalLikes >= :amount then w.totalLikes - :amount else 0 end where w.id = :id")
    int decrementTotalLikesBy(@Param("id") UUID id, @Param("amount") long amount);

    @Modifying(flushAutomatically = true)
    @Query("update WorkEntity w set w.totalFavorites = w.totalFavorites + 1 where w.id = :id")
    int incrementTotalFavorites(@Param("id") UUID id);

    @Modifying(flushAutomatically = true)
    @Query("update WorkEntity w set w.totalFavorites = case when w.totalFavorites > 0 then w.totalFavorites - 1 else 0 end where w.id = :id")
    int decrementTotalFavorites(@Param("id") UUID id);

    @Query("select w.totalLikes from WorkEntity w where w.id = :id")
    Long findTotalLikes(@Param("id") UUID id);

    @Query("select w.totalFavorites from WorkEntity w where w.id = :id")
    Long findTotalFavorites(@Param("id") UUID id);

    @Modifying(flushAutomatically = true)
    @Query("update WorkEntity w set w.totalViews = w.totalViews + 1 where w.id = :id")
    int incrementTotalViews(@Param("id") UUID id);

    @Modifying(flushAutomatically = true)
    @Query("update WorkEntity w set w.totalComments = w.totalComments + 1 where w.id = :id")
    int incrementTotalComments(@Param("id") UUID id);

    @Modifying(flushAutomatically = true)
    @Query("update WorkEntity w set w.totalComments = case when w.totalComments > 0 then w.totalComments - 1 else 0 end where w.id = :id")
    int decrementTotalComments(@Param("id") UUID id);
}

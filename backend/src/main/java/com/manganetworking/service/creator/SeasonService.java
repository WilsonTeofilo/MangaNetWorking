package com.manganetworking.service.creator;

import com.manganetworking.config.exception.ResourceNotFoundException;
import com.manganetworking.domain.relational.CreatorEntity;
import com.manganetworking.repository.jpa.CreatorRepository;
import com.manganetworking.service.creator.dto.SeasonStatusResponseDto;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

/**
 * Temporadas (Seasons) de 60 dias.
 *
 * <p>A janela é determinística a partir de uma época fixa, sem tabela de calendário:
 * season 1 = 01/01/2026 até 01/03/2026, e assim por diante. O job de rotação usa a
 * mesma função, então API e job nunca divergem.</p>
 */
@Service
public class SeasonService {

    public static final int SEASON_LENGTH_DAYS = 60;
    private static final LocalDate SEASON_EPOCH = LocalDate.of(2026, 1, 1);

    private final CreatorRepository creatorRepository;

    public SeasonService(CreatorRepository creatorRepository) {
        this.creatorRepository = creatorRepository;
    }

    public SeasonWindow currentSeason(LocalDate today) {
        long daysSinceEpoch = ChronoUnit.DAYS.between(SEASON_EPOCH, today);
        long seasonIndex = Math.floorDiv(daysSinceEpoch, SEASON_LENGTH_DAYS);
        LocalDate start = SEASON_EPOCH.plusDays(seasonIndex * SEASON_LENGTH_DAYS);
        LocalDate end = start.plusDays(SEASON_LENGTH_DAYS - 1L);
        return new SeasonWindow((int) seasonIndex + 1, start, end, end.plusDays(1));
    }

    /**
     * Boost algorítmico do 1º ao último colocado do ranking: 2.2x no topo, 1.5x na base.
     * Determinístico e testável; não depende de aleatoriedade.
     */
    public double boostForRank(int rankIndex, int winners) {
        if (winners <= 1) {
            return 2.2;
        }
        double step = 0.7 / (winners - 1);
        double boost = 1.5 + (rankIndex * step);
        return Math.round(boost * 100.0) / 100.0;
    }

    @Transactional(readOnly = true)
    public SeasonStatusResponseDto getStatus(UUID creatorId) {
        CreatorEntity creator = creatorRepository.findById(creatorId)
                .orElseThrow(() -> new ResourceNotFoundException("Criador não encontrado"));

        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        SeasonWindow current = currentSeason(today);
        int daysRemaining = (int) ChronoUnit.DAYS.between(today, current.end()) + 1;

        return new SeasonStatusResponseDto(
                current.number(),
                current.start(),
                current.end(),
                current.nextStart(),
                daysRemaining,
                creator.getEngagementBoostMul(),
                creator.getEngagementBoostUntil(),
                creator.hasActiveBoost()
        );
    }

    public record SeasonWindow(int number, LocalDate start, LocalDate end, LocalDate nextStart) {}
}

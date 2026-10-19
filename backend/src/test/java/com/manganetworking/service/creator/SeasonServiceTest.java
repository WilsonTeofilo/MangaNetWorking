package com.manganetworking.service.creator;

import com.manganetworking.repository.jpa.CreatorRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

class SeasonServiceTest {

    private final SeasonService seasonService = new SeasonService(mock(CreatorRepository.class));

    @Test
    @DisplayName("a temporada 1 começa na época e dura 60 dias")
    void shouldStartSeasonOneOnEpoch() {
        SeasonService.SeasonWindow season = seasonService.currentSeason(LocalDate.of(2026, 1, 1));

        assertThat(season.number()).isEqualTo(1);
        assertThat(season.start()).isEqualTo(LocalDate.of(2026, 1, 1));
        assertThat(season.end()).isEqualTo(LocalDate.of(2026, 3, 1));
        assertThat(season.nextStart()).isEqualTo(LocalDate.of(2026, 3, 2));
    }

    @Test
    @DisplayName("o último dia ainda pertence à temporada anterior")
    void shouldKeepLastDayInSameSeason() {
        SeasonService.SeasonWindow season = seasonService.currentSeason(LocalDate.of(2026, 3, 1));

        assertThat(season.number()).isEqualTo(1);
        assertThat(season.end()).isEqualTo(LocalDate.of(2026, 3, 1));
    }

    @Test
    @DisplayName("a temporada 2 começa no 61º dia")
    void shouldRollToSeasonTwoAfterSixtyDays() {
        SeasonService.SeasonWindow season = seasonService.currentSeason(LocalDate.of(2026, 3, 2));

        assertThat(season.number()).isEqualTo(2);
        assertThat(season.start()).isEqualTo(LocalDate.of(2026, 3, 2));
        assertThat(season.end()).isEqualTo(LocalDate.of(2026, 4, 30));
    }

    @Test
    @DisplayName("o boost varia de 1.5x na base a 2.2x no topo")
    void boostShouldRampFromBaseToTop() {
        assertThat(seasonService.boostForRank(0, 5)).isEqualTo(1.5);
        assertThat(seasonService.boostForRank(2, 5)).isEqualTo(1.85);
        assertThat(seasonService.boostForRank(4, 5)).isEqualTo(2.2);
    }

    @Test
    @DisplayName("com um único vencedor, o boost é o máximo")
    void singleWinnerShouldReceiveMaxBoost() {
        assertThat(seasonService.boostForRank(0, 1)).isEqualTo(2.2);
    }
}

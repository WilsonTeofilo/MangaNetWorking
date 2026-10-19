package com.manganetworking.service.creator.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;

/** Estado da temporada (Season) de 60 dias para o criador autenticado. */
public record SeasonStatusResponseDto(
        int seasonNumber,
        LocalDate startsOn,
        LocalDate endsOn,
        LocalDate nextSeasonStartsOn,
        int daysRemaining,
        Double boostMultiplier,
        LocalDateTime boostUntil,
        boolean boostActive
) {}

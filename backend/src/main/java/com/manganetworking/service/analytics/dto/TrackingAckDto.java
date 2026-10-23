package com.manganetworking.service.analytics.dto;

/**
 * Resultado de um lote de tracking.
 *
 * @param accepted  eventos novos gravados
 * @param duplicates reenvios idempotentes ignorados
 * @param rejected  itens que não puderam ser associados a uma obra existente
 */
public record TrackingAckDto(int accepted, int duplicates, int rejected) {

    public static TrackingAckDto empty() {
        return new TrackingAckDto(0, 0, 0);
    }
}

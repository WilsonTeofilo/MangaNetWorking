package com.manganetworking.domain.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

import java.util.Locale;

/**
 * Estado do ciclo de vida editorial de uma obra.
 */
public enum WorkStatus {
    DRAFT,
    ONGOING,
    COMPLETED,
    SUSPENDED,
    ARCHIVED_LGPD;

    /**
     * Obra com visibilidade aberta a qualquer leitor no feed/catálogo.
     */
    public boolean isPublic() {
        return this == ONGOING || this == COMPLETED;
    }

    /**
     * Obra oculta do público (rascunho, suspensa por moderação ou arquivada por exclusão de conta).
     */
    public boolean isHidden() {
        return this == DRAFT || this == SUSPENDED || this == ARCHIVED_LGPD;
    }

    @JsonCreator
    public static WorkStatus fromString(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("Estado da obra é obrigatório.");
        }
        String normalized = value.trim().toUpperCase(Locale.ROOT);
        try {
            return WorkStatus.valueOf(normalized);
        } catch (IllegalArgumentException exception) {
            throw new IllegalArgumentException("Estado da obra inválido.", exception);
        }
    }

    @JsonValue
    public String toValue() {
        return this.name();
    }
}

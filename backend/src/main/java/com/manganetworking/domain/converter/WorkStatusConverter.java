package com.manganetworking.domain.converter;

import com.manganetworking.domain.enums.WorkStatus;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import java.util.Locale;

/**
 * Converte o enum {@link WorkStatus} para a coluna {@code status} do banco de dados.
 * <p>Aceita tanto valores legados em minúsculo ('ongoing', 'completed') quanto novos em
 * maiúsculo ('ONGOING', 'COMPLETED'), persistindo sempre no formato canônico em maiúsculo.</p>
 */
@Converter(autoApply = true)
public class WorkStatusConverter implements AttributeConverter<WorkStatus, String> {

    @Override
    public String convertToDatabaseColumn(WorkStatus attribute) {
        return attribute == null ? WorkStatus.ONGOING.name() : attribute.name();
    }

    @Override
    public WorkStatus convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isBlank()) {
            return WorkStatus.ONGOING;
        }
        try {
            return WorkStatus.valueOf(dbData.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            return WorkStatus.ONGOING;
        }
    }
}

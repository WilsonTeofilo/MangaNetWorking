package com.manganetworking.service.catalog;

import com.manganetworking.domain.enums.Genre;

import java.text.Normalizer;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

/**
 * Rótulos em português dos gêneros + busca por texto do catálogo.
 *
 * <p>O gênero é um enum persistido sem acento ({@code ACAO}, {@code SCI_FI}). O leitor digita
 * "ação" ou "ficção científica"; este utilitário traduz o termo livre para o enum correspondente,
 * para que a busca prometida ("obra, autor ou gênero") funcione no servidor e não só no título.</p>
 */
public final class GenreLabels {

    private static final Map<Genre, String> LABELS = Map.ofEntries(
            Map.entry(Genre.ACAO, "Ação"),
            Map.entry(Genre.AVENTURA, "Aventura"),
            Map.entry(Genre.SHONEN, "Shonen"),
            Map.entry(Genre.SEINEN, "Seinen"),
            Map.entry(Genre.FANTASIA, "Fantasia"),
            Map.entry(Genre.SCI_FI, "Ficção científica"),
            Map.entry(Genre.SOBRENATURAL, "Sobrenatural"),
            Map.entry(Genre.MISTERIO, "Mistério"),
            Map.entry(Genre.DRAMA, "Drama"),
            Map.entry(Genre.COMEDIA, "Comédia")
    );

    private GenreLabels() {}

    /** Rótulo público do gênero (usado no front e na busca por texto). */
    public static String label(Genre genre) {
        return LABELS.getOrDefault(genre, genre.name());
    }

    /** Gêneros cujo rótulo contém o termo digitado. Vazio quando não há correspondência. */
    public static List<Genre> matching(String term) {
        if (term == null || term.isBlank()) {
            return List.of();
        }
        String normalizedTerm = fold(term);
        return LABELS.entrySet().stream()
                .filter(entry -> fold(entry.getValue()).contains(normalizedTerm))
                .map(Map.Entry::getKey)
                .toList();
    }

    /** Converte o parâmetro {@code genero} (nome do enum ou rótulo) em gênero válido. */
    public static Optional<Genre> parse(String raw) {
        if (raw == null || raw.isBlank()) {
            return Optional.empty();
        }
        String folded = fold(raw).replace(' ', '_');
        for (Genre genre : Genre.values()) {
            if (fold(genre.name()).equals(folded)) {
                return Optional.of(genre);
            }
        }
        String normalizedLabel = fold(raw);
        return LABELS.entrySet().stream()
                .filter(entry -> fold(entry.getValue()).equals(normalizedLabel))
                .map(Map.Entry::getKey)
                .findFirst();
    }

    private static String fold(String value) {
        return Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "")
                .toLowerCase(Locale.ROOT)
                .trim();
    }
}

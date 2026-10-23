package com.manganetworking.domain.enums;

public enum ChapterType {
    /** Capítulo regular de light novel: 1.000–30.000 caracteres visíveis. */
    REGULAR,
    /** Prólogo (capítulo 0): opcional, único, posição inicial. Mínimo 300 caracteres. */
    PROLOGUE,
    /** Conteúdo especial (extra, side story, glossário, etc.): mínimo 300 caracteres. */
    SPECIAL
}
package com.manganetworking.domain.enums;

/**
 * Sexo declarado no perfil. Dado opcional por natureza: o titular pode deixar
 * {@link #NAO_INFORMADO} e a plataforma não pode presumir nada (LGPD — minimização).
 */
public enum Sex {
    MASCULINO,
    FEMININO,
    OUTRO,
    NAO_INFORMADO
}

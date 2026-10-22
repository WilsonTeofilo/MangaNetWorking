package com.manganetworking.util;

import java.util.Locale;
import java.util.Set;

/**
 * Domínios reservados para teste nunca recebem e-mail real.
 *
 * <p>RFC 2606 e RFC 6761 reservam {@code example.com/net/org} e os TLDs
 * {@code .test}, {@code .example}, {@code .invalid} e {@code .localhost} para
 * documentação e testes; o IANA reserva {@code test.com} para o mesmo fim.
 * Nenhum desses domínios tem caixa postal de verdade: o SMTP entrega, o
 * servidor recusa e o remetente leva um bounce ("Address not found") — o que
 * mancha a reputacao do dominio de envio e polui a caixa de quem cadastrou.
 *
 * <p>Regra pura (sem I/O): o bloco de envio consulta antes de despachar.</p>
 */
public final class ReservedTestDomainPolicy {

    /** Dominios completos reservados para teste. */
    private static final Set<String> RESERVED_DOMAINS = Set.of(
            "example.com",
            "example.net",
            "example.org",
            "test.com"
    );

    /** TLDs reservados para teste. */
    private static final Set<String> RESERVED_TLDS = Set.of(
            "test",
            "example",
            "invalid",
            "localhost"
    );

    private ReservedTestDomainPolicy() {
    }

    /**
     * {@code true} quando o endereço está em um domínio reservado para teste.
     *
     * @param email endereço de destino (pode ser nulo ou malformado)
     * @return {@code true} se o envio deve ser bloqueado
     */
    public static boolean isReservedTestDomain(String email) {
        if (email == null) {
            return false;
        }
        int at = email.lastIndexOf('@');
        if (at <= 0 || at == email.length() - 1) {
            return false;
        }
        String domain = email.substring(at + 1).trim().toLowerCase(Locale.ROOT);
        if (domain.isEmpty()) {
            return false;
        }
        if (RESERVED_DOMAINS.contains(domain)) {
            return true;
        }
        int dot = domain.lastIndexOf('.');
        if (dot < 0 || dot == domain.length() - 1) {
            return false;
        }
        return RESERVED_TLDS.contains(domain.substring(dot + 1));
    }
}

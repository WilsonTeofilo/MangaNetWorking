package com.manganetworking.service.user;

import com.manganetworking.domain.relational.CreatorEntity;
import com.manganetworking.domain.relational.UserEntity;
import com.manganetworking.repository.jpa.CreatorRepository;
import com.manganetworking.repository.jpa.UserRepository;
import com.manganetworking.util.UsernamePolicy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.UUID;

/**
 * Regra de identidade da conta: o username.
 *
 * <p>O username é o identificador público do usuário e a segunda forma de login. Ele é
 * <strong>imutável</strong> depois de escolhido — por isso só pode ser <em>reivindicado</em> uma
 * vez, enquanto a conta ainda usa o identificador gerado automaticamente. Quando o usuário é
 * escritor, o handle público acompanha o username (desde que o handle esteja livre).</p>
 *
 * <p>Esta classe existe para isolar essa regra: o serviço de perfil cuida de avatar, visibilidade,
 * exportação e exclusão; a identidade tem dono, teste e regra próprios.</p>
 *
 * <p><b>Blindagem contra erro de_colisão:</b> quando o username desejado já existe, a resposta
 * traz uma sugestão concreta e utilizável ({@link #suggestAvailableUsername}) — o titular nunca
 * fica preso num "não pode" sem saída.</p>
 */
@Service
public class AccountIdentityService {

    /** Prefixo do identificador automático das contas que ainda não escolheram username. */
    public static final String GENERATED_USERNAME_PREFIX = "user_";

    /** Quantidade de alternativas oferecidas quando o username desejado está em uso. */
    private static final int SUGGESTION_ATTEMPTS = 20;

    private final UserRepository userRepository;
    private final CreatorRepository creatorRepository;

    public AccountIdentityService(UserRepository userRepository, CreatorRepository creatorRepository) {
        this.userRepository = userRepository;
        this.creatorRepository = creatorRepository;
    }

    /**
     * Verifica se um username pode ser usado e, quando não, devolve uma alternativa livre.
     *
     * @param requested username desejado (pode ser inválido: o erro é reportado, não lançado)
     * @return disponibilidade e sugestão
     */
    @Transactional(readOnly = true)
    public UsernameAvailability checkAvailability(String requested) {
        String candidate;
        try {
            candidate = UsernamePolicy.normalize(requested);
        } catch (IllegalArgumentException invalid) {
            return new UsernameAvailability(false, null, invalid.getMessage());
        }
        if (userRepository.existsByUsernameIgnoreCase(candidate)) {
            return new UsernameAvailability(false, suggestAvailableUsername(candidate), null);
        }
        return new UsernameAvailability(true, candidate, null);
    }

    /**
     * Procura um username livre parecido com o desejado (sufixo numérico).
     *
     * @param desired username já canonicalizado e em uso
     * @return a primeira alternativa livre, ou {@code null} se nada for encontrado
     */
    @Transactional(readOnly = true)
    public String suggestAvailableUsername(String desired) {
        for (int suffix = 2; suffix <= SUGGESTION_ATTEMPTS; suffix++) {
            String candidate = desired + suffix;
            if (candidate.length() > UsernamePolicy.MAX_LENGTH) {
                candidate = desired.substring(0, UsernamePolicy.MAX_LENGTH - String.valueOf(suffix).length()) + suffix;
            }
            if (!userRepository.existsByUsernameIgnoreCase(candidate)) {
                return candidate;
            }
        }
        return null;
    }

    /**
     * Reivindica o username da conta, respeitando a imutabilidade e a unicidade.
     *
     * @param userId    titular da conta
     * @param requested username desejado (canonicalizado pela política)
     * @throws IllegalArgumentException quando o username é inválido, já foi escolhido ou está em uso
     *                       (a mensagem inclui uma alternativa livre quando existe)
     */
    @Transactional
    public void claimUsername(UUID userId, String requested) {
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new com.manganetworking.config.exception.ResourceNotFoundException("Usuário não encontrado"));

        String candidate = UsernamePolicy.normalize(requested);
        if (candidate.equalsIgnoreCase(user.getUsername())) {
            return;
        }
        if (!isGeneratedUsername(user)) {
            throw new IllegalArgumentException("Este username já foi escolhido e não pode ser alterado.");
        }
        if (userRepository.existsByUsernameIgnoreCase(candidate)) {
            String suggestion = suggestAvailableUsername(candidate);
            throw new IllegalArgumentException(suggestion == null
                    ? "Este username já está em uso."
                    : "Este username já está em uso. Tente \"" + suggestion + "\".");
        }

        user.setUsername(candidate);
        userRepository.save(user);
        syncCreatorHandleWithUsername(user, candidate);
    }

    /**
     * Indica se a conta ainda usa o identificador gerado automaticamente (pode reivindicar).
     *
     * @param user conta do titular
     * @return {@code true} quando o username ainda é o placeholder
     */
    public boolean isGeneratedUsername(UserEntity user) {
        return user.getUsername() != null
                && user.getUsername().equals(generatedUsernameFor(user.getId()));
    }

    /**
     * Identificador automático derivado do id da conta (determinístico e único).
     *
     * @param userId id da conta
     * @return o username gerado
     */
    public String generatedUsernameFor(UUID userId) {
        return GENERATED_USERNAME_PREFIX + userId.toString().replace("-", "").substring(0, 12);
    }

    /**
     * Faz o handle público do escritor acompanhar o username — desde que o handle esteja livre.
     * Se já existir outro autor com aquele handle, o username é mantido e o handle antigo segue.
     */
    private void syncCreatorHandleWithUsername(UserEntity user, String username) {
        creatorRepository.findByUserId(user.getId()).ifPresent(creator -> {
            if (creator.getHandle() != null && creator.getHandle().equalsIgnoreCase(username)) {
                return;
            }
            if (creatorRepository.findByHandle(username).isPresent()) {
                return;
            }
            creator.setHandle(username);
            creatorRepository.save(creator);
        });
    }

    /**
     * Resultado da consulta de disponibilidade de um username.
     *
     * @param available   {@code true} quando o username pode ser usado
     * @param suggestion  alternativa livre quando o desejado está em uso (pode ser nula)
     * @param invalidReason motivo da recusa quando o formato é inválido (pode ser nulo)
     */
    public record UsernameAvailability(boolean available, String suggestion, String invalidReason) {
    }
}

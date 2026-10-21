package com.manganetworking.service.creator;

import com.manganetworking.domain.enums.PixKeyType;
import com.manganetworking.domain.relational.CreatorEntity;
import com.manganetworking.domain.relational.UserEntity;
import com.manganetworking.domain.value.SocialLinks;
import org.springframework.stereotype.Component;

/**
 * Fábrica do perfil de escritor.
 *
 * <p>Existe para não duplicar a construção do perfil em dois fluxos (cadastro já com perfil de
 * escritor e candidatura de leitor a escritor): a mesma regra de negócio — identificador recycled
 * do username, foto herdada, vínculos validados, chave PIX inicial e nível zero — em um só lugar.
 * </p>
 */
@Component
public class CreatorProfileFactory {

    /** Texto inicial do perfil; o autor edita depois em "Configurações do criador". */
    public static final String DEFAULT_BIO = "Novo escritor na MangaNetWorking.";

    /** Nível inicial: sem monetização até a habilitação (nível 2+, maioridade, CPF e PIX). */
    public static final int INITIAL_MONETIZATION_LEVEL = 0;

    /**
     * Monta o perfil de escritor a partir da conta de leitor.
     *
     * @param user    conta de leitor (nome, e-mail, foto e username já são dela)
     * @param links   vínculos sociais validados
     * @param cpf     CPF normalizado (pode ser nulo: só é exigido para monetizar)
     * @return o perfil pronto para gravação (ainda não salvo)
     */
    public CreatorEntity create(UserEntity user, SocialLinks links, String cpf) {
        CreatorEntity creator = new CreatorEntity();
        creator.setUser(user);
        creator.setHandle(user.getUsername());
        creator.setBio(DEFAULT_BIO);
        creator.setAvatarUrl(user.getAvatarUrl());
        creator.setInstagramUrl(links.instagramUrl());
        creator.setYoutubeUrl(links.youtubeUrl());
        creator.setPortfolioUrl(links.portfolioUrl());
        creator.setDocumentCpf(cpf);
        creator.setPixKey(user.getEmail());
        creator.setPixKeyType(PixKeyType.EMAIL);
        creator.setMonetizationLevel(INITIAL_MONETIZATION_LEVEL);
        return creator;
    }
}

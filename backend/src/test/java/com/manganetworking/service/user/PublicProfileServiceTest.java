package com.manganetworking.service.user;

import com.manganetworking.domain.relational.CreatorEntity;
import com.manganetworking.domain.relational.UserEntity;
import com.manganetworking.repository.jpa.CreatorFollowRepository;
import com.manganetworking.repository.jpa.CreatorRepository;
import com.manganetworking.repository.jpa.UserRepository;
import com.manganetworking.repository.jpa.WorkRepository;
import com.manganetworking.service.user.dto.PublicProfileResponseDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

/**
 * Perfil público: a privacidade é do titular e vale para todo mundo, inclusive nos comentários.
 */
@ExtendWith(MockitoExtension.class)
class PublicProfileServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private CreatorRepository creatorRepository;
    @Mock
    private CreatorFollowRepository followRepository;
    @Mock
    private WorkRepository workRepository;

    private PublicProfileService service;

    @BeforeEach
    void setUp() {
        service = new PublicProfileService(userRepository, creatorRepository, followRepository, workRepository);
        lenient().when(userRepository.countLikedWorks(any())).thenReturn(0L);
    }

    @Test
    void privateProfileRevealsOnlyTheUsername() {
        UserEntity user = new UserEntity();
        user.setId(UUID.randomUUID());
        user.setUsername("wils");
        user.setName("Wilson Silva");
        user.setAvatarUrl("/api/storage/avatar.png");
        user.setProfilePublic(false);
        user.setCreatedAt(LocalDateTime.now());

        when(userRepository.findByUsername("wils")).thenReturn(Optional.of(user));

        PublicProfileResponseDto dto = service.getPublicProfile("@wils");

        assertEquals("wils", dto.username());
        assertFalse(dto.profilePublic());
        assertNull(dto.displayName());
        assertNull(dto.avatarUrl());
        assertNull(dto.instagramUrl());
        assertEquals(0, dto.followerCount());
    }

    @Test
    void publicWriterProfileShowsLinksAndFollowers() {
        UserEntity user = new UserEntity();
        user.setId(UUID.randomUUID());
        user.setUsername("teofilo");
        user.setName("Teófilo");
        user.setProfilePublic(true);
        user.setCreator(true);
        user.setCreatedAt(LocalDateTime.now());

        CreatorEntity creator = new CreatorEntity();
        creator.setId(UUID.randomUUID());
        creator.setHandle("teofilo");
        creator.setBio("Escritor");
        creator.setInstagramUrl("https://instagram.com/teofilo");
        creator.setUser(user);

        when(userRepository.findByUsername("teofilo")).thenReturn(Optional.of(user));
        when(creatorRepository.findByUserId(user.getId())).thenReturn(Optional.of(creator));
        when(followRepository.countByCreatorId(creator.getId())).thenReturn(12L);

        PublicProfileResponseDto dto = service.getPublicProfile("teofilo");

        assertTrue(dto.profilePublic());
        assertEquals("Teófilo", dto.displayName());
        assertEquals("https://instagram.com/teofilo", dto.instagramUrl());
        assertEquals(12, dto.followerCount());
        assertTrue(dto.isCreator());
    }

    @Test
    void readerProfileHasNoFollowers() {
        UserEntity user = new UserEntity();
        user.setId(UUID.randomUUID());
        user.setUsername("leitor");
        user.setName("Leitor");
        user.setProfilePublic(true);
        user.setCreator(false);
        user.setCreatedAt(LocalDateTime.now());

        when(userRepository.findByUsername("leitor")).thenReturn(Optional.of(user));
        when(creatorRepository.findByUserId(user.getId())).thenReturn(Optional.empty());

        PublicProfileResponseDto dto = service.getPublicProfile("leitor");

        assertFalse(dto.isCreator());
        assertEquals(0, dto.followerCount());
        assertNull(dto.creatorHandle());
    }
}

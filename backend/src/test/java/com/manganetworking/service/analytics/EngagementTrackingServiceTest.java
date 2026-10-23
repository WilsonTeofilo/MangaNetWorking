package com.manganetworking.service.analytics;

import com.manganetworking.domain.nosql.EngagementEventDocument;
import com.manganetworking.domain.relational.CreatorEntity;
import com.manganetworking.domain.relational.WorkEntity;
import com.manganetworking.repository.jpa.WorkRepository;
import com.manganetworking.repository.mongo.EngagementEventMongoRepository;
import com.manganetworking.service.analytics.dto.TrackImpressionRequestDto;
import com.manganetworking.service.analytics.dto.TrackOpeningRequestDto;
import com.manganetworking.service.analytics.dto.TrackingAckDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EngagementTrackingServiceTest {

    private static final String USER = "leitor-1";

    @Mock
    private WorkRepository workRepository;

    @Mock
    private EngagementEventMongoRepository engagementEventRepository;

    @InjectMocks
    private EngagementTrackingService service;

    private WorkEntity work;

    @BeforeEach
    void setUp() {
        CreatorEntity creator = new CreatorEntity();
        creator.setId(UUID.randomUUID());
        work = new WorkEntity();
        work.setId(UUID.randomUUID());
        work.setAuthor(creator);
    }

    private TrackImpressionRequestDto.ImpressionDto impression(String surface, String key) {
        return new TrackImpressionRequestDto.ImpressionDto(work.getId().toString(), surface, key);
    }

    @Test
    @DisplayName("impressão nova grava superfície fechada, carimbo do servidor e versão do evento")
    void shouldStoreNewImpressionWithServerTimestamp() {
        when(workRepository.findAllById(anyCollection())).thenReturn(List.of(work));
        when(engagementEventRepository.findAllByIdempotencyKeyIn(anyCollection())).thenReturn(List.of());

        Instant before = Instant.now();
        TrackingAckDto ack = service.trackImpressions(USER, new TrackImpressionRequestDto(
                List.of(impression("FEED", "sessao-abc:obra-1"))));

        assertThat(ack).isEqualTo(new TrackingAckDto(1, 0, 0));
        ArgumentCaptor<EngagementEventDocument> captor =
                ArgumentCaptor.forClass(EngagementEventDocument.class);
        verify(engagementEventRepository).save(captor.capture());
        EngagementEventDocument saved = captor.getValue();
        assertThat(saved.getEventType()).isEqualTo("IMPRESSION");
        assertThat(saved.getSurface()).isEqualTo("FEED");
        assertThat(saved.getCreatorId()).isEqualTo(work.getAuthor().getId().toString());
        assertThat(saved.getIdempotencyKey()).isEqualTo(USER + ":IMPRESSION:sessao-abc:obra-1");
        assertThat(saved.getEventVersion()).isEqualTo(1);
        assertThat(saved.getTimestamp()).isAfterOrEqualTo(before);
    }

    @Test
    @DisplayName("reenvio da mesma chave não duplica impressão")
    void shouldIgnoreDuplicateImpressionKey() {
        when(workRepository.findAllById(anyCollection())).thenReturn(List.of(work));
        EngagementEventDocument existing = new EngagementEventDocument();
        existing.setIdempotencyKey(USER + ":IMPRESSION:sessao-abc:obra-1");
        when(engagementEventRepository.findAllByIdempotencyKeyIn(anyCollection()))
                .thenReturn(List.of(existing));

        TrackingAckDto ack = service.trackImpressions(USER, new TrackImpressionRequestDto(
                List.of(impression("FEED", "sessao-abc:obra-1"))));

        assertThat(ack).isEqualTo(new TrackingAckDto(0, 1, 0));
        verify(engagementEventRepository, never()).save(any());
    }

    @Test
    @DisplayName("corrida de duas requisições com a mesma chave vira duplicata, não erro")
    void shouldTreatUniqueViolationAsDuplicate() {
        when(workRepository.findAllById(anyCollection())).thenReturn(List.of(work));
        when(engagementEventRepository.findAllByIdempotencyKeyIn(anyCollection())).thenReturn(List.of());
        when(engagementEventRepository.save(any())).thenThrow(
                new org.springframework.dao.DuplicateKeyException("E11000 duplicate key"));

        TrackingAckDto ack = service.trackImpressions(USER, new TrackImpressionRequestDto(
                List.of(impression("CATALOGO", "sessao-abc:obra-2"))));

        assertThat(ack).isEqualTo(new TrackingAckDto(0, 1, 0));
    }

    @Test
    @DisplayName("superfície fora da lista fechada é rejeitada com 400")
    void shouldRejectUnknownSurface() {
        assertThatThrownBy(() -> service.trackImpressions(USER, new TrackImpressionRequestDto(
                List.of(impression("QUALQUER_COISA", "sessao-abc:obra-3")))))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Superfície");
        verify(engagementEventRepository, never()).save(any());
    }

    @Test
    @DisplayName("obra inexistente é contabilizada como rejeitada, sem gravar lixo")
    void shouldRejectUnknownWork() {
        when(workRepository.findAllById(anyCollection())).thenReturn(List.of());

        TrackingAckDto ack = service.trackImpressions(USER, new TrackImpressionRequestDto(
                List.of(impression("FEED", "sessao-abc:obra-4"))));

        assertThat(ack).isEqualTo(new TrackingAckDto(0, 0, 1));
        verify(engagementEventRepository, never()).save(any());
    }

    @Test
    @DisplayName("abertura usa o mesmo contrato idempotente e ID de obra inválido vira 400")
    void shouldTrackOpeningAndRejectMalformedWorkId() {
        when(workRepository.findById(work.getId())).thenReturn(Optional.of(work));
        when(engagementEventRepository.findAllByIdempotencyKeyIn(anyCollection())).thenReturn(List.of());

        TrackingAckDto ack = service.trackOpening(USER,
                new TrackOpeningRequestDto(work.getId().toString(), "FEED", "sessao-abc:abertura-1"));

        assertThat(ack.accepted()).isEqualTo(1);
        ArgumentCaptor<EngagementEventDocument> captor =
                ArgumentCaptor.forClass(EngagementEventDocument.class);
        verify(engagementEventRepository).save(captor.capture());
        assertThat(captor.getValue().getEventType()).isEqualTo("OPEN");
        assertThat(captor.getValue().getIdempotencyKey())
                .isEqualTo(USER + ":OPEN:sessao-abc:abertura-1");

        assertThatThrownBy(() -> service.trackOpening(USER,
                new TrackOpeningRequestDto("nao-e-uuid", "FEED", "sessao-abc:abertura-2")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("ID de obra inválido");
    }
}

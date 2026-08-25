package com.palisade.travel.global.sse;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

class SseConnectionServiceTest {

    private SseEmitterRepository repository;
    private SseConnectionService connectionService;

    @BeforeEach
    void setUp() {
        repository = new SseEmitterRepository();
        connectionService = new SseConnectionService(repository);
    }

    @Test
    void connectRegistersANewEmitterForTheUser() {
        SseEmitter emitter = connectionService.connect(1L);

        assertThat(repository.findAllByUserId(1L)).containsExactly(emitter);
    }

    @Test
    void sendDeliversTheEventToEveryEmitterOfTheUser() throws IOException {
        SseEmitter first = mock(SseEmitter.class);
        SseEmitter second = mock(SseEmitter.class);
        repository.save(1L, first);
        repository.save(1L, second);

        connectionService.send(1L, SseEventType.LOCATION_UPDATED, "payload");

        verify(first, times(1)).send(any(SseEmitter.SseEventBuilder.class));
        verify(second, times(1)).send(any(SseEmitter.SseEventBuilder.class));
    }

    @Test
    void sendDoesNothingWhenTheUserHasNoEmitter() {
        connectionService.send(1L, SseEventType.LOCATION_UPDATED, "payload");

        assertThat(repository.findAllByUserId(1L)).isEmpty();
    }

    @Test
    void sendRemovesAnEmitterThatFailsToDeliver() throws IOException {
        SseEmitter broken = mock(SseEmitter.class);
        doThrow(new IOException("broken pipe")).when(broken).send(any(SseEmitter.SseEventBuilder.class));
        repository.save(1L, broken);

        connectionService.send(1L, SseEventType.LOCATION_UPDATED, "payload");

        assertThat(repository.findAllByUserId(1L)).isEmpty();
    }

    @Test
    void disconnectCompletesAndRemovesEveryEmitterOfTheUser() {
        SseEmitter emitter = mock(SseEmitter.class);
        repository.save(1L, emitter);

        connectionService.disconnect(1L);

        verify(emitter, times(1)).complete();
        assertThat(repository.findAllByUserId(1L)).isEmpty();
    }

    @Test
    void heartbeatSendsACommentToEveryEmitter() throws IOException {
        SseEmitter emitter = mock(SseEmitter.class);
        repository.save(1L, emitter);

        connectionService.sendHeartbeat();

        verify(emitter, times(1)).send(any(SseEmitter.SseEventBuilder.class));
    }

    @Test
    void heartbeatRemovesEmittersThatFailToDeliver() throws IOException {
        SseEmitter broken = mock(SseEmitter.class);
        doThrow(new IOException("broken pipe")).when(broken).send(any(SseEmitter.SseEventBuilder.class));
        repository.save(1L, broken);

        connectionService.sendHeartbeat();

        assertThat(repository.findAllByUserId(1L)).isEmpty();
    }
}

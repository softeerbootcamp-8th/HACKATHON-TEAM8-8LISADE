package com.palisade.travel.global.sse;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class SseEmitterRepositoryTest {

    private SseEmitterRepository repository;

    @BeforeEach
    void setUp() {
        repository = new SseEmitterRepository();
    }

    @Test
    void savedEmitterIsReturnedForItsUser() {
        SseEmitter emitter = new SseEmitter();

        repository.save(1L, emitter);

        assertThat(repository.findAllByUserId(1L)).containsExactly(emitter);
    }

    @Test
    void aUserCanHaveMultipleEmitters() {
        SseEmitter first = new SseEmitter();
        SseEmitter second = new SseEmitter();

        repository.save(1L, first);
        repository.save(1L, second);

        assertThat(repository.findAllByUserId(1L)).containsExactlyInAnyOrder(first, second);
    }

    @Test
    void aUserWithNoEmitterHasAnEmptyList() {
        assertThat(repository.findAllByUserId(99L)).isEmpty();
    }

    @Test
    void removeOnlyDropsTheGivenEmitter() {
        SseEmitter first = new SseEmitter();
        SseEmitter second = new SseEmitter();
        repository.save(1L, first);
        repository.save(1L, second);

        repository.remove(1L, first);

        assertThat(repository.findAllByUserId(1L)).containsExactly(second);
    }

    @Test
    void removeAllDropsEveryEmitterForTheUser() {
        repository.save(1L, new SseEmitter());
        repository.save(1L, new SseEmitter());

        repository.removeAll(1L);

        assertThat(repository.findAllByUserId(1L)).isEmpty();
    }

    @Test
    void findAllReturnsEmittersAcrossAllUsers() {
        SseEmitter first = new SseEmitter();
        SseEmitter second = new SseEmitter();
        repository.save(1L, first);
        repository.save(2L, second);

        List<SseEmitter> all = repository.findAll();

        assertThat(all).containsExactlyInAnyOrder(first, second);
    }
}

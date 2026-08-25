package com.palisade.travel.global.sse;

import org.springframework.stereotype.Repository;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.stream.Collectors;

@Repository
public class SseEmitterRepository {

    private final Map<Long, CopyOnWriteArrayList<SseEmitter>> emittersByUserId = new ConcurrentHashMap<>();

    public void save(Long userId, SseEmitter emitter) {
        emittersByUserId.computeIfAbsent(userId, id -> new CopyOnWriteArrayList<>()).add(emitter);
    }

    public List<SseEmitter> findAllByUserId(Long userId) {
        return emittersByUserId.getOrDefault(userId, new CopyOnWriteArrayList<>());
    }

    public List<SseEmitter> findAll() {
        return emittersByUserId.values().stream()
                .flatMap(List::stream)
                .toList();
    }

    public Map<Long, List<SseEmitter>> snapshot() {
        return emittersByUserId.entrySet().stream()
                .collect(Collectors.toMap(Map.Entry::getKey, entry -> List.copyOf(entry.getValue())));
    }

    public void remove(Long userId, SseEmitter emitter) {
        emittersByUserId.computeIfPresent(userId, (id, emitters) -> {
            emitters.remove(emitter);
            return emitters.isEmpty() ? null : emitters;
        });
    }

    public void removeAll(Long userId) {
        emittersByUserId.remove(userId);
    }
}

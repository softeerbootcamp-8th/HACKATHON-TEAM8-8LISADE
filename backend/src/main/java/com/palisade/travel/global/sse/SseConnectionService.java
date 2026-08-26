package com.palisade.travel.global.sse;

import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class SseConnectionService {

    private static final long TIMEOUT_MILLIS = 30 * 60 * 1000L;
    private static final long HEARTBEAT_FIXED_RATE_MILLIS = 15 * 1000L;

    private final SseEmitterRepository emitterRepository;

    public SseEmitter connect(Long userId) {
        SseEmitter emitter = new SseEmitter(TIMEOUT_MILLIS);
        emitter.onCompletion(() -> emitterRepository.remove(userId, emitter));
        emitter.onTimeout(() -> emitterRepository.remove(userId, emitter));
        emitter.onError(throwable -> emitterRepository.remove(userId, emitter));
        emitterRepository.save(userId, emitter);

        sendTo(userId, emitter, SseEventType.CONNECTED, "connected");
        return emitter;
    }

    public void send(Long userId, SseEventType eventType, Object data) {
        for (SseEmitter emitter : emitterRepository.findAllByUserId(userId)) {
            sendTo(userId, emitter, eventType, data);
        }
    }

    public void disconnect(Long userId) {
        for (SseEmitter emitter : emitterRepository.findAllByUserId(userId)) {
            emitter.complete();
        }
        emitterRepository.removeAll(userId);
    }

    @Scheduled(fixedRate = HEARTBEAT_FIXED_RATE_MILLIS)
    public void sendHeartbeat() {
        for (Map.Entry<Long, List<SseEmitter>> entry : emitterRepository.snapshot().entrySet()) {
            Long userId = entry.getKey();
            for (SseEmitter emitter : entry.getValue()) {
                sendTo(userId, emitter, SseEventType.HEARTBEAT, "ping");
            }
        }
    }

    private void sendTo(Long userId, SseEmitter emitter, SseEventType eventType, Object data) {
        try {
            emitter.send(SseEmitter.event().name(eventType.name()).data(data));
        } catch (IOException exception) {
            emitterRepository.remove(userId, emitter);
        }
    }
}

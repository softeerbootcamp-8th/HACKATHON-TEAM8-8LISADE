package com.palisade.travel.domain.notification.service;

import com.palisade.travel.domain.notification.entity.Notification;
import com.palisade.travel.domain.notification.entity.NotificationType;
import com.palisade.travel.domain.notification.repository.NotificationRepository;
import com.palisade.travel.domain.trip.entity.Trip;
import com.palisade.travel.domain.trip.entity.TripStatus;
import com.palisade.travel.domain.trip.repository.TripRepository;
import com.palisade.travel.domain.user.entity.User;
import com.palisade.travel.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

/**
 * 위치 확인 불가(§6.1) 감지·발송. 위치 수신 시각을 기준으로 50초 동안 보고가 없으면
 * 담당 교사에게 한 번 알린다.
 *
 * <p>이탈 카운터와 마찬가지로 단일 인스턴스 인메모리 상태다. 다중 인스턴스 운영 시 공유 저장소로 교체한다.
 */
@Service
@RequiredArgsConstructor
public class UnreachableAlertService {

    static final Duration UNREACHABLE_AFTER = Duration.ofSeconds(50);

    private final TripRepository tripRepository;
    private final UserRepository userRepository;
    private final NotificationRepository notificationRepository;
    private final PushNotificationService pushNotificationService;
    private final Clock clock;

    private final ConcurrentMap<Long, State> states = new ConcurrentHashMap<>();

    /** 학생 위치 보고 수신 시 호출 — 미수신 시각과 알림 상태를 리셋한다. */
    public void markReported(Long userId, Long tripId) {
        states.compute(userId, (ignored, state) -> {
            State next = state != null ? state : new State();
            next.tripId = tripId;
            next.lastReportedAt = clock.instant();
            next.alerted = false;
            return next;
        });
    }

    /** 스케줄러 tick마다 호출 — 마지막 수신 후 50초 경과한 학생에게 알림을 발송한다. */
    @Transactional
    public void sweep() {
        Instant now = clock.instant();
        states.forEach((userId, state) -> {
            if (!state.alerted && !now.isBefore(state.lastReportedAt.plus(UNREACHABLE_AFTER))) {
                if (sendUnreachable(userId, state.tripId)) {
                    state.alerted = true;
                } else {
                    states.remove(userId); // 비활성/삭제된 Trip → 추적 중단
                }
            }
        });
    }

    /** @return 발송했으면 true, Trip이 비활성/부재라 발송하지 않았으면 false. */
    private boolean sendUnreachable(Long userId, Long tripId) {
        Trip trip = tripRepository.findById(tripId).orElse(null);
        if (trip == null || trip.getStatus() != TripStatus.ACTIVE) {
            return false;
        }
        String studentLabel = userRepository.findById(userId)
                .map(User::getName)
                .orElse("학생");
        String title = "위치 확인 불가 알림";
        String body = "%s의 위치를 50초 이상 확인하지 못했어요.".formatted(studentLabel);
        notificationRepository.save(Notification.create(
                trip.getTeacherId(),
                trip.getId(),
                null,
                NotificationType.UNREACHABLE,
                title,
                body
        ));
        pushNotificationService.sendToUser(trip.getTeacherId(), title, body);
        return true;
    }

    /** 테스트/운영 점검용 현재 추적 스냅샷 크기. */
    Map<Long, State> trackedStates() {
        return states;
    }

    static final class State {
        private Long tripId;
        private Instant lastReportedAt;
        private boolean alerted;
    }
}

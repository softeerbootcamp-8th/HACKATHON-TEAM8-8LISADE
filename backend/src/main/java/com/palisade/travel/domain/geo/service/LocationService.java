package com.palisade.travel.domain.geo.service;

import com.palisade.travel.domain.geo.dto.LocationUpdateRequest;
import com.palisade.travel.domain.geo.dto.LocationUpdateResponse;
import com.palisade.travel.domain.geo.dto.StudentLocationResponse;
import com.palisade.travel.domain.geo.entity.CurrentLocation;
import com.palisade.travel.domain.geo.entity.GeofencePoint;
import com.palisade.travel.domain.geo.entity.LocationLog;
import com.palisade.travel.domain.geo.exception.LocationErrorCode;
import com.palisade.travel.domain.geo.exception.LocationException;
import com.palisade.travel.domain.geo.repository.CurrentLocationRepository;
import com.palisade.travel.domain.geo.repository.GeofencePointRepository;
import com.palisade.travel.domain.geo.repository.LocationLogRepository;
import com.palisade.travel.domain.geo.util.GeofenceUtils;
import com.palisade.travel.domain.notification.entity.Notification;
import com.palisade.travel.domain.notification.entity.NotificationType;
import com.palisade.travel.domain.notification.repository.NotificationRepository;
import com.palisade.travel.domain.notification.service.PushNotificationService;
import com.palisade.travel.domain.notification.service.UnreachableAlertService;
import com.palisade.travel.domain.trip.entity.Trip;
import com.palisade.travel.domain.trip.entity.TripParticipant;
import com.palisade.travel.domain.trip.entity.TripStatus;
import com.palisade.travel.domain.trip.repository.TripParticipantRepository;
import com.palisade.travel.domain.trip.repository.TripRepository;
import com.palisade.travel.domain.user.entity.User;
import com.palisade.travel.domain.user.repository.UserRepository;
import com.palisade.travel.global.sse.SseConnectionService;
import com.palisade.travel.global.sse.SseEventType;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class LocationService {

    // 요구사항: 연속 외부 판정이 정확히 이 횟수에 도달하는 순간 담당 교사에게 이탈 알림을 1회 발행한다.
    private static final int DEPARTURE_ALERT_THRESHOLD = 12;
    // 50m보다 큰 오차 반경은 지오펜스 경계를 뒤집을 수 있어 위치만 갱신하고 이탈 판정에는 사용하지 않는다.
    private static final BigDecimal MAX_GEOFENCE_ACCURACY_METERS = new BigDecimal("50");

    private final TripParticipantRepository tripParticipantRepository;
    private final TripRepository tripRepository;
    private final GeofencePointRepository geofencePointRepository;
    private final CurrentLocationRepository currentLocationRepository;
    private final LocationLogRepository locationLogRepository;
    private final SseConnectionService sseConnectionService;
    private final UserRepository userRepository;
    private final PushNotificationService pushNotificationService;
    private final NotificationRepository notificationRepository;
    private final UnreachableAlertService unreachableAlertService;

    // ponytail: 요구사항의 단일 인스턴스 인메모리 카운터다. 다중 인스턴스가 필요해지면 Redis 원자 연산으로 교체한다.
    private final ConcurrentMap<Long, Integer> consecutiveOutsideCounts = new ConcurrentHashMap<>();

    @Transactional
    public LocationUpdateResponse update(Long userId, LocationUpdateRequest request) {
        TripParticipant participant = tripParticipantRepository.findFirstByUserIdOrderByCreatedAtDescIdDesc(userId)
                .orElseThrow(() -> new LocationException(LocationErrorCode.PARTICIPATING_TRIP_NOT_FOUND));
        Trip trip = tripRepository.findById(participant.getTripId())
                .orElseThrow(() -> new LocationException(LocationErrorCode.TRIP_NOT_FOUND));

        if (trip.getStatus() != TripStatus.ACTIVE) {
            consecutiveOutsideCounts.remove(userId);
            throw new LocationException(LocationErrorCode.TRIP_INACTIVE);
        }

        LocalDateTime recordedAt = LocalDateTime.ofInstant(request.recordedAt(), ZoneOffset.UTC);
        CurrentLocation currentLocation = currentLocationRepository.findByUserIdAndTripId(userId, trip.getId())
                .orElse(null);

        if (currentLocation != null && !recordedAt.isAfter(currentLocation.getUpdatedAt())) {
            return response(trip.getId(), userId, currentLocation.isOutside());
        }

        boolean accurateEnough = request.accuracy() != null
                && request.accuracy().compareTo(MAX_GEOFENCE_ACCURACY_METERS) <= 0;
        boolean outside;
        if (accurateEnough) {
            List<GeofencePoint> geofencePoints = findGeofencePoints(trip);
            outside = !GeofenceUtils.contains(geofencePoints, request.latitude(), request.longitude());
        } else {
            outside = currentLocation != null && currentLocation.isOutside();
        }

        if (currentLocation == null) {
            currentLocation = CurrentLocation.create(
                        userId,
                        trip.getId(),
                        request.latitude(),
                        request.longitude(),
                        outside,
                        recordedAt
                );
        } else if (accurateEnough) {
            currentLocation.update(request.latitude(), request.longitude(), outside, recordedAt);
        } else {
            currentLocation.updatePosition(request.latitude(), request.longitude(), recordedAt);
        }
        currentLocationRepository.save(currentLocation);

        // 위치 보고 수신 기록 — 확인 불가(미수신 지속) 감지 카운터 리셋. (§6.1)
        unreachableAlertService.markReported(userId, trip.getId());

        sseConnectionService.send(
                trip.getTeacherId(),
                SseEventType.LOCATION_UPDATED,
                StudentLocationResponse.from(currentLocation)
        );

        if (!accurateEnough) {
            return response(trip.getId(), userId, currentLocation.isOutside());
        }

        int consecutiveOutsideCount = consecutiveOutsideCounts.compute(
                userId,
                (ignored, count) -> outside ? count == null ? 1 : count + 1 : 0
        );
        if (outside) {
            locationLogRepository.save(LocationLog.create(
                    trip.getId(),
                    userId,
                    request.latitude(),
                    request.longitude(),
                    recordedAt
            ));
        }

        if (consecutiveOutsideCount == DEPARTURE_ALERT_THRESHOLD) {
            sendDepartureAlert(trip, userId);
        }

        return new LocationUpdateResponse(trip.getId(), outside, consecutiveOutsideCount);
    }

    private LocationUpdateResponse response(Long tripId, Long userId, boolean outside) {
        return new LocationUpdateResponse(tripId, outside, consecutiveOutsideCounts.getOrDefault(userId, 0));
    }

    private void sendDepartureAlert(Trip trip, Long studentId) {
        String studentLabel = userRepository.findById(studentId)
                .map(User::getName)
                .map("%s 학생"::formatted)
                .orElse("학생");
        String teacherTitle = "안전 구역 이탈 알림";
        String teacherBody = "%s이 안전 구역을 벗어났습니다.".formatted(studentLabel);

        notificationRepository.save(Notification.create(
                trip.getTeacherId(),
                trip.getId(),
                null,
                NotificationType.RANGE_EXIT,
                teacherTitle,
                teacherBody
        ));
        pushNotificationService.sendToUser(trip.getTeacherId(), teacherTitle, teacherBody);

        // 학생 알림(§6.2) — 이탈 판정 시 학생 본인에게도 1회 발송한다.
        String studentTitle = "안전 구역 이탈 알림";
        String studentBody = "안전 구역을 벗어났어요. 안전한 곳으로 돌아와 주세요.";
        notificationRepository.save(Notification.create(
                studentId,
                trip.getId(),
                null,
                NotificationType.RANGE_EXIT,
                studentTitle,
                studentBody
        ));
        pushNotificationService.sendToUser(studentId, studentTitle, studentBody);
    }

    private List<GeofencePoint> findGeofencePoints(Trip trip) {
        if (trip.getGeofenceId() == null) {
            throw new LocationException(LocationErrorCode.GEOFENCE_NOT_CONFIGURED);
        }

        List<GeofencePoint> points = geofencePointRepository
                .findAllByGeofenceIdOrderBySequenceAsc(trip.getGeofenceId());
        if (points.size() < 3) {
            throw new LocationException(LocationErrorCode.GEOFENCE_NOT_CONFIGURED);
        }
        return points;
    }
}

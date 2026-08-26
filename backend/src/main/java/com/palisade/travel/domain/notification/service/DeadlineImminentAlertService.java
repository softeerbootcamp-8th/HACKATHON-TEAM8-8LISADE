package com.palisade.travel.domain.notification.service;

import com.palisade.travel.domain.mission.entity.Mission;
import com.palisade.travel.domain.mission.entity.MissionType;
import com.palisade.travel.domain.mission.entity.MissionSubmission;
import com.palisade.travel.domain.mission.entity.SubmissionStatus;
import com.palisade.travel.domain.mission.repository.MissionRepository;
import com.palisade.travel.domain.mission.repository.MissionSubmissionRepository;
import com.palisade.travel.domain.notification.entity.Notification;
import com.palisade.travel.domain.notification.entity.NotificationType;
import com.palisade.travel.domain.notification.repository.NotificationRepository;
import com.palisade.travel.domain.trip.entity.Trip;
import com.palisade.travel.domain.trip.entity.TripParticipant;
import com.palisade.travel.domain.trip.repository.TripParticipantRepository;
import com.palisade.travel.domain.trip.repository.TripRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 마감 임박(§6.2) — 활동(ACTIVITY) 미션 마감 5분 전, 그 시점까지 미완료인 학생에게만
 * 미션당 1회 발송한다. 출석체크(CHECK)는 마감이 없어 대상이 아니다.
 */
@Service
@RequiredArgsConstructor
public class DeadlineImminentAlertService {

    private static final int LEAD_MINUTES = 5;

    private final MissionRepository missionRepository;
    private final MissionSubmissionRepository submissionRepository;
    private final TripParticipantRepository participantRepository;
    private final TripRepository tripRepository;
    private final NotificationRepository notificationRepository;
    private final PushNotificationService pushNotificationService;

    /** 마감이 5분 이내로 남은 활동 미션 중 아직 미발송인 건에 대해 미완료 학생에게만 발송한다. */
    @Transactional
    public void notifyUpcomingDeadlines(LocalDateTime now) {
        LocalDateTime deadline = now.plusMinutes(LEAD_MINUTES);
        for (Mission mission : missionRepository.findByTypeAndEndAtIsNotNullAndEndAtBetween(MissionType.ACTIVITY, now, deadline)) {
            notifyIncomplete(mission);
        }
    }

    private void notifyIncomplete(Mission mission) {
        if (notificationRepository.existsByMissionIdAndType(mission.getId(), NotificationType.DEADLINE_IMMINENT)) {
            return; // 미션당 1회
        }
        List<Long> incompleteStudentIds = incompleteStudentIds(mission);
        if (incompleteStudentIds.isEmpty()) {
            return;
        }
        Trip trip = tripRepository.findById(mission.getTripId()).orElse(null);
        if (trip == null) {
            return;
        }

        String title = "마감 임박 알림";
        String body = "'%s' 미션 마감이 5분 남았어요. 서둘러 제출해 주세요.".formatted(mission.getTitle());
        for (Long studentId : incompleteStudentIds) {
            notificationRepository.save(Notification.create(
                    studentId,
                    trip.getId(),
                    mission.getId(),
                    NotificationType.DEADLINE_IMMINENT,
                    title,
                    body
            ));
            pushNotificationService.sendToUser(studentId, title, body);
        }
    }

    /** 미완료 = (앱 참가 학생 수) − (COMPLETED 제출 학생 수). */
    private List<Long> incompleteStudentIds(Mission mission) {
        Set<Long> rosterUserIds = participantRepository.findAllByTripIdOrderByCreatedAtAsc(mission.getTripId()).stream()
                .map(TripParticipant::getUserId)
                .filter(userId -> userId != null)
                .collect(Collectors.toSet());
        if (rosterUserIds.isEmpty()) {
            return List.of();
        }
        Set<Long> completedUserIds = submissionRepository.findByMissionId(mission.getId()).stream()
                .filter(submission -> submission.getStatus() == SubmissionStatus.COMPLETED)
                .map(MissionSubmission::getUserId)
                .collect(Collectors.toSet());
        return rosterUserIds.stream().filter(userId -> !completedUserIds.contains(userId)).toList();
    }
}

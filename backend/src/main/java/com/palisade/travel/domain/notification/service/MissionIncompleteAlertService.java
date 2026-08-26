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
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 미션 마감(§6.1) 시 미완료 학생이 있으면 담당 교사에게 미션당 1회 요약 알림을 발송한다.
 * 활동(ACTIVITY) 미션만 대상이며, 출석체크(CHECK)는 마감이 없어 발송하지 않는다.
 */
@Service
@RequiredArgsConstructor
public class MissionIncompleteAlertService {

    private final MissionRepository missionRepository;
    private final MissionSubmissionRepository submissionRepository;
    private final TripParticipantRepository participantRepository;
    private final TripRepository tripRepository;
    private final NotificationRepository notificationRepository;
    private final PushNotificationService pushNotificationService;

    /** 마감이 지난 활동 미션 중 미완료 인원이 있고 아직 미발송인 건에 대해 요약 알림을 발송한다. */
    @Transactional
    public void notifyOverdueMissions(LocalDateTime now) {
        for (Mission mission : missionRepository.findByTypeAndEndAtIsNotNullAndEndAtBefore(MissionType.ACTIVITY, now)) {
            notifyIfIncomplete(mission);
        }
    }

    private void notifyIfIncomplete(Mission mission) {
        if (notificationRepository.existsByMissionIdAndType(mission.getId(), NotificationType.MISSION_INCOMPLETED)) {
            return; // 미션당 1회
        }
        long incompleteCount = countIncomplete(mission);
        if (incompleteCount <= 0) {
            return;
        }
        Trip trip = tripRepository.findById(mission.getTripId()).orElse(null);
        if (trip == null) {
            return;
        }

        String title = "미션 미완료 알림";
        String body = "'%s' 미션을 %d명이 완료하지 못했어요.".formatted(mission.getTitle(), incompleteCount);
        notificationRepository.save(Notification.create(
                trip.getTeacherId(),
                trip.getId(),
                mission.getId(),
                NotificationType.MISSION_INCOMPLETED,
                title,
                body
        ));
        pushNotificationService.sendToUser(trip.getTeacherId(), title, body);
    }

    /**
     * 미완료 = (앱 참가 학생 수) − (COMPLETED 제출 학생 수). 이 알림은 "마감까지 제출했는지"를
     * 교사에게 알려주는 것이 목적이라, 정의상 마감을 넘겨 낸 LATE 제출은 완료로 치지 않고
     * 그대로 미완료(마감 미준수)로 집계한다(§163).
     */
    private long countIncomplete(Mission mission) {
        Set<Long> rosterUserIds = participantRepository.findAllByTripIdOrderByCreatedAtAsc(mission.getTripId()).stream()
                .map(TripParticipant::getUserId)
                .filter(userId -> userId != null)
                .collect(Collectors.toSet());
        if (rosterUserIds.isEmpty()) {
            return 0;
        }
        Set<Long> completedUserIds = submissionRepository.findByMissionId(mission.getId()).stream()
                .filter(submission -> submission.getStatus() == SubmissionStatus.COMPLETED)
                .map(MissionSubmission::getUserId)
                .collect(Collectors.toSet());
        return rosterUserIds.stream().filter(userId -> !completedUserIds.contains(userId)).count();
    }
}

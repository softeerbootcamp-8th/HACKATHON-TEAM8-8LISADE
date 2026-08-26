package com.palisade.travel.domain.notification.service;

import com.palisade.travel.domain.mission.entity.Mission;
import com.palisade.travel.domain.mission.entity.MissionSubmission;
import com.palisade.travel.domain.mission.entity.MissionType;
import com.palisade.travel.domain.mission.repository.MissionRepository;
import com.palisade.travel.domain.mission.repository.MissionSubmissionRepository;
import com.palisade.travel.domain.notification.entity.Notification;
import com.palisade.travel.domain.notification.entity.NotificationType;
import com.palisade.travel.domain.notification.repository.NotificationRepository;
import com.palisade.travel.domain.trip.entity.Trip;
import com.palisade.travel.domain.trip.entity.TripParticipant;
import com.palisade.travel.domain.trip.entity.TripStatus;
import com.palisade.travel.domain.trip.repository.TripParticipantRepository;
import com.palisade.travel.domain.trip.repository.TripRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.never;

@ExtendWith(MockitoExtension.class)
class MissionIncompleteAlertServiceTest {

    private static final Long TRIP_ID = 10L;
    private static final Long MISSION_ID = 5L;
    private static final Long TEACHER_ID = 99L;
    private static final LocalDateTime NOW = LocalDateTime.of(2026, 8, 26, 10, 0);

    @Mock
    private MissionRepository missionRepository;
    @Mock
    private MissionSubmissionRepository submissionRepository;
    @Mock
    private TripParticipantRepository participantRepository;
    @Mock
    private TripRepository tripRepository;
    @Mock
    private NotificationRepository notificationRepository;
    @Mock
    private PushNotificationService pushNotificationService;

    @InjectMocks
    private MissionIncompleteAlertService service;

    @Test
    void 마감된_활동미션에_미완료가_있으면_담당_교사에게_요약_알림을_저장하고_push한다() {
        // given
        given(missionRepository.findByTypeAndEndAtIsNotNullAndEndAtBefore(MissionType.ACTIVITY, NOW))
                .willReturn(List.of(mission("어디서 사진 찍기")));
        given(notificationRepository.existsByMissionIdAndType(MISSION_ID, NotificationType.MISSION_INCOMPLETED))
                .willReturn(false);
        given(participantRepository.findAllByTripIdOrderByCreatedAtAsc(TRIP_ID))
                .willReturn(List.of(participant(1L), participant(2L), participant(3L)));
        given(submissionRepository.findByMissionId(MISSION_ID))
                .willReturn(List.of(MissionSubmission.photo(MISSION_ID, 1L, "k")));
        given(tripRepository.findById(TRIP_ID)).willReturn(Optional.of(trip()));
        ArgumentCaptor<Notification> captor = ArgumentCaptor.forClass(Notification.class);

        // when
        service.notifyOverdueMissions(NOW);

        // then
        then(notificationRepository).should().save(captor.capture());
        Notification saved = captor.getValue();
        assertThat(saved.getUserId()).isEqualTo(TEACHER_ID);
        assertThat(saved.getTripId()).isEqualTo(TRIP_ID);
        assertThat(saved.getMissionId()).isEqualTo(MISSION_ID);
        assertThat(saved.getType()).isEqualTo(NotificationType.MISSION_INCOMPLETED);
        assertThat(saved.getMessage()).contains("어디서 사진 찍기").contains("2명");
        then(pushNotificationService).should().sendToUser(eq(TEACHER_ID), any(), any());
    }

    @Test
    void 이미_미완료_알림이_발송된_미션은_다시_발송하지_않는다() {
        // given
        given(missionRepository.findByTypeAndEndAtIsNotNullAndEndAtBefore(MissionType.ACTIVITY, NOW))
                .willReturn(List.of(mission("어디서 사진 찍기")));
        given(notificationRepository.existsByMissionIdAndType(MISSION_ID, NotificationType.MISSION_INCOMPLETED))
                .willReturn(true);

        // when
        service.notifyOverdueMissions(NOW);

        // then
        then(notificationRepository).should(never()).save(any());
        then(pushNotificationService).should(never()).sendToUser(any(), any(), any());
    }

    @Test
    void 전원_완료한_미션은_알림을_발송하지_않는다() {
        // given
        given(missionRepository.findByTypeAndEndAtIsNotNullAndEndAtBefore(MissionType.ACTIVITY, NOW))
                .willReturn(List.of(mission("어디서 사진 찍기")));
        given(notificationRepository.existsByMissionIdAndType(MISSION_ID, NotificationType.MISSION_INCOMPLETED))
                .willReturn(false);
        given(participantRepository.findAllByTripIdOrderByCreatedAtAsc(TRIP_ID))
                .willReturn(List.of(participant(1L), participant(2L)));
        given(submissionRepository.findByMissionId(MISSION_ID))
                .willReturn(List.of(MissionSubmission.photo(MISSION_ID, 1L, "k"), MissionSubmission.photo(MISSION_ID, 2L, "k")));

        // when
        service.notifyOverdueMissions(NOW);

        // then
        then(notificationRepository).should(never()).save(any());
        then(pushNotificationService).should(never()).sendToUser(any(), any(), any());
    }

    @Test
    void 지각_제출은_마감을_지키지_못한_것이므로_여전히_미완료로_집계한다() {
        // given — 1L은 마감 전 제출(COMPLETED), 2L은 마감을 넘겨 제출(LATE)
        given(missionRepository.findByTypeAndEndAtIsNotNullAndEndAtBefore(MissionType.ACTIVITY, NOW))
                .willReturn(List.of(mission("어디서 사진 찍기")));
        given(notificationRepository.existsByMissionIdAndType(MISSION_ID, NotificationType.MISSION_INCOMPLETED))
                .willReturn(false);
        given(participantRepository.findAllByTripIdOrderByCreatedAtAsc(TRIP_ID))
                .willReturn(List.of(participant(1L), participant(2L)));
        given(submissionRepository.findByMissionId(MISSION_ID))
                .willReturn(List.of(MissionSubmission.photo(MISSION_ID, 1L, "k", false), MissionSubmission.photo(MISSION_ID, 2L, "k", true)));
        given(tripRepository.findById(TRIP_ID)).willReturn(Optional.of(trip()));
        ArgumentCaptor<Notification> captor = ArgumentCaptor.forClass(Notification.class);

        // when
        service.notifyOverdueMissions(NOW);

        // then — 지각한 2L도 미완료로 집계되어 1명 미완료 알림이 나간다
        then(notificationRepository).should().save(captor.capture());
        assertThat(captor.getValue().getMessage()).contains("1명");
    }

    private Mission mission(String title) {
        Mission mission = Mission.create(TRIP_ID, title, "", MissionType.ACTIVITY, NOW.minusHours(1), NOW.minusMinutes(1));
        ReflectionTestUtils.setField(mission, "id", MISSION_ID);
        return mission;
    }

    private Trip trip() {
        Trip trip = Trip.create(TEACHER_ID, null, "현장학습", "장소", "", NOW.minusHours(2), NOW.plusHours(2), TripStatus.ACTIVE);
        ReflectionTestUtils.setField(trip, "id", TRIP_ID);
        return trip;
    }

    private TripParticipant participant(Long userId) {
        return TripParticipant.create(TRIP_ID, userId);
    }
}

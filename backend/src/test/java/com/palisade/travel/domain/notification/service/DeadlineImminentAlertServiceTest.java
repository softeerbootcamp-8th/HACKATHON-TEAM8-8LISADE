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
import static org.mockito.Mockito.times;

@ExtendWith(MockitoExtension.class)
class DeadlineImminentAlertServiceTest {

    private static final Long TRIP_ID = 10L;
    private static final Long MISSION_ID = 5L;
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
    private DeadlineImminentAlertService service;

    @Test
    void 마감_5분_전_활동미션에_미완료_학생이_있으면_그_학생들에게만_알림을_저장하고_push한다() {
        // given
        given(missionRepository.findByTypeAndEndAtIsNotNullAndEndAtBetween(MissionType.ACTIVITY, NOW, NOW.plusMinutes(5)))
                .willReturn(List.of(mission("어디서 사진 찍기")));
        given(notificationRepository.existsByMissionIdAndType(MISSION_ID, NotificationType.DEADLINE_IMMINENT))
                .willReturn(false);
        given(participantRepository.findAllByTripIdOrderByCreatedAtAsc(TRIP_ID))
                .willReturn(List.of(participant(1L), participant(2L), participant(3L)));
        given(submissionRepository.findByMissionId(MISSION_ID))
                .willReturn(List.of(MissionSubmission.photo(MISSION_ID, 1L, "k")));
        given(tripRepository.findById(TRIP_ID)).willReturn(Optional.of(trip()));
        ArgumentCaptor<Notification> captor = ArgumentCaptor.forClass(Notification.class);

        // when
        service.notifyUpcomingDeadlines(NOW);

        // then — 완료한 1L은 제외, 미완료 2L/3L에게만 발송
        then(notificationRepository).should(times(2)).save(captor.capture());
        List<Notification> saved = captor.getAllValues();
        assertThat(saved).extracting(Notification::getUserId).containsExactlyInAnyOrder(2L, 3L);
        assertThat(saved).allSatisfy(notification -> {
            assertThat(notification.getTripId()).isEqualTo(TRIP_ID);
            assertThat(notification.getMissionId()).isEqualTo(MISSION_ID);
            assertThat(notification.getType()).isEqualTo(NotificationType.DEADLINE_IMMINENT);
            assertThat(notification.getMessage()).contains("어디서 사진 찍기");
        });
        then(pushNotificationService).should().sendToUser(eq(2L), any(), any());
        then(pushNotificationService).should().sendToUser(eq(3L), any(), any());
    }

    @Test
    void 이미_마감_임박_알림이_발송된_미션은_다시_발송하지_않는다() {
        // given
        given(missionRepository.findByTypeAndEndAtIsNotNullAndEndAtBetween(MissionType.ACTIVITY, NOW, NOW.plusMinutes(5)))
                .willReturn(List.of(mission("어디서 사진 찍기")));
        given(notificationRepository.existsByMissionIdAndType(MISSION_ID, NotificationType.DEADLINE_IMMINENT))
                .willReturn(true);

        // when
        service.notifyUpcomingDeadlines(NOW);

        // then
        then(notificationRepository).should(never()).save(any());
        then(pushNotificationService).should(never()).sendToUser(any(), any(), any());
    }

    @Test
    void 전원_완료한_미션은_알림을_발송하지_않는다() {
        // given
        given(missionRepository.findByTypeAndEndAtIsNotNullAndEndAtBetween(MissionType.ACTIVITY, NOW, NOW.plusMinutes(5)))
                .willReturn(List.of(mission("어디서 사진 찍기")));
        given(notificationRepository.existsByMissionIdAndType(MISSION_ID, NotificationType.DEADLINE_IMMINENT))
                .willReturn(false);
        given(participantRepository.findAllByTripIdOrderByCreatedAtAsc(TRIP_ID))
                .willReturn(List.of(participant(1L), participant(2L)));
        given(submissionRepository.findByMissionId(MISSION_ID))
                .willReturn(List.of(MissionSubmission.photo(MISSION_ID, 1L, "k"), MissionSubmission.photo(MISSION_ID, 2L, "k")));

        // when
        service.notifyUpcomingDeadlines(NOW);

        // then
        then(notificationRepository).should(never()).save(any());
        then(pushNotificationService).should(never()).sendToUser(any(), any(), any());
    }

    private Mission mission(String title) {
        Mission mission = Mission.create(TRIP_ID, title, "", MissionType.ACTIVITY, NOW.minusHours(1), NOW.plusMinutes(3));
        ReflectionTestUtils.setField(mission, "id", MISSION_ID);
        return mission;
    }

    private Trip trip() {
        Trip trip = Trip.create(99L, null, "현장학습", "장소", "", NOW.minusHours(2), NOW.plusHours(2), TripStatus.ACTIVE);
        ReflectionTestUtils.setField(trip, "id", TRIP_ID);
        return trip;
    }

    private TripParticipant participant(Long userId) {
        return TripParticipant.create(TRIP_ID, userId);
    }
}

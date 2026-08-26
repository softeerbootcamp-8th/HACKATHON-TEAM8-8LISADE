package com.palisade.travel.domain.notification.service;

import com.palisade.travel.domain.notification.entity.Notification;
import com.palisade.travel.domain.notification.entity.NotificationType;
import com.palisade.travel.domain.notification.repository.NotificationRepository;
import com.palisade.travel.domain.trip.entity.Trip;
import com.palisade.travel.domain.trip.entity.TripStatus;
import com.palisade.travel.domain.trip.repository.TripRepository;
import com.palisade.travel.domain.user.entity.User;
import com.palisade.travel.domain.user.entity.UserRole;
import com.palisade.travel.domain.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;

@ExtendWith(MockitoExtension.class)
class UnreachableAlertServiceTest {

    private static final Long STUDENT_ID = 1L;
    private static final Long TRIP_ID = 10L;
    private static final Long TEACHER_ID = 99L;

    @Mock
    private TripRepository tripRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private NotificationRepository notificationRepository;
    @Mock
    private PushNotificationService pushNotificationService;

    @InjectMocks
    private UnreachableAlertService service;

    /** markReported 직후엔 첫 sweep이 리셋을 소비하므로, 임계 도달까지 필요한 sweep 횟수. */
    private void sweepUntilAlert() {
        for (int i = 0; i <= UnreachableAlertService.UNREACHABLE_THRESHOLD; i++) {
            service.sweep();
        }
    }

    @Test
    void 위치_미수신이_임계_이상_지속되면_담당_교사에게_확인불가_알림을_1회_발송한다() {
        // given
        given(tripRepository.findById(TRIP_ID)).willReturn(Optional.of(activeTrip()));
        given(userRepository.findById(STUDENT_ID)).willReturn(Optional.of(student("박서준")));
        service.markReported(STUDENT_ID, TRIP_ID);
        ArgumentCaptor<Notification> captor = ArgumentCaptor.forClass(Notification.class);

        // when — 보고 없이 여러 tick 경과 후에도 추가 tick
        sweepUntilAlert();
        service.sweep();
        service.sweep();

        // then — 정확히 1회만 발송
        then(notificationRepository).should(times(1)).save(captor.capture());
        Notification saved = captor.getValue();
        assertThat(saved.getUserId()).isEqualTo(TEACHER_ID);
        assertThat(saved.getType()).isEqualTo(NotificationType.UNREACHABLE);
        assertThat(saved.getMessage()).contains("박서준");
        then(pushNotificationService).should(times(1)).sendToUser(eq(TEACHER_ID), any(), any());
    }

    @Test
    void 보고가_계속_들어오면_확인불가_알림을_발송하지_않는다() {
        // given / when — 매 tick 전에 보고가 들어옴
        for (int i = 0; i <= UnreachableAlertService.UNREACHABLE_THRESHOLD + 2; i++) {
            service.markReported(STUDENT_ID, TRIP_ID);
            service.sweep();
        }

        // then
        then(notificationRepository).should(never()).save(any());
        then(pushNotificationService).should(never()).sendToUser(any(), any(), any());
    }

    @Test
    void 보고_재개_후_다시_미수신이_지속되면_재발송한다() {
        // given
        given(tripRepository.findById(TRIP_ID)).willReturn(Optional.of(activeTrip()));
        given(userRepository.findById(STUDENT_ID)).willReturn(Optional.of(student("박서준")));

        // when — 1차 미수신 알림
        service.markReported(STUDENT_ID, TRIP_ID);
        sweepUntilAlert();
        // 보고 재개 → 리셋
        service.markReported(STUDENT_ID, TRIP_ID);
        // 2차 미수신 알림
        sweepUntilAlert();

        // then — 2회 발송
        then(notificationRepository).should(times(2)).save(any());
        then(pushNotificationService).should(times(2)).sendToUser(eq(TEACHER_ID), any(), any());
    }

    @Test
    void 비활성_Trip_학생은_발송하지_않고_추적을_중단한다() {
        // given
        given(tripRepository.findById(TRIP_ID)).willReturn(Optional.of(finishedTrip()));
        service.markReported(STUDENT_ID, TRIP_ID);

        // when
        sweepUntilAlert();
        service.sweep();
        service.sweep();

        // then — 발송 없음, 추적 상태 제거
        then(notificationRepository).should(never()).save(any());
        assertThat(service.trackedStates()).doesNotContainKey(STUDENT_ID);
    }

    private Trip activeTrip() {
        return trip(TripStatus.ACTIVE);
    }

    private Trip finishedTrip() {
        return trip(TripStatus.FINISHED);
    }

    private Trip trip(TripStatus status) {
        Trip trip = Trip.create(TEACHER_ID, null, "현장학습", "장소", "", LocalDateTime.now(), LocalDateTime.now(), status);
        ReflectionTestUtils.setField(trip, "id", TRIP_ID);
        return trip;
    }

    private User student(String name) {
        return new User(STUDENT_ID, "student01", "hash", null, name, UserRole.STUDENT, null, null, null, true, LocalDateTime.now());
    }
}

package com.palisade.travel.domain.notification.service;

import com.palisade.travel.domain.notification.dto.NotificationResponse;
import com.palisade.travel.domain.notification.entity.Notification;
import com.palisade.travel.domain.notification.entity.NotificationType;
import com.palisade.travel.domain.notification.repository.NotificationRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;

@ExtendWith(MockitoExtension.class)
class NotificationQueryServiceTest {

    private static final Long TEACHER_ID = 99L;

    @Mock
    private NotificationRepository notificationRepository;

    @InjectMocks
    private NotificationQueryService notificationQueryService;

    @Test
    void 인증_사용자의_알림을_최신순_그대로_유형_무관하게_반환한다() {
        // given
        given(notificationRepository.findAllByUserIdOrderByCreatedAtDesc(TEACHER_ID)).willReturn(List.of(
                notification(2L, NotificationType.RANGE_EXIT, "안전 구역 이탈 알림", "김하늘 학생이 안전 구역을 벗어났습니다.", LocalDateTime.of(2026, 8, 25, 14, 3)),
                notification(1L, NotificationType.MISSION_INCOMPLETED, "미션 미완료 알림", "'어디서 사진 찍기' 미션을 3명이 완료하지 못했어요.", LocalDateTime.of(2026, 8, 25, 13, 12))
        ));

        // when
        List<NotificationResponse> result = notificationQueryService.list(TEACHER_ID);

        // then
        assertThat(result).hasSize(2);
        assertThat(result.get(0).type()).isEqualTo(NotificationType.RANGE_EXIT);
        assertThat(result.get(0).message()).contains("김하늘");
        assertThat(result.get(1).type()).isEqualTo(NotificationType.MISSION_INCOMPLETED);
        then(notificationRepository).should().findAllByUserIdOrderByCreatedAtDesc(TEACHER_ID);
    }

    @Test
    void 알림이_없으면_빈_목록을_반환한다() {
        // given
        given(notificationRepository.findAllByUserIdOrderByCreatedAtDesc(TEACHER_ID)).willReturn(List.of());

        // when & then
        assertThat(notificationQueryService.list(TEACHER_ID)).isEmpty();
    }

    private Notification notification(Long id, NotificationType type, String title, String message, LocalDateTime createdAt) {
        return new Notification(id, TEACHER_ID, 10L, null, type, title, message, createdAt);
    }
}

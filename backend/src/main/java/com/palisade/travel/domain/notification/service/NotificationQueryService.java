package com.palisade.travel.domain.notification.service;

import com.palisade.travel.domain.notification.dto.NotificationResponse;
import com.palisade.travel.domain.notification.repository.NotificationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional(readOnly = true)
public class NotificationQueryService {

    private final NotificationRepository notificationRepository;

    public NotificationQueryService(NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    /** 인증 사용자에게 온 모든 알림을 최신순으로 반환한다(유형 무관). */
    public List<NotificationResponse> list(Long userId) {
        return notificationRepository.findAllByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(NotificationResponse::from)
                .toList();
    }
}

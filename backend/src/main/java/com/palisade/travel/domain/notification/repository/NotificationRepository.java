package com.palisade.travel.domain.notification.repository;

import com.palisade.travel.domain.notification.entity.Notification;
import com.palisade.travel.domain.notification.entity.NotificationType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    List<Notification> findAllByUserIdOrderByCreatedAtDesc(Long userId);

    /** 같은 미션에 특정 유형 알림이 이미 발송됐는지 — 미완료 마감 알림 중복 방지용. */
    boolean existsByMissionIdAndType(Long missionId, NotificationType type);
}

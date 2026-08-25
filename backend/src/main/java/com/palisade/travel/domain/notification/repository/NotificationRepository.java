package com.palisade.travel.domain.notification.repository;

import com.palisade.travel.domain.notification.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
}

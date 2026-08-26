package com.palisade.travel.domain.notification.dto;

import com.palisade.travel.domain.notification.entity.Notification;
import com.palisade.travel.domain.notification.entity.NotificationType;

import java.time.LocalDateTime;

public record NotificationResponse(
        Long id,
        NotificationType type,
        Long tripId,
        Long missionId,
        String title,
        String message,
        LocalDateTime createdAt
) {

    public static NotificationResponse from(Notification notification) {
        return new NotificationResponse(
                notification.getId(),
                notification.getType(),
                notification.getTripId(),
                notification.getMissionId(),
                notification.getTitle(),
                notification.getMessage(),
                notification.getCreatedAt()
        );
    }
}

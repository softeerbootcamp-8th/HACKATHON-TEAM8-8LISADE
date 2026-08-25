package com.palisade.travel.domain.notification.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;

import java.time.LocalDateTime;

@Entity
@Getter
@Table(name = "notification")
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long userId;

    @Column
    private Long tripId;

    @Column
    private Long missionId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private NotificationType type;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false, length = 1000)
    private String message;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    protected Notification() {
    }

    public Notification(Long id, Long userId, Long tripId, Long missionId, NotificationType type,
                        String title, String message, LocalDateTime createdAt) {
        this.id = id;
        this.userId = userId;
        this.tripId = tripId;
        this.missionId = missionId;
        this.type = type;
        this.title = title;
        this.message = message;
        this.createdAt = createdAt;
    }

    public static Notification create(Long userId, Long tripId, Long missionId, NotificationType type,
                                      String title, String message) {
        return new Notification(null, userId, tripId, missionId, type, title, message, LocalDateTime.now());
    }

}

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
@Table(name = "device")
public class Device {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long userId;

    @Column(nullable = false, length = 512)
    private String fcmToken;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private DevicePlatform platform;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    protected Device() {
    }

    public Device(Long id, Long userId, String fcmToken, DevicePlatform platform, LocalDateTime updatedAt) {
        this.id = id;
        this.userId = userId;
        this.fcmToken = fcmToken;
        this.platform = platform;
        this.updatedAt = updatedAt;
    }

    public static Device create(Long userId, String fcmToken, DevicePlatform platform) {
        return new Device(null, userId, fcmToken, platform, LocalDateTime.now());
    }

}

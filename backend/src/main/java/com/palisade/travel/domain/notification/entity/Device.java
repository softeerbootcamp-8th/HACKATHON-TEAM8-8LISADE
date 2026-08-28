package com.palisade.travel.domain.notification.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Getter
@Table(name = "device")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
public class Device {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "fcm_token", nullable = false, unique = true, length = 512)
    private String fcmToken;

    @Enumerated(EnumType.STRING)
    @Column(name = "platform", nullable = false, length = 20)
    private DevicePlatform platform;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public static Device create(Long userId, String fcmToken, DevicePlatform platform) {
        return new Device(null, userId, fcmToken, platform, LocalDateTime.now());
    }

    public void reassignTo(Long userId, DevicePlatform platform) {
        this.userId = userId;
        this.platform = platform;
        this.updatedAt = LocalDateTime.now();
    }

}

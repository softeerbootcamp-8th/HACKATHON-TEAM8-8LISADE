package com.palisade.travel.domain.mission.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Getter
@Table(name = "mission")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
public class Mission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "trip_id", nullable = false)
    private Long tripId;

    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 20)
    private MissionType type;

    @Column(name = "attendance_pin", length = 4)
    private String attendancePin;

    @Column(name = "start_at")
    private LocalDateTime startAt;

    @Column(name = "end_at")
    private LocalDateTime endAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public static Mission create(Long tripId, String title, String description, MissionType type,
                                 LocalDateTime startAt, LocalDateTime endAt) {
        return new Mission(null, tripId, title, description, type, null, startAt, endAt, LocalDateTime.now());
    }

    public static Mission createCheck(Long tripId, String title, String description,
                                      LocalDateTime startAt, LocalDateTime endAt, String pin) {
        return new Mission(null, tripId, title, description, MissionType.CHECK, pin, startAt, endAt, LocalDateTime.now());
    }

    public boolean isAccessibleAt(LocalDateTime now) { return startAt == null || !startAt.isAfter(now); }
    public boolean isExpiredAt(LocalDateTime now) { return endAt != null && now.isAfter(endAt); }
    public boolean matchesPin(String pin) { return attendancePin != null && attendancePin.equals(pin); }
    public void change(String title, String description, LocalDateTime startAt, LocalDateTime endAt) {
        this.title = title; this.description = description; this.startAt = startAt; this.endAt = endAt;
    }

}

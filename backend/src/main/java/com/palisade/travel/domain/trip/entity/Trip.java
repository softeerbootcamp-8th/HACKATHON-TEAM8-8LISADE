package com.palisade.travel.domain.trip.entity;

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
@Table(name = "trip")
public class Trip {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "teacher_id", nullable = false)
    private Long teacherId;

    @Column(name = "geofence_id")
    private Long geofenceId;

    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "place", nullable = false, length = 200)
    private String place;

    @Column(name = "start_at")
    private LocalDateTime startAt;

    @Column(name = "end_at")
    private LocalDateTime endAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private TripStatus status;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    protected Trip() {
    }

    public Trip(Long id, Long teacherId, Long geofenceId, String title, String place, String description,
                LocalDateTime startAt, LocalDateTime endAt, TripStatus status, LocalDateTime createdAt) {
        this.id = id;
        this.teacherId = teacherId;
        this.geofenceId = geofenceId;
        this.title = title;
        this.place = place;
        this.description = description;
        this.startAt = startAt;
        this.endAt = endAt;
        this.status = status;
        this.createdAt = createdAt;
    }

    public static Trip create(Long teacherId, Long geofenceId, String title, String place, String description,
                              LocalDateTime startAt, LocalDateTime endAt, TripStatus status) {
        return new Trip(null, teacherId, geofenceId, title, place, description, startAt, endAt, status, LocalDateTime.now());
    }

    public void finish() {
        this.status = TripStatus.FINISHED;
    }

}

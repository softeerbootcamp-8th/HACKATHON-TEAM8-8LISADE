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
    private Long id;

    @Column(nullable = false)
    private Long teacherId;

    @Column
    private Long geofenceId;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column
    private LocalDateTime startAt;

    @Column
    private LocalDateTime endAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TripStatus status;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    protected Trip() {
    }

    public Trip(Long id, Long teacherId, Long geofenceId, String title, String description,
                LocalDateTime startAt, LocalDateTime endAt, TripStatus status, LocalDateTime createdAt) {
        this.id = id;
        this.teacherId = teacherId;
        this.geofenceId = geofenceId;
        this.title = title;
        this.description = description;
        this.startAt = startAt;
        this.endAt = endAt;
        this.status = status;
        this.createdAt = createdAt;
    }

    public static Trip create(Long teacherId, Long geofenceId, String title, String description,
                              LocalDateTime startAt, LocalDateTime endAt, TripStatus status) {
        return new Trip(null, teacherId, geofenceId, title, description, startAt, endAt, status, LocalDateTime.now());
    }

}

package com.palisade.travel.domain.trip.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;

import java.time.LocalDateTime;

@Entity
@Getter
@Table(name = "trip_participant")
public class TripParticipant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "trip_id", nullable = false)
    private Long tripId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    protected TripParticipant() {
    }

    public TripParticipant(Long id, Long tripId, Long userId, LocalDateTime createdAt) {
        this.id = id;
        this.tripId = tripId;
        this.userId = userId;
        this.createdAt = createdAt;
    }

    public static TripParticipant create(Long tripId, Long userId) {
        return new TripParticipant(null, tripId, userId, LocalDateTime.now());
    }

}

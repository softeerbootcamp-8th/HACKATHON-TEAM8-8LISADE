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
@Table(name = "trip_participant")
public class TripParticipant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "trip_id", nullable = false)
    private Long tripId;

    @Column(name = "user_id")
    private Long userId;

    @Column(name = "participant_name", length = 100)
    private String participantName;

    @Enumerated(EnumType.STRING)
    @Column(name = "participant_type", nullable = false, length = 20)
    private TripParticipantType participantType;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    protected TripParticipant() {
    }

    public TripParticipant(Long id, Long tripId, Long userId, String participantName,
                           TripParticipantType participantType, LocalDateTime createdAt) {
        this.id = id;
        this.tripId = tripId;
        this.userId = userId;
        this.participantName = participantName;
        this.participantType = participantType;
        this.createdAt = createdAt;
    }

    public static TripParticipant create(Long tripId, Long userId) {
        return new TripParticipant(null, tripId, userId, null, TripParticipantType.APP, LocalDateTime.now());
    }

    public static TripParticipant manual(Long tripId, String name) {
        return new TripParticipant(null, tripId, null, name, TripParticipantType.MANUAL, LocalDateTime.now());
    }

}

package com.palisade.travel.domain.trip.dto;

import com.palisade.travel.domain.trip.entity.TripParticipant;
import com.palisade.travel.domain.trip.entity.TripParticipantType;

import java.time.LocalDateTime;

public record TripParticipantResponse(Long id, Long userId, String name, TripParticipantType type, LocalDateTime createdAt) {
    public static TripParticipantResponse from(TripParticipant participant) {
        return from(participant, participant.getParticipantName());
    }

    public static TripParticipantResponse from(TripParticipant participant, String resolvedName) {
        return new TripParticipantResponse(participant.getId(), participant.getUserId(), resolvedName,
                participant.getParticipantType(), participant.getCreatedAt());
    }
}

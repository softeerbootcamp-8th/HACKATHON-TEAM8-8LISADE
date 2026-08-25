package com.palisade.travel.domain.trip.dto;

import com.palisade.travel.domain.trip.entity.TripParticipant;
import com.palisade.travel.domain.trip.entity.TripParticipantType;

import java.time.LocalDateTime;

public record TripParticipantResponse(Long id, Long userId, String name, TripParticipantType type, LocalDateTime createdAt) {
    public static TripParticipantResponse from(TripParticipant participant) {
        return new TripParticipantResponse(participant.getId(), participant.getUserId(), participant.getParticipantName(),
                participant.getParticipantType(), participant.getCreatedAt());
    }
}

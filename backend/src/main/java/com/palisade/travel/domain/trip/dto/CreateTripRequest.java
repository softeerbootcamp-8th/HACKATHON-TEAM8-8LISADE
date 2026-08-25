package com.palisade.travel.domain.trip.dto;

import jakarta.validation.constraints.NotBlank;

import java.time.LocalDateTime;

public record CreateTripRequest(
        @NotBlank String title,
        @NotBlank String place,
        String description,
        Long geofenceId,
        LocalDateTime startAt,
        LocalDateTime endAt
) {
}

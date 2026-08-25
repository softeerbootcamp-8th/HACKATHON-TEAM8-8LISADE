package com.palisade.travel.domain.trip.dto;

import jakarta.validation.constraints.NotBlank;

public record ManualParticipantRequest(@NotBlank String name) {
}

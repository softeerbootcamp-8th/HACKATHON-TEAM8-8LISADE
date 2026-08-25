package com.palisade.travel.domain.trip.dto;

import jakarta.validation.constraints.Pattern;

public record JoinTripRequest(
        @Pattern(regexp = "[A-Za-z]{2}\\d{4}", message = "code must be two letters followed by four digits") String code
) {
}

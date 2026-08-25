package com.palisade.travel.domain.geo.dto;

public record LocationUpdateResponse(Long tripId, boolean outside, int consecutiveOutsideCount) {
}

package com.palisade.travel.domain.geo.dto;

import com.palisade.travel.domain.geo.entity.CurrentLocation;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.ZoneOffset;

public record StudentLocationResponse(
        Long tripId,
        Long userId,
        BigDecimal latitude,
        BigDecimal longitude,
        boolean outside,
        Instant updatedAt,
        Instant outsideSince
) {

    public static StudentLocationResponse from(CurrentLocation currentLocation) {
        return new StudentLocationResponse(
                currentLocation.getTripId(),
                currentLocation.getUserId(),
                currentLocation.getLatitude(),
                currentLocation.getLongitude(),
                currentLocation.isOutside(),
                currentLocation.getUpdatedAt().toInstant(ZoneOffset.UTC),
                currentLocation.getOutsideSince() == null
                        ? null
                        : currentLocation.getOutsideSince().toInstant(ZoneOffset.UTC)
        );
    }
}

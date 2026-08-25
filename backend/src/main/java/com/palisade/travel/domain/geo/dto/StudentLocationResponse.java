package com.palisade.travel.domain.geo.dto;

import com.palisade.travel.domain.geo.entity.CurrentLocation;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record StudentLocationResponse(
        Long userId,
        BigDecimal latitude,
        BigDecimal longitude,
        boolean outside,
        LocalDateTime updatedAt
) {

    public static StudentLocationResponse from(CurrentLocation currentLocation) {
        return new StudentLocationResponse(
                currentLocation.getUserId(),
                currentLocation.getLatitude(),
                currentLocation.getLongitude(),
                currentLocation.isOutside(),
                currentLocation.getUpdatedAt()
        );
    }
}

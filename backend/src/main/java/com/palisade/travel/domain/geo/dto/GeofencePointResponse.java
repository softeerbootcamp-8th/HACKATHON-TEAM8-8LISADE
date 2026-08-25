package com.palisade.travel.domain.geo.dto;

import com.palisade.travel.domain.geo.entity.GeofencePoint;

import java.math.BigDecimal;

public record GeofencePointResponse(BigDecimal latitude, BigDecimal longitude) {
    public static GeofencePointResponse from(GeofencePoint point) {
        return new GeofencePointResponse(point.getLatitude(), point.getLongitude());
    }
}

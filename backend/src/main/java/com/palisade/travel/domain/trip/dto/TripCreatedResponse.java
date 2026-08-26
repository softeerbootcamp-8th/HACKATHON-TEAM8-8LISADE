package com.palisade.travel.domain.trip.dto;

import com.palisade.travel.domain.trip.entity.Trip;

public record TripCreatedResponse(Long tripId) {
    public static TripCreatedResponse from(Trip trip) {
        return new TripCreatedResponse(trip.getId());
    }
}

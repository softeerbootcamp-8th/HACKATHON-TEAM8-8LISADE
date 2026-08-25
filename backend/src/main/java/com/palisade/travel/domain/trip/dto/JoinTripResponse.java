package com.palisade.travel.domain.trip.dto;

import com.palisade.travel.domain.trip.entity.Trip;
import com.palisade.travel.domain.trip.entity.TripStatus;

public record JoinTripResponse(Long tripId, String title, String place, TripStatus status) {
    public static JoinTripResponse from(Trip trip) {
        return new JoinTripResponse(trip.getId(), trip.getTitle(), trip.getPlace(), trip.getStatus());
    }
}

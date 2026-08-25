package com.palisade.travel.domain.trip.dto;

import com.palisade.travel.domain.trip.entity.Trip;
import com.palisade.travel.domain.trip.entity.TripStatus;

import java.time.LocalDateTime;

public record TeacherTripSummaryResponse(
        Long tripId,
        String title,
        String place,
        LocalDateTime startAt,
        TripStatus status
) {
    public static TeacherTripSummaryResponse from(Trip trip) {
        return new TeacherTripSummaryResponse(
                trip.getId(), trip.getTitle(), trip.getPlace(), trip.getStartAt(), trip.getStatus());
    }
}

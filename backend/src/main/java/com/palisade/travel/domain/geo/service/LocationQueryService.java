package com.palisade.travel.domain.geo.service;

import com.palisade.travel.domain.geo.dto.GeofencePointResponse;
import com.palisade.travel.domain.geo.dto.StudentLocationResponse;
import com.palisade.travel.domain.geo.exception.LocationErrorCode;
import com.palisade.travel.domain.geo.exception.LocationException;
import com.palisade.travel.domain.geo.repository.CurrentLocationRepository;
import com.palisade.travel.domain.geo.repository.GeofencePointRepository;
import com.palisade.travel.domain.trip.entity.Trip;
import com.palisade.travel.domain.trip.repository.TripRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class LocationQueryService {

    private final TripRepository tripRepository;
    private final CurrentLocationRepository currentLocationRepository;
    private final GeofencePointRepository geofencePointRepository;

    public List<StudentLocationResponse> snapshot(Long teacherId, Long tripId) {
        findOwnedTrip(teacherId, tripId);
        return currentLocationRepository.findAllByTripIdOrderByUserIdAsc(tripId).stream()
                .map(StudentLocationResponse::from)
                .toList();
    }

    public List<GeofencePointResponse> geofence(Long teacherId, Long tripId) {
        Trip trip = findOwnedTrip(teacherId, tripId);
        if (trip.getGeofenceId() == null) {
            throw new LocationException(LocationErrorCode.GEOFENCE_NOT_CONFIGURED);
        }
        return geofencePointRepository.findAllByGeofenceIdOrderBySequenceAsc(trip.getGeofenceId()).stream()
                .map(GeofencePointResponse::from)
                .toList();
    }

    private Trip findOwnedTrip(Long teacherId, Long tripId) {
        Trip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new LocationException(LocationErrorCode.TRIP_NOT_FOUND));
        if (!trip.getTeacherId().equals(teacherId)) {
            throw new LocationException(LocationErrorCode.TRIP_ACCESS_FORBIDDEN);
        }
        return trip;
    }
}

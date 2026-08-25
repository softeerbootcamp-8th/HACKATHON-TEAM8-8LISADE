package com.palisade.travel.domain.geo.service;

import com.palisade.travel.domain.geo.dto.StudentLocationResponse;
import com.palisade.travel.domain.geo.exception.LocationErrorCode;
import com.palisade.travel.domain.geo.exception.LocationException;
import com.palisade.travel.domain.geo.repository.CurrentLocationRepository;
import com.palisade.travel.domain.trip.entity.Trip;
import com.palisade.travel.domain.trip.repository.TripRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional(readOnly = true)
public class LocationQueryService {

    private final TripRepository tripRepository;
    private final CurrentLocationRepository currentLocationRepository;

    public LocationQueryService(TripRepository tripRepository,
                                CurrentLocationRepository currentLocationRepository) {
        this.tripRepository = tripRepository;
        this.currentLocationRepository = currentLocationRepository;
    }

    public List<StudentLocationResponse> snapshot(Long teacherId, Long tripId) {
        Trip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new LocationException(LocationErrorCode.TRIP_NOT_FOUND));
        if (!trip.getTeacherId().equals(teacherId)) {
            throw new LocationException(LocationErrorCode.TRIP_ACCESS_FORBIDDEN);
        }
        return currentLocationRepository.findAllByTripIdOrderByUserIdAsc(tripId).stream()
                .map(StudentLocationResponse::from)
                .toList();
    }
}

package com.palisade.travel.domain.geo.service;

import com.palisade.travel.domain.geo.dto.LocationUpdateRequest;
import com.palisade.travel.domain.geo.dto.LocationUpdateResponse;
import com.palisade.travel.domain.geo.exception.LocationErrorCode;
import com.palisade.travel.domain.geo.exception.LocationException;
import com.palisade.travel.domain.trip.entity.Trip;
import com.palisade.travel.domain.trip.entity.TripParticipant;
import com.palisade.travel.domain.trip.repository.TripParticipantRepository;
import com.palisade.travel.domain.trip.repository.TripRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class LocationService {

    private final TripParticipantRepository tripParticipantRepository;
    private final TripRepository tripRepository;

    public LocationService(TripParticipantRepository tripParticipantRepository,
                           TripRepository tripRepository) {
        this.tripParticipantRepository = tripParticipantRepository;
        this.tripRepository = tripRepository;
    }

    public LocationUpdateResponse update(Long userId, LocationUpdateRequest request) {
        TripParticipant participant = tripParticipantRepository.findFirstByUserIdOrderByCreatedAtDescIdDesc(userId)
                .orElseThrow(() -> new LocationException(LocationErrorCode.PARTICIPATING_TRIP_NOT_FOUND));
        Trip trip = tripRepository.findById(participant.getTripId())
                .orElseThrow(() -> new LocationException(LocationErrorCode.TRIP_NOT_FOUND));

        return new LocationUpdateResponse(trip.getId(), false, 0);
    }
}

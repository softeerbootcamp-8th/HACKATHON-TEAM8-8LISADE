package com.palisade.travel.domain.geo.service;

import com.palisade.travel.domain.geo.dto.LocationUpdateRequest;
import com.palisade.travel.domain.geo.dto.LocationUpdateResponse;
import com.palisade.travel.domain.geo.entity.GeofencePoint;
import com.palisade.travel.domain.geo.exception.LocationErrorCode;
import com.palisade.travel.domain.geo.exception.LocationException;
import com.palisade.travel.domain.geo.repository.GeofencePointRepository;
import com.palisade.travel.domain.geo.util.GeofenceUtils;
import com.palisade.travel.domain.trip.entity.Trip;
import com.palisade.travel.domain.trip.entity.TripParticipant;
import com.palisade.travel.domain.trip.entity.TripStatus;
import com.palisade.travel.domain.trip.repository.TripParticipantRepository;
import com.palisade.travel.domain.trip.repository.TripRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional(readOnly = true)
public class LocationService {

    private final TripParticipantRepository tripParticipantRepository;
    private final TripRepository tripRepository;
    private final GeofencePointRepository geofencePointRepository;

    public LocationService(TripParticipantRepository tripParticipantRepository,
                           TripRepository tripRepository,
                           GeofencePointRepository geofencePointRepository) {
        this.tripParticipantRepository = tripParticipantRepository;
        this.tripRepository = tripRepository;
        this.geofencePointRepository = geofencePointRepository;
    }

    public LocationUpdateResponse update(Long userId, LocationUpdateRequest request) {
        TripParticipant participant = tripParticipantRepository.findFirstByUserIdOrderByCreatedAtDescIdDesc(userId)
                .orElseThrow(() -> new LocationException(LocationErrorCode.PARTICIPATING_TRIP_NOT_FOUND));
        Trip trip = tripRepository.findById(participant.getTripId())
                .orElseThrow(() -> new LocationException(LocationErrorCode.TRIP_NOT_FOUND));

        if (trip.getStatus() != TripStatus.ACTIVE) {
            throw new LocationException(LocationErrorCode.TRIP_INACTIVE);
        }

        List<GeofencePoint> geofencePoints = findGeofencePoints(trip);
        boolean outside = !GeofenceUtils.contains(geofencePoints, request.latitude(), request.longitude());
        return new LocationUpdateResponse(trip.getId(), outside, 0);
    }

    private List<GeofencePoint> findGeofencePoints(Trip trip) {
        if (trip.getGeofenceId() == null) {
            throw new LocationException(LocationErrorCode.GEOFENCE_NOT_CONFIGURED);
        }

        List<GeofencePoint> points = geofencePointRepository
                .findAllByGeofenceIdOrderBySequenceAsc(trip.getGeofenceId());
        if (points.size() < 3) {
            throw new LocationException(LocationErrorCode.GEOFENCE_NOT_CONFIGURED);
        }
        return points;
    }
}

package com.palisade.travel.domain.geo.service;

import com.palisade.travel.domain.geo.dto.LocationUpdateRequest;
import com.palisade.travel.domain.geo.dto.LocationUpdateResponse;
import com.palisade.travel.domain.geo.entity.CurrentLocation;
import com.palisade.travel.domain.geo.entity.GeofencePoint;
import com.palisade.travel.domain.geo.exception.LocationErrorCode;
import com.palisade.travel.domain.geo.exception.LocationException;
import com.palisade.travel.domain.geo.repository.CurrentLocationRepository;
import com.palisade.travel.domain.geo.repository.GeofencePointRepository;
import com.palisade.travel.domain.geo.util.GeofenceUtils;
import com.palisade.travel.domain.trip.entity.Trip;
import com.palisade.travel.domain.trip.entity.TripParticipant;
import com.palisade.travel.domain.trip.entity.TripStatus;
import com.palisade.travel.domain.trip.repository.TripParticipantRepository;
import com.palisade.travel.domain.trip.repository.TripRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

@Service
@Transactional(readOnly = true)
public class LocationService {

    private final TripParticipantRepository tripParticipantRepository;
    private final TripRepository tripRepository;
    private final GeofencePointRepository geofencePointRepository;
    private final CurrentLocationRepository currentLocationRepository;

    // ponytail: 요구사항의 단일 인스턴스 인메모리 카운터다. 다중 인스턴스가 필요해지면 Redis 원자 연산으로 교체한다.
    private final ConcurrentMap<Long, Integer> consecutiveOutsideCounts = new ConcurrentHashMap<>();

    public LocationService(TripParticipantRepository tripParticipantRepository,
                           TripRepository tripRepository,
                           GeofencePointRepository geofencePointRepository,
                           CurrentLocationRepository currentLocationRepository) {
        this.tripParticipantRepository = tripParticipantRepository;
        this.tripRepository = tripRepository;
        this.geofencePointRepository = geofencePointRepository;
        this.currentLocationRepository = currentLocationRepository;
    }

    @Transactional
    public LocationUpdateResponse update(Long userId, LocationUpdateRequest request) {
        TripParticipant participant = tripParticipantRepository.findFirstByUserIdOrderByCreatedAtDescIdDesc(userId)
                .orElseThrow(() -> new LocationException(LocationErrorCode.PARTICIPATING_TRIP_NOT_FOUND));
        Trip trip = tripRepository.findById(participant.getTripId())
                .orElseThrow(() -> new LocationException(LocationErrorCode.TRIP_NOT_FOUND));

        if (trip.getStatus() != TripStatus.ACTIVE) {
            consecutiveOutsideCounts.remove(userId);
            throw new LocationException(LocationErrorCode.TRIP_INACTIVE);
        }

        List<GeofencePoint> geofencePoints = findGeofencePoints(trip);
        boolean outside = !GeofenceUtils.contains(geofencePoints, request.latitude(), request.longitude());
        LocalDateTime recordedAt = LocalDateTime.ofInstant(request.recordedAt(), ZoneOffset.UTC);

        CurrentLocation currentLocation = currentLocationRepository.findByUserIdAndTripId(userId, trip.getId())
                .map(location -> {
                    location.update(request.latitude(), request.longitude(), outside, recordedAt);
                    return location;
                })
                .orElseGet(() -> CurrentLocation.create(
                        userId,
                        trip.getId(),
                        request.latitude(),
                        request.longitude(),
                        outside,
                        recordedAt
                ));
        currentLocationRepository.save(currentLocation);

        // TODO: 교사 화면에 최신 위치를 반영하도록 SSE 이벤트를 전송한다.

        int consecutiveOutsideCount = consecutiveOutsideCounts.compute(
                userId,
                (ignored, count) -> outside ? count == null ? 1 : count + 1 : 0
        );

        return new LocationUpdateResponse(trip.getId(), outside, consecutiveOutsideCount);
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

package com.palisade.travel.domain.trip.service;

import com.palisade.travel.domain.geo.entity.Geofence;
import com.palisade.travel.domain.geo.entity.GeofencePoint;
import com.palisade.travel.domain.geo.repository.GeofencePointRepository;
import com.palisade.travel.domain.geo.repository.GeofenceRepository;
import com.palisade.travel.domain.trip.dto.CreateTripRequest;
import com.palisade.travel.domain.trip.dto.InviteCodeResponse;
import com.palisade.travel.domain.trip.dto.JoinTripResponse;
import com.palisade.travel.domain.trip.dto.TripCreatedResponse;
import com.palisade.travel.domain.trip.dto.TripParticipantResponse;
import com.palisade.travel.domain.trip.dto.TeacherTripSummaryResponse;
import com.palisade.travel.domain.trip.entity.InviteCode;
import com.palisade.travel.domain.trip.entity.Trip;
import com.palisade.travel.domain.trip.entity.TripParticipant;
import com.palisade.travel.domain.trip.entity.TripStatus;
import com.palisade.travel.domain.trip.exception.TripErrorCode;
import com.palisade.travel.domain.trip.exception.TripException;
import com.palisade.travel.domain.trip.repository.InviteCodeRepository;
import com.palisade.travel.domain.trip.repository.TripParticipantRepository;
import com.palisade.travel.domain.trip.repository.TripRepository;
import com.palisade.travel.domain.user.entity.User;
import com.palisade.travel.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class TripService {
    private final TripRepository tripRepository;
    private final InviteCodeRepository inviteCodeRepository;
    private final TripParticipantRepository participantRepository;
    private final GeofenceRepository geofenceRepository;
    private final GeofencePointRepository geofencePointRepository;
    private final UserRepository userRepository;
    private final Clock clock;
    private final InviteCodeGenerator inviteCodeGenerator;

    @Transactional
    public TripCreatedResponse create(Long teacherId, CreateTripRequest request) {
        Geofence geofence = geofenceRepository.save(Geofence.create(request.title()));
        List<GeofencePoint> points = java.util.stream.IntStream.range(0, request.geofencePoints().size())
                .mapToObj(sequence -> {
                    CreateTripRequest.GeofencePointRequest point = request.geofencePoints().get(sequence);
                    return GeofencePoint.create(geofence.getId(), sequence, point.latitude(), point.longitude());
                })
                .toList();
        geofencePointRepository.saveAll(points);

        Trip trip = tripRepository.save(Trip.create(teacherId, geofence.getId(), request.title(), request.place(),
                request.description(), request.startAt(), request.endAt(), TripStatus.READY));
        return TripCreatedResponse.from(trip);
    }

    @Transactional
    public InviteCodeResponse start(Long teacherId, Long tripId) {
        Trip trip = findOwnedTrip(teacherId, tripId);
        if (trip.getStatus() != TripStatus.READY) {
            throw new TripException(TripErrorCode.TRIP_NOT_READY);
        }
        if (tripRepository.existsByTeacherIdAndStatus(teacherId, TripStatus.ACTIVE)) {
            throw new TripException(TripErrorCode.TEACHER_ALREADY_HAS_ACTIVE_TRIP);
        }
        trip.start();
        tripRepository.save(trip);
        inviteCodeRepository.findByTripIdAndRevokedAtIsNull(tripId)
                .ifPresent(code -> code.revoke(now()));
        return InviteCodeResponse.from(issueCode(tripId));
    }

    @Transactional
    public void delete(Long teacherId, Long tripId) {
        Trip trip = findOwnedTrip(teacherId, tripId);
        if (trip.getStatus() != TripStatus.READY) {
            throw new TripException(TripErrorCode.TRIP_NOT_READY);
        }
        inviteCodeRepository.deleteAllByTripId(tripId);
        if (trip.getGeofenceId() != null) {
            geofencePointRepository.deleteAllByGeofenceId(trip.getGeofenceId());
            geofenceRepository.deleteById(trip.getGeofenceId());
        }
        tripRepository.delete(trip);
    }

    @Transactional
    public JoinTripResponse join(Long studentId, String inputCode) {
        InviteCode inviteCode = inviteCodeRepository.findByCode(inputCode.toUpperCase(Locale.ROOT))
                .filter(InviteCode::isUsable)
                .orElseThrow(() -> new TripException(TripErrorCode.INVALID_INVITE_CODE));
        Trip trip = tripRepository.findById(inviteCode.getTripId())
                .filter(found -> found.getStatus() == TripStatus.ACTIVE)
                .orElseThrow(() -> new TripException(TripErrorCode.INVALID_INVITE_CODE));
        if (participantRepository.findByTripIdAndUserId(trip.getId(), studentId).isPresent()) {
            return JoinTripResponse.from(trip);
        }
        if (participantRepository.existsByUserIdAndTripStatus(studentId, TripStatus.ACTIVE)) {
            throw new TripException(TripErrorCode.ACTIVE_TRIP_ALREADY_JOINED);
        }
        participantRepository.save(TripParticipant.create(trip.getId(), studentId));
        return JoinTripResponse.from(trip);
    }

    public JoinTripResponse getActiveTrip(Long studentId) {
        return participantRepository.findTripByUserIdAndTripStatus(studentId, TripStatus.ACTIVE)
                .map(JoinTripResponse::from)
                .orElse(null);
    }

    public List<TripParticipantResponse> getParticipants(Long teacherId, Long tripId) {
        findOwnedTrip(teacherId, tripId);
        List<TripParticipant> participants = participantRepository.findAllByTripIdOrderByCreatedAtAsc(tripId);
        List<Long> userIds = participants.stream().map(TripParticipant::getUserId).filter(java.util.Objects::nonNull).toList();
        Map<Long, String> namesByUserId = userRepository.findAllById(userIds).stream()
                .collect(java.util.stream.Collectors.toMap(User::getId, User::getName));
        return participants.stream()
                .map(participant -> {
                    String resolvedName = participant.getUserId() != null
                            ? namesByUserId.get(participant.getUserId())
                            : participant.getParticipantName();
                    return TripParticipantResponse.from(participant, resolvedName);
                })
                .toList();
    }

    public List<TeacherTripSummaryResponse> getTrips(Long teacherId) {
        return tripRepository.findAllByTeacherIdOrderByCreatedAtDesc(teacherId).stream()
                .map(TeacherTripSummaryResponse::from)
                .toList();
    }

    @Transactional
    public TripParticipantResponse addManualParticipant(Long teacherId, Long tripId, String name) {
        findOwnedTrip(teacherId, tripId);
        return TripParticipantResponse.from(participantRepository.save(TripParticipant.manual(tripId, name)));
    }

    public InviteCodeResponse getCurrentInviteCode(Long teacherId, Long tripId) {
        findOwnedTrip(teacherId, tripId);
        return inviteCodeRepository.findByTripIdAndRevokedAtIsNull(tripId)
                .filter(InviteCode::isUsable)
                .map(InviteCodeResponse::from)
                .orElse(null);
    }

    @Transactional
    public void finish(Long teacherId, Long tripId) {
        Trip trip = findOwnedTrip(teacherId, tripId);
        if (trip.getStatus() != TripStatus.ACTIVE) {
            throw new TripException(TripErrorCode.TRIP_NOT_ACTIVE);
        }
        trip.finish();
        tripRepository.save(trip);
        inviteCodeRepository.findByTripIdAndRevokedAtIsNull(tripId)
                .ifPresent(code -> code.revoke(now()));
    }

    private InviteCode issueCode(Long tripId) {
        String code = nextUnusedCode();
        InviteCode inviteCode = InviteCode.create(tripId, code);
        return inviteCodeRepository.save(inviteCode);
    }

    private String nextUnusedCode() {
        for (int attempts = 0; attempts < 10; attempts++) {
            String candidate = inviteCodeGenerator.generate();
            if (!inviteCodeRepository.existsByCode(candidate)) {
                return candidate;
            }
        }
        throw new TripException(TripErrorCode.INVITE_CODE_GENERATION_FAILED);
    }

    private Trip findOwnedTrip(Long teacherId, Long tripId) {
        Trip trip = tripRepository.findById(tripId).orElseThrow(() -> new TripException(TripErrorCode.TRIP_NOT_FOUND));
        if (!trip.getTeacherId().equals(teacherId)) {
            throw new TripException(TripErrorCode.TRIP_ACCESS_DENIED);
        }
        return trip;
    }

    private LocalDateTime now() {
        return LocalDateTime.now(clock);
    }
}

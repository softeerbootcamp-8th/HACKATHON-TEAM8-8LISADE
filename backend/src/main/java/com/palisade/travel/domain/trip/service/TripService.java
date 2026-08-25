package com.palisade.travel.domain.trip.service;

import com.palisade.travel.domain.trip.dto.CreateTripRequest;
import com.palisade.travel.domain.trip.dto.InviteCodeResponse;
import com.palisade.travel.domain.trip.dto.JoinTripResponse;
import com.palisade.travel.domain.trip.entity.InviteCode;
import com.palisade.travel.domain.trip.entity.Trip;
import com.palisade.travel.domain.trip.entity.TripParticipant;
import com.palisade.travel.domain.trip.entity.TripStatus;
import com.palisade.travel.domain.trip.exception.TripErrorCode;
import com.palisade.travel.domain.trip.repository.InviteCodeRepository;
import com.palisade.travel.domain.trip.repository.TripParticipantRepository;
import com.palisade.travel.domain.trip.repository.TripRepository;
import com.palisade.travel.global.error.ApiException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.Locale;

@Service
@Transactional(readOnly = true)
public class TripService {
    private static final long INVITE_CODE_EXPIRES_MINUTES = 5;

    private final TripRepository tripRepository;
    private final InviteCodeRepository inviteCodeRepository;
    private final TripParticipantRepository participantRepository;
    private final Clock clock;
    private final InviteCodeGenerator inviteCodeGenerator;

    public TripService(TripRepository tripRepository, InviteCodeRepository inviteCodeRepository,
                       TripParticipantRepository participantRepository, Clock clock,
                       InviteCodeGenerator inviteCodeGenerator) {
        this.tripRepository = tripRepository;
        this.inviteCodeRepository = inviteCodeRepository;
        this.participantRepository = participantRepository;
        this.clock = clock;
        this.inviteCodeGenerator = inviteCodeGenerator;
    }

    @Transactional
    public InviteCodeResponse create(Long teacherId, CreateTripRequest request) {
        Trip trip = tripRepository.save(Trip.create(teacherId, request.geofenceId(), request.title(), request.place(),
                request.description(), request.startAt(), request.endAt(), TripStatus.ACTIVE));
        return InviteCodeResponse.from(issueCode(trip.getId()));
    }

    @Transactional
    public InviteCodeResponse reissueInviteCode(Long teacherId, Long tripId) {
        Trip trip = findOwnedTrip(teacherId, tripId);
        inviteCodeRepository.findByTripIdAndRevokedAtIsNull(trip.getId())
                .ifPresent(code -> code.revoke(now()));
        return InviteCodeResponse.from(issueCode(trip.getId()));
    }

    @Transactional
    public JoinTripResponse join(Long studentId, String inputCode) {
        InviteCode inviteCode = inviteCodeRepository.findByCode(inputCode.toUpperCase(Locale.ROOT))
                .filter(code -> code.isUsableAt(now()))
                .orElseThrow(() -> new ApiException(TripErrorCode.INVALID_INVITE_CODE));
        Trip trip = tripRepository.findById(inviteCode.getTripId())
                .filter(found -> found.getStatus() == TripStatus.ACTIVE)
                .orElseThrow(() -> new ApiException(TripErrorCode.INVALID_INVITE_CODE));
        if (participantRepository.findByTripIdAndUserId(trip.getId(), studentId).isPresent()) {
            return JoinTripResponse.from(trip);
        }
        if (participantRepository.existsByUserIdAndTripStatus(studentId, TripStatus.ACTIVE)) {
            throw new ApiException(TripErrorCode.ACTIVE_TRIP_ALREADY_JOINED);
        }
        participantRepository.save(TripParticipant.create(trip.getId(), studentId));
        return JoinTripResponse.from(trip);
    }

    private InviteCode issueCode(Long tripId) {
        InviteCode inviteCode = InviteCode.create(tripId, inviteCodeGenerator.generate(), now().plusMinutes(INVITE_CODE_EXPIRES_MINUTES));
        return inviteCodeRepository.save(inviteCode);
    }

    private Trip findOwnedTrip(Long teacherId, Long tripId) {
        Trip trip = tripRepository.findById(tripId).orElseThrow(() -> new ApiException(TripErrorCode.TRIP_NOT_FOUND));
        if (!trip.getTeacherId().equals(teacherId)) {
            throw new ApiException(TripErrorCode.TRIP_ACCESS_DENIED);
        }
        return trip;
    }

    private LocalDateTime now() {
        return LocalDateTime.now(clock);
    }
}

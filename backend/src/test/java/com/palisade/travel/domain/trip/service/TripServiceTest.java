package com.palisade.travel.domain.trip.service;

import com.palisade.travel.domain.trip.dto.CreateTripRequest;
import com.palisade.travel.domain.trip.dto.InviteCodeResponse;
import com.palisade.travel.domain.trip.dto.JoinTripResponse;
import com.palisade.travel.domain.trip.entity.InviteCode;
import com.palisade.travel.domain.trip.entity.Trip;
import com.palisade.travel.domain.trip.entity.TripParticipant;
import com.palisade.travel.domain.trip.entity.TripStatus;
import com.palisade.travel.domain.trip.repository.InviteCodeRepository;
import com.palisade.travel.domain.trip.repository.TripParticipantRepository;
import com.palisade.travel.domain.trip.repository.TripRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class TripServiceTest {

    private final Clock clock = Clock.fixed(Instant.parse("2026-08-25T09:00:00Z"), ZoneOffset.UTC);
    private final TripRepository tripRepository = mock(TripRepository.class);
    private final InviteCodeRepository inviteCodeRepository = mock(InviteCodeRepository.class);
    private final TripParticipantRepository participantRepository = mock(TripParticipantRepository.class);
    private TripService tripService;

    @BeforeEach
    void setUp() {
        AtomicInteger generated = new AtomicInteger();
        tripService = new TripService(tripRepository, inviteCodeRepository, participantRepository, clock,
                () -> generated.getAndIncrement() == 0 ? "AB1234" : "CD5678");
        given(inviteCodeRepository.save(any(InviteCode.class))).willAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void creatingTripIssuesSixCharacterInviteCodeThatExpiresInFiveMinutes() {
        Trip trip = new Trip(1L, 10L, null, "경복궁", "서울", null, null, null, TripStatus.ACTIVE,
                LocalDateTime.ofInstant(clock.instant(), ZoneOffset.UTC));
        given(tripRepository.save(any(Trip.class))).willReturn(trip);

        InviteCodeResponse response = tripService.create(10L, new CreateTripRequest("경복궁", "서울", null, null, null, null));

        assertThat(response.code()).matches("[A-Z]{2}\\d{4}");
        assertThat(response.expiresAt()).isEqualTo(LocalDateTime.of(2026, 8, 25, 9, 5));
        ArgumentCaptor<InviteCode> codeCaptor = ArgumentCaptor.forClass(InviteCode.class);
        verify(inviteCodeRepository).save(codeCaptor.capture());
        assertThat(codeCaptor.getValue().getTripId()).isEqualTo(1L);
        assertThat(codeCaptor.getValue().getExpiresAt()).isEqualTo(LocalDateTime.of(2026, 8, 25, 9, 5));
    }

    @Test
    void reissuingInviteCodeRevokesPreviousCodeBeforeIssuingNewOne() {
        Trip trip = new Trip(1L, 10L, null, "경복궁", "서울", null, null, null, TripStatus.ACTIVE,
                LocalDateTime.ofInstant(clock.instant(), ZoneOffset.UTC));
        InviteCode previous = new InviteCode(3L, 1L, "AB1234", LocalDateTime.of(2026, 8, 25, 9, 5), null);
        given(tripRepository.findById(1L)).willReturn(Optional.of(trip));
        given(inviteCodeRepository.findByTripIdAndRevokedAtIsNull(1L)).willReturn(Optional.of(previous));
        given(inviteCodeRepository.existsByCode("AB1234")).willReturn(true);
        given(inviteCodeRepository.existsByCode("CD5678")).willReturn(false);

        InviteCodeResponse response = tripService.reissueInviteCode(10L, 1L);

        assertThat(previous.getRevokedAt()).isEqualTo(LocalDateTime.of(2026, 8, 25, 9, 0));
        assertThat(response.code()).isEqualTo("CD5678");
        verify(inviteCodeRepository).save(any(InviteCode.class));
    }

    @Test
    void studentJoinsWithValidCodeAndCannotJoinAnotherActiveTrip() {
        Trip trip = new Trip(1L, 10L, null, "경복궁", "서울", null, null, null, TripStatus.ACTIVE,
                LocalDateTime.ofInstant(clock.instant(), ZoneOffset.UTC));
        InviteCode inviteCode = new InviteCode(3L, 1L, "AB1234", LocalDateTime.of(2026, 8, 25, 9, 5), null);
        given(inviteCodeRepository.findByCode("AB1234")).willReturn(Optional.of(inviteCode));
        given(tripRepository.findById(1L)).willReturn(Optional.of(trip));
        given(participantRepository.findByTripIdAndUserId(1L, 20L)).willReturn(Optional.empty());
        given(participantRepository.existsByUserIdAndTripStatus(20L, TripStatus.ACTIVE)).willReturn(false);
        given(participantRepository.save(any(TripParticipant.class))).willAnswer(invocation -> invocation.getArgument(0));

        JoinTripResponse response = tripService.join(20L, "ab1234");

        assertThat(response.tripId()).isEqualTo(1L);
        verify(participantRepository).save(any(TripParticipant.class));

        given(participantRepository.existsByUserIdAndTripStatus(20L, TripStatus.ACTIVE)).willReturn(true);
        assertThatThrownBy(() -> tripService.join(20L, "AB1234"))
                .hasMessageContaining("active trip");
    }

    @Test
    void expiredOrRevokedCodeIsRejected() {
        InviteCode expired = new InviteCode(3L, 1L, "AB1234", LocalDateTime.of(2026, 8, 25, 8, 59), null);
        given(inviteCodeRepository.findByCode("AB1234")).willReturn(Optional.of(expired));

        assertThatThrownBy(() -> tripService.join(20L, "AB1234"))
                .hasMessageContaining("invite code");
        verify(participantRepository, never()).save(any());
    }
}

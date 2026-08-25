package com.palisade.travel.domain.trip.service;

import com.palisade.travel.domain.geo.entity.Geofence;
import com.palisade.travel.domain.geo.entity.GeofencePoint;
import com.palisade.travel.domain.geo.repository.GeofencePointRepository;
import com.palisade.travel.domain.geo.repository.GeofenceRepository;
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

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.catchThrowable;
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
    private final GeofenceRepository geofenceRepository = mock(GeofenceRepository.class);
    private final GeofencePointRepository geofencePointRepository = mock(GeofencePointRepository.class);
    private TripService tripService;

    @BeforeEach
    void setUp() {
        AtomicInteger generated = new AtomicInteger();
        tripService = new TripService(tripRepository, inviteCodeRepository, participantRepository,
                geofenceRepository, geofencePointRepository, clock,
                () -> generated.getAndIncrement() == 0 ? "AB1234" : "CD5678");
        given(inviteCodeRepository.save(any(InviteCode.class))).willAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void 체험학습을_생성하면_오분_후_만료되는_여섯_자리_초대_코드를_발급한다() {
        // given
        Geofence geofence = new Geofence(7L, "경복궁", LocalDateTime.ofInstant(clock.instant(), ZoneOffset.UTC));
        Trip trip = new Trip(1L, 10L, 7L, "경복궁", "서울", null,
                LocalDateTime.of(2026, 8, 25, 0, 0), LocalDateTime.of(2026, 8, 25, 23, 59), TripStatus.ACTIVE,
                LocalDateTime.ofInstant(clock.instant(), ZoneOffset.UTC));
        given(geofenceRepository.save(any(Geofence.class))).willReturn(geofence);
        given(tripRepository.save(any(Trip.class))).willReturn(trip);

        // when
        InviteCodeResponse response = tripService.create(10L, createTripRequest());

        // then
        assertThat(response.code()).matches("[A-Z]{2}\\d{4}");
        assertThat(response.expiresAt()).isEqualTo(LocalDateTime.of(2026, 8, 25, 9, 5));
        ArgumentCaptor<InviteCode> codeCaptor = ArgumentCaptor.forClass(InviteCode.class);
        verify(inviteCodeRepository).save(codeCaptor.capture());
        assertThat(codeCaptor.getValue().getTripId()).isEqualTo(1L);
        assertThat(codeCaptor.getValue().getExpiresAt()).isEqualTo(LocalDateTime.of(2026, 8, 25, 9, 5));
    }

    @Test
    void 체험학습을_생성하면_같은_제목의_지오펜스와_순서가_보존된_좌표를_저장한다() {
        // given
        Geofence geofence = new Geofence(7L, "국립중앙박물관", LocalDateTime.ofInstant(clock.instant(), ZoneOffset.UTC));
        Trip savedTrip = new Trip(1L, 10L, 7L, "국립중앙박물관", "국립중앙박물관", null,
                LocalDateTime.of(2026, 8, 25, 0, 0), LocalDateTime.of(2026, 8, 25, 23, 59), TripStatus.ACTIVE,
                LocalDateTime.ofInstant(clock.instant(), ZoneOffset.UTC));
        given(geofenceRepository.save(any(Geofence.class))).willReturn(geofence);
        given(tripRepository.save(any(Trip.class))).willReturn(savedTrip);

        // when
        tripService.create(10L, createTripRequest());

        // then
        ArgumentCaptor<Geofence> geofenceCaptor = ArgumentCaptor.forClass(Geofence.class);
        verify(geofenceRepository).save(geofenceCaptor.capture());
        assertThat(geofenceCaptor.getValue().getName()).isEqualTo("국립중앙박물관");

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<GeofencePoint>> pointsCaptor = ArgumentCaptor.forClass(List.class);
        verify(geofencePointRepository).saveAll(pointsCaptor.capture());
        assertThat(pointsCaptor.getValue())
                .extracting(GeofencePoint::getSequence, GeofencePoint::getLatitude, GeofencePoint::getLongitude)
                .containsExactly(
                        org.assertj.core.groups.Tuple.tuple(0, new BigDecimal("37.5230000"), new BigDecimal("126.9800000")),
                        org.assertj.core.groups.Tuple.tuple(1, new BigDecimal("37.5240000"), new BigDecimal("126.9810000")),
                        org.assertj.core.groups.Tuple.tuple(2, new BigDecimal("37.5220000"), new BigDecimal("126.9820000")));

        ArgumentCaptor<Trip> tripCaptor = ArgumentCaptor.forClass(Trip.class);
        verify(tripRepository).save(tripCaptor.capture());
        assertThat(tripCaptor.getValue().getTitle()).isEqualTo("국립중앙박물관");
        assertThat(tripCaptor.getValue().getGeofenceId()).isEqualTo(7L);
    }

    @Test
    void 지오펜스_좌표_저장에_실패하면_체험학습을_저장하지_않는다() {
        // given
        Geofence geofence = new Geofence(7L, "국립중앙박물관", LocalDateTime.ofInstant(clock.instant(), ZoneOffset.UTC));
        given(geofenceRepository.save(any(Geofence.class))).willReturn(geofence);
        given(geofencePointRepository.saveAll(any())).willThrow(new IllegalStateException("좌표 저장 실패"));

        // when
        Throwable thrown = catchThrowable(() -> tripService.create(10L, createTripRequest()));

        // then
        assertThat(thrown)
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("좌표 저장 실패");
        verify(tripRepository, never()).save(any());
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

    private CreateTripRequest createTripRequest() {
        return new CreateTripRequest(
                "국립중앙박물관",
                "국립중앙박물관",
                null,
                LocalDateTime.of(2026, 8, 25, 0, 0),
                LocalDateTime.of(2026, 8, 25, 23, 59),
                List.of(
                        new CreateTripRequest.GeofencePointRequest(new BigDecimal("37.5230000"), new BigDecimal("126.9800000")),
                        new CreateTripRequest.GeofencePointRequest(new BigDecimal("37.5240000"), new BigDecimal("126.9810000")),
                        new CreateTripRequest.GeofencePointRequest(new BigDecimal("37.5220000"), new BigDecimal("126.9820000"))));
    }
}

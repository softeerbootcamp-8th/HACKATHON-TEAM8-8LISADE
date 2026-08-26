package com.palisade.travel.domain.trip.service;

import com.palisade.travel.domain.geo.entity.Geofence;
import com.palisade.travel.domain.geo.entity.GeofencePoint;
import com.palisade.travel.domain.geo.repository.GeofencePointRepository;
import com.palisade.travel.domain.geo.repository.GeofenceRepository;
import com.palisade.travel.domain.trip.dto.CreateTripRequest;
import com.palisade.travel.domain.trip.dto.InviteCodeResponse;
import com.palisade.travel.domain.trip.dto.JoinTripResponse;
import com.palisade.travel.domain.trip.dto.TripParticipantResponse;
import com.palisade.travel.domain.trip.entity.InviteCode;
import com.palisade.travel.domain.trip.entity.Trip;
import com.palisade.travel.domain.trip.entity.TripParticipant;
import com.palisade.travel.domain.trip.entity.TripParticipantType;
import com.palisade.travel.domain.trip.entity.TripStatus;
import com.palisade.travel.domain.trip.repository.InviteCodeRepository;
import com.palisade.travel.domain.trip.repository.TripParticipantRepository;
import com.palisade.travel.domain.trip.repository.TripRepository;
import com.palisade.travel.domain.user.entity.User;
import com.palisade.travel.domain.user.entity.UserRole;
import com.palisade.travel.domain.user.repository.UserRepository;
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
    private final UserRepository userRepository = mock(UserRepository.class);
    private TripService tripService;

    @BeforeEach
    void setUp() {
        AtomicInteger generated = new AtomicInteger();
        tripService = new TripService(tripRepository, inviteCodeRepository, participantRepository,
                geofenceRepository, geofencePointRepository, userRepository, clock,
                () -> generated.getAndIncrement() == 0 ? "AB1234" : "CD5678");
        given(inviteCodeRepository.save(any(InviteCode.class))).willAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void 체험학습을_생성하면_READY_상태로_저장된다() {
        // given
        Geofence geofence = new Geofence(7L, "경복궁", LocalDateTime.ofInstant(clock.instant(), ZoneOffset.UTC));
        Trip savedTrip = new Trip(1L, 10L, 7L, "경복궁", "서울", null,
                LocalDateTime.of(2026, 8, 25, 0, 0), LocalDateTime.of(2026, 8, 25, 23, 59), TripStatus.READY,
                LocalDateTime.ofInstant(clock.instant(), ZoneOffset.UTC));
        given(geofenceRepository.save(any(Geofence.class))).willReturn(geofence);
        given(tripRepository.save(any(Trip.class))).willReturn(savedTrip);

        // when
        tripService.create(10L, createTripRequest());

        // then
        ArgumentCaptor<Trip> tripCaptor = ArgumentCaptor.forClass(Trip.class);
        verify(tripRepository).save(tripCaptor.capture());
        assertThat(tripCaptor.getValue().getStatus()).isEqualTo(TripStatus.READY);
    }

    @Test
    void 예정_체험학습을_시작하면_ACTIVE로_바뀌고_새_초대_코드를_발급한다() {
        // given
        Trip trip = new Trip(1L, 10L, null, "경복궁", "서울", null, null, null, TripStatus.READY,
                LocalDateTime.ofInstant(clock.instant(), ZoneOffset.UTC));
        InviteCode previous = new InviteCode(3L, 1L, "AB1234", LocalDateTime.of(2026, 8, 25, 9, 5), null);
        given(tripRepository.findById(1L)).willReturn(Optional.of(trip));
        given(inviteCodeRepository.findByTripIdAndRevokedAtIsNull(1L)).willReturn(Optional.of(previous));
        given(inviteCodeRepository.existsByCode("AB1234")).willReturn(false);

        // when
        InviteCodeResponse response = tripService.start(10L, 1L);

        // then
        assertThat(trip.getStatus()).isEqualTo(TripStatus.ACTIVE);
        assertThat(previous.getRevokedAt()).isEqualTo(LocalDateTime.of(2026, 8, 25, 9, 0));
        assertThat(response.code()).isEqualTo("AB1234");
        verify(tripRepository).save(trip);
    }

    @Test
    void 이미_시작된_체험학습을_다시_시작하려하면_예외() {
        // given
        Trip trip = new Trip(1L, 10L, null, "경복궁", "서울", null, null, null, TripStatus.ACTIVE,
                LocalDateTime.ofInstant(clock.instant(), ZoneOffset.UTC));
        given(tripRepository.findById(1L)).willReturn(Optional.of(trip));

        // when & then
        assertThatThrownBy(() -> tripService.start(10L, 1L))
                .hasMessageContaining("not ready");
        verify(tripRepository, never()).save(any());
    }

    @Test
    void 예정_체험학습을_삭제하면_지오펜스와_초대코드까지_함께_삭제한다() {
        // given
        Trip trip = new Trip(1L, 10L, 7L, "경복궁", "서울", null, null, null, TripStatus.READY,
                LocalDateTime.ofInstant(clock.instant(), ZoneOffset.UTC));
        given(tripRepository.findById(1L)).willReturn(Optional.of(trip));

        // when
        tripService.delete(10L, 1L);

        // then
        verify(inviteCodeRepository).deleteAllByTripId(1L);
        verify(geofencePointRepository).deleteAllByGeofenceId(7L);
        verify(geofenceRepository).deleteById(7L);
        verify(tripRepository).delete(trip);
    }

    @Test
    void 진행중인_체험학습을_삭제하려하면_예외() {
        // given
        Trip trip = new Trip(1L, 10L, null, "경복궁", "서울", null, null, null, TripStatus.ACTIVE,
                LocalDateTime.ofInstant(clock.instant(), ZoneOffset.UTC));
        given(tripRepository.findById(1L)).willReturn(Optional.of(trip));

        // when & then
        assertThatThrownBy(() -> tripService.delete(10L, 1L))
                .hasMessageContaining("not ready");
        verify(tripRepository, never()).delete(any());
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
    void 교사_소유_체험학습을_최신_생성순_요약으로_반환한다() {
        // given
        Trip recent = new Trip(2L, 10L, null, "현장체험학습 2", "경주 첨성대", null,
                LocalDateTime.of(2026, 10, 2, 9, 0), null, TripStatus.READY,
                LocalDateTime.of(2026, 8, 25, 10, 0));
        Trip older = new Trip(1L, 10L, null, "26년 5학년 2반", "국립중앙박물관", null,
                LocalDateTime.of(2026, 9, 12, 9, 0), null, TripStatus.ACTIVE,
                LocalDateTime.of(2026, 8, 25, 9, 0));
        given(tripRepository.findAllByTeacherIdOrderByCreatedAtDesc(10L)).willReturn(List.of(recent, older));

        // when
        var trips = tripService.getTrips(10L);

        // then
        assertThat(trips).extracting("tripId", "title", "status")
                .containsExactly(
                        org.assertj.core.groups.Tuple.tuple(2L, "현장체험학습 2", TripStatus.READY),
                        org.assertj.core.groups.Tuple.tuple(1L, "26년 5학년 2반", TripStatus.ACTIVE)
                );
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
    void 참여자_목록_조회시_앱으로_참여한_학생은_User_이름을_직접추가한_학생은_등록한_이름을_반환한다() {
        Trip trip = new Trip(1L, 10L, null, "경복궁", "서울", null, null, null, TripStatus.ACTIVE,
                LocalDateTime.ofInstant(clock.instant(), ZoneOffset.UTC));
        given(tripRepository.findById(1L)).willReturn(Optional.of(trip));
        TripParticipant appParticipant = new TripParticipant(100L, 1L, 20L, null, TripParticipantType.APP,
                LocalDateTime.ofInstant(clock.instant(), ZoneOffset.UTC));
        TripParticipant manualParticipant = new TripParticipant(101L, 1L, null, "김직접",
                TripParticipantType.MANUAL, LocalDateTime.ofInstant(clock.instant(), ZoneOffset.UTC));
        given(participantRepository.findAllByTripIdOrderByCreatedAtAsc(1L))
                .willReturn(List.of(appParticipant, manualParticipant));
        User user = new User(20L, "student01", "hash", null, "이서연", UserRole.STUDENT,
                "01012345678", null, true, true, LocalDateTime.ofInstant(clock.instant(), ZoneOffset.UTC));
        given(userRepository.findAllById(List.of(20L))).willReturn(List.of(user));

        List<TripParticipantResponse> responses = tripService.getParticipants(10L, 1L);

        assertThat(responses).extracting(TripParticipantResponse::userId, TripParticipantResponse::name)
                .containsExactly(
                        org.assertj.core.groups.Tuple.tuple(20L, "이서연"),
                        org.assertj.core.groups.Tuple.tuple(null, "김직접"));
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

    @Test
    void 진행중인_체험학습을_종료하면_상태를_바꾸고_유효한_초대코드를_무효화한다() {
        Trip trip = new Trip(1L, 10L, null, "경복궁", "서울", null, null, null, TripStatus.ACTIVE,
                LocalDateTime.ofInstant(clock.instant(), ZoneOffset.UTC));
        InviteCode current = new InviteCode(3L, 1L, "AB1234", LocalDateTime.of(2026, 8, 25, 9, 5), null);
        given(tripRepository.findById(1L)).willReturn(Optional.of(trip));
        given(inviteCodeRepository.findByTripIdAndRevokedAtIsNull(1L)).willReturn(Optional.of(current));

        tripService.finish(10L, 1L);

        assertThat(trip.getStatus()).isEqualTo(TripStatus.FINISHED);
        assertThat(current.getRevokedAt()).isEqualTo(LocalDateTime.of(2026, 8, 25, 9, 0));
        verify(tripRepository).save(trip);
    }

    @Test
    void 이미_종료된_체험학습을_다시_종료하려하면_예외() {
        Trip trip = new Trip(1L, 10L, null, "경복궁", "서울", null, null, null, TripStatus.FINISHED,
                LocalDateTime.ofInstant(clock.instant(), ZoneOffset.UTC));
        given(tripRepository.findById(1L)).willReturn(Optional.of(trip));

        assertThatThrownBy(() -> tripService.finish(10L, 1L))
                .hasMessageContaining("not active");
        verify(tripRepository, never()).save(any());
    }

    @Test
    void 유효한_초대코드가_있으면_그대로_조회한다() {
        Trip trip = new Trip(1L, 10L, null, "경복궁", "서울", null, null, null, TripStatus.ACTIVE,
                LocalDateTime.ofInstant(clock.instant(), ZoneOffset.UTC));
        InviteCode current = new InviteCode(3L, 1L, "AB1234", LocalDateTime.of(2026, 8, 25, 9, 5), null);
        given(tripRepository.findById(1L)).willReturn(Optional.of(trip));
        given(inviteCodeRepository.findByTripIdAndRevokedAtIsNull(1L)).willReturn(Optional.of(current));

        InviteCodeResponse response = tripService.getCurrentInviteCode(10L, 1L);

        assertThat(response.code()).isEqualTo("AB1234");
    }

    @Test
    void 유효한_초대코드가_없으면_null을_반환한다() {
        Trip trip = new Trip(1L, 10L, null, "경복궁", "서울", null, null, null, TripStatus.ACTIVE,
                LocalDateTime.ofInstant(clock.instant(), ZoneOffset.UTC));
        given(tripRepository.findById(1L)).willReturn(Optional.of(trip));
        given(inviteCodeRepository.findByTripIdAndRevokedAtIsNull(1L)).willReturn(Optional.empty());

        assertThat(tripService.getCurrentInviteCode(10L, 1L)).isNull();
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

package com.palisade.travel.domain.geo.service;

import com.palisade.travel.domain.geo.dto.LocationUpdateRequest;
import com.palisade.travel.domain.geo.dto.LocationUpdateResponse;
import com.palisade.travel.domain.geo.entity.CurrentLocation;
import com.palisade.travel.domain.geo.entity.GeofencePoint;
import com.palisade.travel.domain.geo.entity.LocationLog;
import com.palisade.travel.domain.geo.exception.LocationErrorCode;
import com.palisade.travel.domain.geo.exception.LocationException;
import com.palisade.travel.domain.geo.repository.CurrentLocationRepository;
import com.palisade.travel.domain.geo.repository.GeofencePointRepository;
import com.palisade.travel.domain.geo.repository.LocationLogRepository;
import com.palisade.travel.domain.trip.entity.Trip;
import com.palisade.travel.domain.trip.entity.TripParticipant;
import com.palisade.travel.domain.trip.entity.TripParticipantType;
import com.palisade.travel.domain.trip.entity.TripStatus;
import com.palisade.travel.domain.trip.repository.TripParticipantRepository;
import com.palisade.travel.domain.trip.repository.TripRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.ArgumentCaptor;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;

@ExtendWith(MockitoExtension.class)
class LocationServiceTest {

    private static final Long USER_ID = 1L;
    private static final Long TRIP_ID = 10L;
    private static final Long GEOFENCE_ID = 20L;

    @Mock
    private TripParticipantRepository tripParticipantRepository;

    @Mock
    private TripRepository tripRepository;

    @Mock
    private GeofencePointRepository geofencePointRepository;

    @Mock
    private CurrentLocationRepository currentLocationRepository;

    @Mock
    private LocationLogRepository locationLogRepository;

    private LocationService locationService;

    @BeforeEach
    void setUp() {
        locationService = new LocationService(
                tripParticipantRepository,
                tripRepository,
                geofencePointRepository,
                currentLocationRepository,
                locationLogRepository
        );
    }

    @Test
    void 가장_최근에_참여한_여행을_위치_대상으로_선택한다() {
        // given
        given(tripParticipantRepository.findFirstByUserIdOrderByCreatedAtDescIdDesc(USER_ID))
                .willReturn(Optional.of(participant()));
        given(tripRepository.findById(TRIP_ID)).willReturn(Optional.of(trip(TripStatus.ACTIVE)));
        given(geofencePointRepository.findAllByGeofenceIdOrderBySequenceAsc(GEOFENCE_ID))
                .willReturn(square());
        CurrentLocation currentLocation = CurrentLocation.create(
                USER_ID,
                TRIP_ID,
                new BigDecimal("37.0200000"),
                new BigDecimal("127.0200000"),
                true,
                LocalDateTime.of(2026, 1, 1, 0, 0)
        );
        given(currentLocationRepository.findByUserIdAndTripId(USER_ID, TRIP_ID))
                .willReturn(Optional.of(currentLocation));

        // when
        LocationUpdateResponse response = locationService.update(USER_ID, request());

        // then
        assertThat(response.tripId()).isEqualTo(TRIP_ID);
        assertThat(response.outside()).isFalse();
        assertThat(currentLocation.getLatitude()).isEqualByComparingTo("37.0050000");
        assertThat(currentLocation.getLongitude()).isEqualByComparingTo("127.0050000");
        assertThat(currentLocation.isOutside()).isFalse();
        assertThat(currentLocation.getUpdatedAt()).isEqualTo(LocalDateTime.of(2026, 8, 25, 8, 55, 30));
    }

    @Test
    void 지오펜스_외부_좌표는_외부로_판정한다() {
        // given
        given(tripParticipantRepository.findFirstByUserIdOrderByCreatedAtDescIdDesc(USER_ID))
                .willReturn(Optional.of(participant()));
        given(tripRepository.findById(TRIP_ID)).willReturn(Optional.of(trip(TripStatus.ACTIVE)));
        given(geofencePointRepository.findAllByGeofenceIdOrderBySequenceAsc(GEOFENCE_ID))
                .willReturn(square());
        LocationUpdateRequest outside = new LocationUpdateRequest(
                new BigDecimal("37.0200000"),
                new BigDecimal("127.0050000"),
                new BigDecimal("8.2"),
                Instant.parse("2026-08-25T08:55:30Z")
        );

        // when
        LocationUpdateResponse response = locationService.update(USER_ID, outside);

        // then
        assertThat(response.outside()).isTrue();
    }

    @Test
    void 연속_외부_좌표는_사용자별_카운트를_증가시킨다() {
        // given
        givenActiveTrip(USER_ID);
        givenActiveTrip(2L);

        // when
        LocationUpdateResponse firstUserFirst = locationService.update(USER_ID, outsideRequest());
        LocationUpdateResponse firstUserSecond = locationService.update(USER_ID, outsideRequest());
        LocationUpdateResponse secondUserFirst = locationService.update(2L, outsideRequest());

        // then
        assertThat(firstUserFirst.consecutiveOutsideCount()).isEqualTo(1);
        assertThat(firstUserSecond.consecutiveOutsideCount()).isEqualTo(2);
        assertThat(secondUserFirst.consecutiveOutsideCount()).isEqualTo(1);
    }

    @Test
    void 내부_좌표가_수신되면_연속_외부_카운트를_초기화한다() {
        // given
        givenActiveTrip(USER_ID);
        locationService.update(USER_ID, outsideRequest());
        locationService.update(USER_ID, outsideRequest());

        // when
        LocationUpdateResponse response = locationService.update(USER_ID, request());

        // then
        assertThat(response.consecutiveOutsideCount()).isZero();
    }

    @Test
    void 외부_좌표는_위치_로그로_남긴다() {
        // given
        givenActiveTrip(USER_ID);
        ArgumentCaptor<LocationLog> logCaptor = ArgumentCaptor.forClass(LocationLog.class);

        // when
        locationService.update(USER_ID, outsideRequest());

        // then
        then(locationLogRepository).should().save(logCaptor.capture());
        LocationLog log = logCaptor.getValue();
        assertThat(log.getTripId()).isEqualTo(TRIP_ID);
        assertThat(log.getUserId()).isEqualTo(USER_ID);
        assertThat(log.getLatitude()).isEqualByComparingTo("37.0200000");
        assertThat(log.getLongitude()).isEqualByComparingTo("127.0050000");
        assertThat(log.getCreatedAt()).isEqualTo(LocalDateTime.of(2026, 8, 25, 8, 55, 30));
    }

    @Test
    void 열두_번째_연속_외부_좌표는_카운트_12를_반환한다() {
        // given
        givenActiveTrip(USER_ID);

        // when
        LocationUpdateResponse response = null;
        for (int count = 0; count < 12; count++) {
            response = locationService.update(USER_ID, outsideRequest());
        }

        // then
        assertThat(response).isNotNull();
        assertThat(response.consecutiveOutsideCount()).isEqualTo(12);
    }

    @Test
    void 참여_여행이_없으면_위치_대상을_찾을_수_없다는_오류를_반환한다() {
        // given
        given(tripParticipantRepository.findFirstByUserIdOrderByCreatedAtDescIdDesc(USER_ID))
                .willReturn(Optional.empty());

        // when & then
        assertThatThrownBy(() -> locationService.update(USER_ID, request()))
                .isInstanceOf(LocationException.class)
                .satisfies(exception -> assertThat(((LocationException) exception).getErrorCode())
                        .isEqualTo(LocationErrorCode.PARTICIPATING_TRIP_NOT_FOUND));
    }

    @Test
    void 참여_정보의_여행이_없으면_여행_오류를_반환한다() {
        // given
        given(tripParticipantRepository.findFirstByUserIdOrderByCreatedAtDescIdDesc(USER_ID))
                .willReturn(Optional.of(participant()));
        given(tripRepository.findById(TRIP_ID)).willReturn(Optional.empty());

        // when & then
        assertThatThrownBy(() -> locationService.update(USER_ID, request()))
                .isInstanceOf(LocationException.class)
                .satisfies(exception -> assertThat(((LocationException) exception).getErrorCode())
                        .isEqualTo(LocationErrorCode.TRIP_NOT_FOUND));
    }

    @Test
    void 비활성_여행은_위치_전송_종료_오류를_반환한다() {
        // given
        given(tripParticipantRepository.findFirstByUserIdOrderByCreatedAtDescIdDesc(USER_ID))
                .willReturn(Optional.of(participant()));
        given(tripRepository.findById(TRIP_ID)).willReturn(Optional.of(trip(TripStatus.FINISHED)));

        // when & then
        assertThatThrownBy(() -> locationService.update(USER_ID, request()))
                .isInstanceOf(LocationException.class)
                .satisfies(exception -> assertThat(((LocationException) exception).getErrorCode())
                        .isEqualTo(LocationErrorCode.TRIP_INACTIVE));
    }

    @Test
    void 지오펜스_점이_세_개보다_적으면_설정_오류를_반환한다() {
        // given
        given(tripParticipantRepository.findFirstByUserIdOrderByCreatedAtDescIdDesc(USER_ID))
                .willReturn(Optional.of(participant()));
        given(tripRepository.findById(TRIP_ID)).willReturn(Optional.of(trip(TripStatus.ACTIVE)));
        given(geofencePointRepository.findAllByGeofenceIdOrderBySequenceAsc(GEOFENCE_ID))
                .willReturn(square().subList(0, 2));

        // when & then
        assertThatThrownBy(() -> locationService.update(USER_ID, request()))
                .isInstanceOf(LocationException.class)
                .satisfies(exception -> assertThat(((LocationException) exception).getErrorCode())
                        .isEqualTo(LocationErrorCode.GEOFENCE_NOT_CONFIGURED));
    }

    private LocationUpdateRequest request() {
        return new LocationUpdateRequest(
                new BigDecimal("37.0050000"),
                new BigDecimal("127.0050000"),
                new BigDecimal("8.2"),
                Instant.parse("2026-08-25T08:55:30Z")
        );
    }

    private LocationUpdateRequest outsideRequest() {
        return new LocationUpdateRequest(
                new BigDecimal("37.0200000"),
                new BigDecimal("127.0050000"),
                new BigDecimal("8.2"),
                Instant.parse("2026-08-25T08:55:30Z")
        );
    }

    private void givenActiveTrip(Long userId) {
        given(tripParticipantRepository.findFirstByUserIdOrderByCreatedAtDescIdDesc(userId))
                .willReturn(Optional.of(new TripParticipant(
                        100L + userId,
                        TRIP_ID,
                        userId,
                        null,
                        TripParticipantType.APP,
                        LocalDateTime.of(2026, 1, 1, 0, 0)
                )));
        given(tripRepository.findById(TRIP_ID)).willReturn(Optional.of(trip(TripStatus.ACTIVE)));
        given(geofencePointRepository.findAllByGeofenceIdOrderBySequenceAsc(GEOFENCE_ID))
                .willReturn(square());
    }

    private TripParticipant participant() {
        return new TripParticipant(
                1L,
                TRIP_ID,
                USER_ID,
                null,
                TripParticipantType.APP,
                LocalDateTime.of(2026, 1, 1, 0, 0)
        );
    }

    private Trip trip(TripStatus status) {
        return new Trip(
                TRIP_ID,
                99L,
                GEOFENCE_ID,
                "현장학습",
                null,
                null,
                LocalDateTime.of(2026, 1, 1, 9, 0),
                LocalDateTime.of(2026, 1, 1, 18, 0),
                status,
                LocalDateTime.of(2025, 12, 1, 0, 0)
        );
    }

    private List<GeofencePoint> square() {
        return List.of(
                point(0, "37.0000000", "127.0000000"),
                point(1, "37.0000000", "127.0100000"),
                point(2, "37.0100000", "127.0100000"),
                point(3, "37.0100000", "127.0000000")
        );
    }

    private GeofencePoint point(int sequence, String latitude, String longitude) {
        return new GeofencePoint(
                (long) sequence + 1,
                GEOFENCE_ID,
                sequence,
                new BigDecimal(latitude),
                new BigDecimal(longitude)
        );
    }
}

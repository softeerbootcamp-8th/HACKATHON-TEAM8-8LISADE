package com.palisade.travel.domain.geo.service;

import com.palisade.travel.domain.geo.dto.LocationUpdateRequest;
import com.palisade.travel.domain.geo.dto.LocationUpdateResponse;
import com.palisade.travel.domain.geo.exception.LocationErrorCode;
import com.palisade.travel.domain.geo.exception.LocationException;
import com.palisade.travel.domain.trip.entity.Trip;
import com.palisade.travel.domain.trip.entity.TripParticipant;
import com.palisade.travel.domain.trip.entity.TripStatus;
import com.palisade.travel.domain.trip.repository.TripParticipantRepository;
import com.palisade.travel.domain.trip.repository.TripRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;

@ExtendWith(MockitoExtension.class)
class LocationServiceTest {

    private static final Long USER_ID = 1L;
    private static final Long TRIP_ID = 10L;

    @Mock
    private TripParticipantRepository tripParticipantRepository;

    @Mock
    private TripRepository tripRepository;

    private LocationService locationService;

    @BeforeEach
    void setUp() {
        locationService = new LocationService(tripParticipantRepository, tripRepository);
    }

    @Test
    void 가장_최근에_참여한_여행을_위치_대상으로_선택한다() {
        // given
        given(tripParticipantRepository.findFirstByUserIdOrderByCreatedAtDescIdDesc(USER_ID))
                .willReturn(Optional.of(participant()));
        given(tripRepository.findById(TRIP_ID)).willReturn(Optional.of(trip(TripStatus.ACTIVE)));

        // when
        LocationUpdateResponse response = locationService.update(USER_ID, request());

        // then
        assertThat(response.tripId()).isEqualTo(TRIP_ID);
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

    private LocationUpdateRequest request() {
        return new LocationUpdateRequest(
                new BigDecimal("37.0050000"),
                new BigDecimal("127.0050000"),
                new BigDecimal("8.2"),
                Instant.parse("2026-08-25T08:55:30Z")
        );
    }

    private TripParticipant participant() {
        return new TripParticipant(1L, TRIP_ID, USER_ID, LocalDateTime.of(2026, 1, 1, 0, 0));
    }

    private Trip trip(TripStatus status) {
        return new Trip(
                TRIP_ID,
                99L,
                20L,
                "현장학습",
                null,
                LocalDateTime.of(2026, 1, 1, 9, 0),
                LocalDateTime.of(2026, 1, 1, 18, 0),
                status,
                LocalDateTime.of(2025, 12, 1, 0, 0)
        );
    }
}

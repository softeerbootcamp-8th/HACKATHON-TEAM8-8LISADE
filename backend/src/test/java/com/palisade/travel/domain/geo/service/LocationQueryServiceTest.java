package com.palisade.travel.domain.geo.service;

import com.palisade.travel.domain.geo.dto.StudentLocationResponse;
import com.palisade.travel.domain.geo.entity.CurrentLocation;
import com.palisade.travel.domain.geo.exception.LocationErrorCode;
import com.palisade.travel.domain.geo.exception.LocationException;
import com.palisade.travel.domain.geo.repository.CurrentLocationRepository;
import com.palisade.travel.domain.trip.entity.Trip;
import com.palisade.travel.domain.trip.entity.TripStatus;
import com.palisade.travel.domain.trip.repository.TripRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;

@ExtendWith(MockitoExtension.class)
class LocationQueryServiceTest {

    private static final Long TEACHER_ID = 99L;
    private static final Long TRIP_ID = 10L;

    @Mock
    private TripRepository tripRepository;

    @Mock
    private CurrentLocationRepository currentLocationRepository;

    private LocationQueryService locationQueryService;

    @BeforeEach
    void setUp() {
        locationQueryService = new LocationQueryService(tripRepository, currentLocationRepository);
    }

    @Test
    void 담당_교사는_여행_학생별_최신_위치_전체를_받는다() {
        // given
        given(tripRepository.findById(TRIP_ID)).willReturn(Optional.of(trip(TEACHER_ID)));
        given(currentLocationRepository.findAllByTripIdOrderByUserIdAsc(TRIP_ID)).willReturn(List.of(
                currentLocation(1L, "37.0050000", "127.0050000", false),
                currentLocation(2L, "37.0200000", "127.0050000", true)
        ));

        // when
        List<StudentLocationResponse> snapshot = locationQueryService.snapshot(TEACHER_ID, TRIP_ID);

        // then
        assertThat(snapshot).hasSize(2);
        assertThat(snapshot).extracting(StudentLocationResponse::userId).containsExactly(1L, 2L);
        assertThat(snapshot.get(1).outside()).isTrue();
    }

    @Test
    void 담당이_아닌_교사는_접근이_거부된다() {
        // given
        given(tripRepository.findById(TRIP_ID)).willReturn(Optional.of(trip(TEACHER_ID)));

        // when & then
        assertThatThrownBy(() -> locationQueryService.snapshot(1234L, TRIP_ID))
                .isInstanceOf(LocationException.class)
                .satisfies(exception -> assertThat(((LocationException) exception).getErrorCode())
                        .isEqualTo(LocationErrorCode.TRIP_ACCESS_FORBIDDEN));
    }

    @Test
    void 존재하지_않는_여행은_조회할_수_없다() {
        // given
        given(tripRepository.findById(TRIP_ID)).willReturn(Optional.empty());

        // when & then
        assertThatThrownBy(() -> locationQueryService.snapshot(TEACHER_ID, TRIP_ID))
                .isInstanceOf(LocationException.class)
                .satisfies(exception -> assertThat(((LocationException) exception).getErrorCode())
                        .isEqualTo(LocationErrorCode.TRIP_NOT_FOUND));
    }

    private Trip trip(Long teacherId) {
        return new Trip(
                TRIP_ID,
                teacherId,
                20L,
                "현장학습",
                "서울숲",
                null,
                LocalDateTime.of(2026, 1, 1, 9, 0),
                LocalDateTime.of(2026, 1, 1, 18, 0),
                TripStatus.ACTIVE,
                LocalDateTime.of(2025, 12, 1, 0, 0)
        );
    }

    private CurrentLocation currentLocation(Long userId, String latitude, String longitude, boolean outside) {
        return CurrentLocation.create(
                userId,
                TRIP_ID,
                new BigDecimal(latitude),
                new BigDecimal(longitude),
                outside,
                LocalDateTime.of(2026, 8, 25, 8, 55, 30)
        );
    }
}

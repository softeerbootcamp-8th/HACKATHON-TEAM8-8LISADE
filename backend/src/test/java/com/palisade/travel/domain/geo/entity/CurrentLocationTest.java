package com.palisade.travel.domain.geo.entity;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

class CurrentLocationTest {

    @Test
    void 정상_학생이_지오펜스를_벗어나면_그_수신_시각부터_이탈로_기록한다() {
        // given
        CurrentLocation location = location(false, LocalDateTime.of(2026, 8, 25, 9, 0));
        LocalDateTime departedAt = LocalDateTime.of(2026, 8, 25, 9, 1);

        // when
        location.update(new BigDecimal("37.0200000"), new BigDecimal("127.0200000"), true, departedAt);

        // then
        assertThat(location.getOutsideSince()).isEqualTo(departedAt);
    }

    @Test
    void 이탈_중인_학생이_위치를_계속_보내도_최초_이탈_시각을_유지한다() {
        // given
        LocalDateTime departedAt = LocalDateTime.of(2026, 8, 25, 9, 0);
        CurrentLocation location = location(true, departedAt);

        // when
        location.update(new BigDecimal("37.0210000"), new BigDecimal("127.0210000"), true,
                LocalDateTime.of(2026, 8, 25, 9, 2));

        // then
        assertThat(location.getOutsideSince()).isEqualTo(departedAt);
    }

    @Test
    void 이탈_학생이_지오펜스_안으로_돌아오면_이탈_시각을_지운다() {
        // given
        CurrentLocation location = location(true, LocalDateTime.of(2026, 8, 25, 9, 0));

        // when
        location.update(new BigDecimal("37.0050000"), new BigDecimal("127.0050000"), false,
                LocalDateTime.of(2026, 8, 25, 9, 3));

        // then
        assertThat(location.getOutsideSince()).isNull();
    }

    private CurrentLocation location(boolean outside, LocalDateTime updatedAt) {
        return CurrentLocation.create(1L, 10L, new BigDecimal("37.0050000"),
                new BigDecimal("127.0050000"), outside, updatedAt);
    }
}

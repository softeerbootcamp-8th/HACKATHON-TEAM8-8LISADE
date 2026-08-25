package com.palisade.travel.domain.geo.util;

import com.palisade.travel.domain.geo.entity.GeofencePoint;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class GeofenceUtilsTest {

    private static final List<GeofencePoint> SQUARE = List.of(
            point(0, "37.0000000", "127.0000000"),
            point(1, "37.0000000", "127.0100000"),
            point(2, "37.0100000", "127.0100000"),
            point(3, "37.0100000", "127.0000000")
    );

    @Test
    void 다각형_내부_좌표는_내부로_판정한다() {
        // given
        BigDecimal latitude = new BigDecimal("37.0050000");
        BigDecimal longitude = new BigDecimal("127.0050000");

        // when
        boolean inside = GeofenceUtils.contains(SQUARE, latitude, longitude);

        // then
        assertThat(inside).isTrue();
    }

    @Test
    void 다각형_외부_좌표는_외부로_판정한다() {
        // given
        BigDecimal latitude = new BigDecimal("37.0200000");
        BigDecimal longitude = new BigDecimal("127.0050000");

        // when
        boolean inside = GeofenceUtils.contains(SQUARE, latitude, longitude);

        // then
        assertThat(inside).isFalse();
    }

    @Test
    void 다각형_경계_좌표는_내부로_판정한다() {
        // given
        BigDecimal latitude = new BigDecimal("37.0050000");
        BigDecimal longitude = new BigDecimal("127.0000000");

        // when
        boolean inside = GeofenceUtils.contains(SQUARE, latitude, longitude);

        // then
        assertThat(inside).isTrue();
    }

    @Test
    void 오목_다각형의_내부_좌표는_변_외적_부호가_달라도_내부로_판정한다() {
        // given
        List<GeofencePoint> concave = List.of(
                point(0, "37.0000000", "127.0000000"),
                point(1, "37.0000000", "127.0040000"),
                point(2, "37.0040000", "127.0040000"),
                point(3, "37.0020000", "127.0020000"),
                point(4, "37.0040000", "127.0000000")
        );
        BigDecimal latitude = new BigDecimal("37.0030000");
        BigDecimal longitude = new BigDecimal("127.0010000");

        // when
        boolean inside = GeofenceUtils.contains(concave, latitude, longitude);

        // then
        assertThat(inside).isTrue();
    }

    @Test
    void 오목_다각형의_파인_영역에_있는_좌표는_외부로_판정한다() {
        // given
        List<GeofencePoint> concave = List.of(
                point(0, "37.0000000", "127.0000000"),
                point(1, "37.0000000", "127.0040000"),
                point(2, "37.0040000", "127.0040000"),
                point(3, "37.0020000", "127.0020000"),
                point(4, "37.0040000", "127.0000000")
        );
        BigDecimal latitude = new BigDecimal("37.0030000");
        BigDecimal longitude = new BigDecimal("127.0020000");

        // when
        boolean inside = GeofenceUtils.contains(concave, latitude, longitude);

        // then
        assertThat(inside).isFalse();
    }

    private static GeofencePoint point(int sequence, String latitude, String longitude) {
        return new GeofencePoint(
                (long) sequence + 1,
                1L,
                sequence,
                new BigDecimal(latitude),
                new BigDecimal(longitude)
        );
    }
}

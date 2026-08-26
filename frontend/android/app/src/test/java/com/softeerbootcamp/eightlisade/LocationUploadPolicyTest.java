package com.softeerbootcamp.eightlisade;

import static org.junit.Assert.assertArrayEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public class LocationUploadPolicyTest {
    @Test
    public void Given_위치_추적_When_주기_계약_확인_Then_1초마다_수집하고_10초마다_전송한다() {
        // given
        long[] expectedIntervals = {1_000, 10_000};

        // when
        long[] actualIntervals = {
            BackgroundLocationService.COLLECTION_INTERVAL_MILLIS,
            BackgroundLocationService.UPLOAD_INTERVAL_MILLIS
        };

        // then
        assertArrayEquals(expectedIntervals, actualIntervals);
    }

    @Test
    public void Given_허용_시간보다_오래된_좌표_When_신선도_판정_Then_전송에서_제외한다() {
        // given
        long nowElapsedNanos = 20_000_000_000L;
        long recordedElapsedNanos = 9_999_000_000L;

        // when
        boolean fresh = LocationUploadPolicy.isFresh(nowElapsedNanos, recordedElapsedNanos, 10_000);

        // then
        assertFalse(fresh);
    }

    @Test
    public void Given_허용_시간_안에_수집한_좌표_When_신선도_판정_Then_전송_후보로_허용한다() {
        // given
        long nowElapsedNanos = 20_000_000_000L;
        long recordedElapsedNanos = 19_000_000_000L;

        // when
        boolean fresh = LocationUploadPolicy.isFresh(nowElapsedNanos, recordedElapsedNanos, 10_000);

        // then
        assertTrue(fresh);
    }

    @Test
    public void Given_이미_처리한_recordedAt_When_새_좌표인지_판정_Then_재전송에서_제외한다() {
        // given
        long recordedAt = 1_777_000_000_000L;

        // when
        boolean newer = LocationUploadPolicy.isNewer(recordedAt, recordedAt);

        // then
        assertFalse(newer);
    }

}

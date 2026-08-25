package com.softeerbootcamp.eightlisade;

import static org.junit.Assert.assertEquals;

import org.junit.Test;

public class TrackingResponsePolicyTest {
    @Test
    public void Given_401응답_When_전송정책판단_Then_세션만료처리한다() {
        TrackingResponsePolicy policy = TrackingResponsePolicy.fromStatus(401);

        assertEquals(TrackingResponsePolicy.EXPIRE_SESSION, policy);
    }

    @Test
    public void Given_서버오류_When_전송정책판단_Then_다음위치수집을계속한다() {
        TrackingResponsePolicy policy = TrackingResponsePolicy.fromStatus(500);

        assertEquals(TrackingResponsePolicy.CONTINUE, policy);
    }

    @Test
    public void Given_410응답_When_전송정책판단_Then_위치전송만종료한다() {
        TrackingResponsePolicy policy = TrackingResponsePolicy.fromStatus(410);

        assertEquals(TrackingResponsePolicy.STOP_TRACKING, policy);
    }
}

package com.softeerbootcamp.eightlisade;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public class LocationEndpointPolicyTest {
    @Test
    public void Given_운영_HTTPS_API_When_주소_검증_Then_허용한다() {
        // given
        String endpoint = "https://api.8lisade.site/api/student/locations";

        // when
        boolean allowed = LocationEndpointPolicy.isAllowed(endpoint, false);

        // then
        assertTrue(allowed);
    }

    @Test
    public void Given_운영_HTTP_API_When_주소_검증_Then_거부한다() {
        // given
        String endpoint = "http://api.8lisade.site/api/student/locations";

        // when
        boolean allowed = LocationEndpointPolicy.isAllowed(endpoint, false);

        // then
        assertFalse(allowed);
    }

    @Test
    public void Given_로컬_디버그의_localhost_HTTP_When_주소_검증_Then_허용한다() {
        // given
        String endpoint = "http://localhost:8080/api/student/locations";

        // when
        boolean allowed = LocationEndpointPolicy.isAllowed(endpoint, true);

        // then
        assertTrue(allowed);
    }
}

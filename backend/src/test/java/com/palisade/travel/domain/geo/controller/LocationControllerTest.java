package com.palisade.travel.domain.geo.controller;

import com.palisade.travel.domain.geo.dto.LocationUpdateRequest;
import com.palisade.travel.domain.geo.dto.LocationUpdateResponse;
import com.palisade.travel.domain.geo.exception.LocationErrorCode;
import com.palisade.travel.domain.geo.exception.LocationException;
import com.palisade.travel.domain.geo.service.LocationService;
import com.palisade.travel.domain.user.entity.UserRole;
import com.palisade.travel.global.error.GlobalExceptionHandler;
import com.palisade.travel.global.security.UserPrincipal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;

import java.math.BigDecimal;
import java.time.Instant;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.never;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class LocationControllerTest {

    private LocationService locationService;
    private MockMvc mockMvc;
    private Authentication authentication;

    @BeforeEach
    void setUp() {
        locationService = org.mockito.Mockito.mock(LocationService.class);
        LocalValidatorFactoryBean validator = new LocalValidatorFactoryBean();
        validator.afterPropertiesSet();
        mockMvc = MockMvcBuilders.standaloneSetup(new LocationController(locationService))
                .setControllerAdvice(new GlobalExceptionHandler())
                .setValidator(validator)
                .build();

        UserPrincipal user = new UserPrincipal(42L, "student1", UserRole.STUDENT, "hash", true);
        authentication = UsernamePasswordAuthenticationToken.authenticated(
                user,
                null,
                user.getAuthorities()
        );
    }

    @Test
    void 세션_학생의_위치_요청은_사용자와_측정값을_서비스에_전달한다() throws Exception {
        // given
        LocationUpdateRequest request = validRequest();
        given(locationService.update(42L, request))
                .willReturn(new LocationUpdateResponse(10L, false, 0));

        // when & then
        mockMvc.perform(post("/api/student/locations")
                        .principal(authentication)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validJson()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.tripId").value(10))
                .andExpect(jsonPath("$.data.outside").value(false))
                .andExpect(jsonPath("$.data.consecutiveOutsideCount").value(0));
        then(locationService).should().update(42L, request);
    }

    @Test
    void 정확도가_없는_위치_요청도_허용한다() throws Exception {
        // given
        LocationUpdateRequest request = new LocationUpdateRequest(
                new BigDecimal("37.5665000"),
                new BigDecimal("126.9780000"),
                null,
                Instant.parse("2026-08-25T08:55:30.123Z")
        );
        given(locationService.update(42L, request))
                .willReturn(new LocationUpdateResponse(10L, false, 0));

        // when & then
        mockMvc.perform(post("/api/student/locations")
                        .principal(authentication)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "latitude": 37.5665000,
                                  "longitude": 126.9780000,
                                  "accuracy": null,
                                  "recordedAt": "2026-08-25T08:55:30.123Z"
                                }
                                """))
                .andExpect(status().isOk());
        then(locationService).should().update(42L, request);
    }

    @Test
    void 범위를_벗어난_위도는_검증_오류를_반환한다() throws Exception {
        // given
        String invalidLatitude = validJson().replace("37.5665000", "91.0000000");

        // when & then
        mockMvc.perform(post("/api/student/locations")
                        .principal(authentication)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invalidLatitude))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
        then(locationService).should(never()).update(any(), any());
    }

    @Test
    void 음수_정확도는_검증_오류를_반환한다() throws Exception {
        // given
        String negativeAccuracy = validJson().replace("8.2", "-0.1");

        // when & then
        mockMvc.perform(post("/api/student/locations")
                        .principal(authentication)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(negativeAccuracy))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
        then(locationService).should(never()).update(any(), any());
    }

    @Test
    void 측정_시각이_없으면_검증_오류를_반환한다() throws Exception {
        // given
        String missingRecordedAt = """
                {
                  "latitude": 37.5665000,
                  "longitude": 126.9780000,
                  "accuracy": 8.2
                }
                """;

        // when & then
        mockMvc.perform(post("/api/student/locations")
                        .principal(authentication)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(missingRecordedAt))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
        then(locationService).should(never()).update(any(), any());
    }

    @Test
    void 비활성_여행은_안드로이드_중단용_종료_응답을_반환한다() throws Exception {
        // given
        given(locationService.update(eq(42L), any()))
                .willThrow(new LocationException(LocationErrorCode.TRIP_INACTIVE));

        // when & then
        mockMvc.perform(post("/api/student/locations")
                        .principal(authentication)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validJson()))
                .andExpect(status().isGone())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.code").value("TRIP_INACTIVE"));
    }

    private LocationUpdateRequest validRequest() {
        return new LocationUpdateRequest(
                new BigDecimal("37.5665000"),
                new BigDecimal("126.9780000"),
                new BigDecimal("8.2"),
                Instant.parse("2026-08-25T08:55:30.123Z")
        );
    }

    private String validJson() {
        return """
                {
                  "latitude": 37.5665000,
                  "longitude": 126.9780000,
                  "accuracy": 8.2,
                  "recordedAt": "2026-08-25T08:55:30.123Z"
                }
                """;
    }
}

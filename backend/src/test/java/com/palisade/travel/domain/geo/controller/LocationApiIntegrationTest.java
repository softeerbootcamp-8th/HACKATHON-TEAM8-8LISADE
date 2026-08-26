package com.palisade.travel.domain.geo.controller;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class LocationApiIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private Long userId;
    private Long tripId;

    @BeforeEach
    void setUp() {
        jdbcTemplate.update("DELETE FROM location_log");
        jdbcTemplate.update("DELETE FROM current_location");
        jdbcTemplate.update("DELETE FROM geofence_point");
        jdbcTemplate.update("DELETE FROM trip_participant");
        jdbcTemplate.update("DELETE FROM trip");
        jdbcTemplate.update("DELETE FROM geofence");
        jdbcTemplate.update("DELETE FROM users");

        jdbcTemplate.update(
                "INSERT INTO users (login_id, password_hash, email, name, role, enabled, created_at) "
                        + "VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)",
                "student1",
                new BCryptPasswordEncoder().encode("password123"),
                "student1@example.com",
                "학생1",
                "STUDENT",
                true
        );
        userId = jdbcTemplate.queryForObject(
                "SELECT id FROM users WHERE login_id = 'student1'",
                Long.class
        );

        jdbcTemplate.update("INSERT INTO geofence (name, created_at) VALUES (?, CURRENT_TIMESTAMP)", "안전 구역");
        Long geofenceId = jdbcTemplate.queryForObject(
                "SELECT id FROM geofence WHERE name = '안전 구역'",
                Long.class
        );
        savePoint(geofenceId, 0, "37.0000000", "127.0000000");
        savePoint(geofenceId, 1, "37.0000000", "127.0100000");
        savePoint(geofenceId, 2, "37.0100000", "127.0100000");
        savePoint(geofenceId, 3, "37.0100000", "127.0000000");

        jdbcTemplate.update(
                "INSERT INTO trip (teacher_id, geofence_id, title, place, status, created_at) "
                        + "VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)",
                99L,
                geofenceId,
                "현장학습",
                "국립중앙박물관",
                "ACTIVE"
        );
        tripId = jdbcTemplate.queryForObject(
                "SELECT id FROM trip WHERE title = '현장학습'",
                Long.class
        );
        jdbcTemplate.update(
                "INSERT INTO trip (teacher_id, geofence_id, title, place, status, created_at) "
                        + "VALUES (?, ?, ?, ?, ?, ?)",
                99L,
                geofenceId,
                "지난 현장학습",
                "국립중앙박물관",
                "FINISHED",
                java.time.LocalDateTime.of(2025, 12, 1, 0, 0)
        );
        Long oldTripId = jdbcTemplate.queryForObject(
                "SELECT id FROM trip WHERE title = '지난 현장학습'",
                Long.class
        );
        jdbcTemplate.update(
                "INSERT INTO trip_participant (trip_id, user_id, participant_type, created_at) VALUES (?, ?, ?, ?)",
                oldTripId,
                userId,
                "APP",
                java.time.LocalDateTime.of(2025, 12, 1, 0, 0)
        );
        jdbcTemplate.update(
                "INSERT INTO trip_participant (trip_id, user_id, participant_type, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)",
                tripId,
                userId,
                "APP"
        );
    }

    @Test
    void 로그인_세션으로_보낸_위치는_학생의_가장_최근_여행에_저장된다() throws Exception {
        // given
        MockHttpSession session = login();

        // when & then
        mockMvc.perform(post("/api/student/locations")
                        .session(session)
                        .contentType("application/json")
                        .content(validJson()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.tripId").value(tripId))
                .andExpect(jsonPath("$.data.outside").value(false));

        Integer savedCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM current_location WHERE user_id = ? AND trip_id = ? "
                        + "AND latitude = ? AND longitude = ?",
                Integer.class,
                userId,
                tripId,
                new BigDecimal("37.0050000"),
                new BigDecimal("127.0050000")
        );
        assertThat(savedCount).isEqualTo(1);
    }

    @Test
    void 세션이_없는_위치_요청은_인증_오류를_반환한다() throws Exception {
        // given
        String location = validJson();

        // when & then
        mockMvc.perform(post("/api/student/locations")
                        .contentType("application/json")
                        .content(location))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
    }

    @Test
    void 교사_세션의_위치_요청은_학생_전용_인가에서_거부된다() throws Exception {
        // given
        jdbcTemplate.update("UPDATE users SET role = 'TEACHER' WHERE id = ?", userId);
        MockHttpSession teacherSession = login();

        // when & then
        mockMvc.perform(post("/api/student/locations")
                        .session(teacherSession)
                        .contentType("application/json")
                        .content(validJson()))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));
    }

    @Test
    void 수동_위치를_활성화해도_다음_전송_주기_전에는_선택한_좌표를_저장하지_않는다() throws Exception {
        // given
        MockHttpSession session = login();

        // when
        enableOverride(session, "37.0200000", "127.0200000");

        // then
        assertThat(savedLocationCount("37.0200000", "127.0200000")).isZero();
    }

    @Test
    void 수동_위치가_활성화된_세션의_GPS는_선택한_좌표로_저장된다() throws Exception {
        // given
        MockHttpSession session = login();
        enableOverride(session, "37.0200000", "127.0200000");

        // when
        mockMvc.perform(post("/api/student/locations")
                        .session(session)
                        .contentType("application/json")
                        .content(locationJson("37.0060000", "127.0060000", "2099-08-25T09:00:00Z")))
                .andExpect(status().isOk());

        // then
        assertThat(savedLocationCount("37.0200000", "127.0200000")).isEqualTo(1);
        assertThat(savedLocationCount("37.0060000", "127.0060000")).isZero();
    }

    @Test
    void 수동_위치를_해제하면_다음_GPS가_실제_좌표로_저장된다() throws Exception {
        // given
        MockHttpSession session = login();
        enableOverride(session, "37.0200000", "127.0200000");
        mockMvc.perform(delete("/api/student/locations/override")
                        .with(csrf())
                        .session(session))
                .andExpect(status().isOk());

        // when
        mockMvc.perform(post("/api/student/locations")
                        .session(session)
                        .contentType("application/json")
                        .content(locationJson("37.0060000", "127.0060000", "2099-08-25T09:00:00Z")))
                .andExpect(status().isOk());

        // then
        assertThat(savedLocationCount("37.0060000", "127.0060000")).isEqualTo(1);
    }

    @Test
    void 세션이_없는_수동_위치_활성화는_인증_오류를_반환한다() throws Exception {
        // given
        String manualLocation = "{\"latitude\":37.0200000,\"longitude\":127.0200000}";

        // when & then
        mockMvc.perform(put("/api/student/locations/override")
                        .with(csrf())
                        .contentType("application/json")
                        .content(manualLocation))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
    }

    private MockHttpSession login() throws Exception {
        return (MockHttpSession) mockMvc.perform(post("/api/auth/login")
                        .with(csrf())
                        .contentType("application/json")
                        .content("{\"loginId\":\"student1\",\"password\":\"password123\"}"))
                .andExpect(status().isOk())
                .andReturn()
                .getRequest()
                .getSession(false);
    }

    private void enableOverride(MockHttpSession session, String latitude, String longitude) throws Exception {
        mockMvc.perform(put("/api/student/locations/override")
                        .with(csrf())
                        .session(session)
                        .contentType("application/json")
                        .content("{\"latitude\":" + latitude + ",\"longitude\":" + longitude + "}"))
                .andExpect(status().isOk());
    }

    private int savedLocationCount(String latitude, String longitude) {
        return jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM current_location WHERE user_id = ? AND trip_id = ? AND latitude = ? AND longitude = ?",
                Integer.class,
                userId,
                tripId,
                new BigDecimal(latitude),
                new BigDecimal(longitude)
        );
    }

    private void savePoint(Long geofenceId, int sequence, String latitude, String longitude) {
        jdbcTemplate.update(
                "INSERT INTO geofence_point (geofence_id, sequence, latitude, longitude) VALUES (?, ?, ?, ?)",
                geofenceId,
                sequence,
                new BigDecimal(latitude),
                new BigDecimal(longitude)
        );
    }

    private String validJson() {
        return """
                {
                  "latitude": 37.0050000,
                  "longitude": 127.0050000,
                  "accuracy": 8.2,
                  "recordedAt": "2026-08-25T08:55:30.123Z"
                }
                """;
    }

    private String locationJson(String latitude, String longitude, String recordedAt) {
        return """
                {
                  "latitude": %s,
                  "longitude": %s,
                  "accuracy": 8.2,
                  "recordedAt": "%s"
                }
                """.formatted(latitude, longitude, recordedAt);
    }
}

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

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class TeacherLocationQueryApiIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private Long ownerTeacherId;
    private Long studentAId;
    private Long studentBId;
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

        ownerTeacherId = createUser("teacher1", "교사1", "TEACHER");
        createUser("teacher2", "교사2", "TEACHER");
        studentAId = createUser("studentA", "학생A", "STUDENT");
        studentBId = createUser("studentB", "학생B", "STUDENT");

        jdbcTemplate.update("INSERT INTO geofence (name, created_at) VALUES (?, CURRENT_TIMESTAMP)", "안전 구역");
        Long geofenceId = jdbcTemplate.queryForObject(
                "SELECT id FROM geofence WHERE name = '안전 구역'",
                Long.class
        );

        jdbcTemplate.update(
                "INSERT INTO trip (teacher_id, geofence_id, title, place, status, created_at) "
                        + "VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)",
                ownerTeacherId,
                geofenceId,
                "현장학습",
                "서울숲",
                "ACTIVE"
        );
        tripId = jdbcTemplate.queryForObject("SELECT id FROM trip WHERE title = '현장학습'", Long.class);

        saveCurrentLocation(studentAId, "37.0050000", "127.0050000", false);
        saveCurrentLocation(studentBId, "37.0200000", "127.0050000", true);
        savePoint(geofenceId, 0, "37.0000000", "127.0000000");
        savePoint(geofenceId, 1, "37.0100000", "127.0100000");
        savePoint(geofenceId, 2, "37.0100000", "127.0000000");
    }

    @Test
    void 담당_교사는_여행_학생들의_최신_위치_스냅샷을_받는다() throws Exception {
        // given
        MockHttpSession session = login("teacher1");

        // when & then
        mockMvc.perform(get("/api/teacher/trips/{tripId}/locations", tripId).session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.length()").value(2))
                .andExpect(jsonPath("$.data[0].tripId").value(tripId))
                .andExpect(jsonPath("$.data[0].userId").value(studentAId))
                .andExpect(jsonPath("$.data[0].outside").value(false))
                .andExpect(jsonPath("$.data[1].userId").value(studentBId))
                .andExpect(jsonPath("$.data[1].outside").value(true))
                .andExpect(jsonPath("$.data[1].outsideSince").isNotEmpty());
    }

    @Test
    void 담당_교사는_체험학습의_지오펜스를_조회한다() throws Exception {
        // given
        MockHttpSession session = login("teacher1");

        // when & then
        mockMvc.perform(get("/api/teacher/trips/{tripId}/geofence", tripId).session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(3))
                .andExpect(jsonPath("$.data[0].latitude").value(37.0))
                .andExpect(jsonPath("$.data[1].longitude").value(127.01));
    }

    @Test
    void 담당이_아닌_교사는_다른_여행의_위치를_조회할_수_없다() throws Exception {
        // given
        MockHttpSession session = login("teacher2");

        // when & then
        mockMvc.perform(get("/api/teacher/trips/{tripId}/locations", tripId).session(session))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("TRIP_ACCESS_FORBIDDEN"));
    }

    @Test
    void 학생_세션은_교사_위치_조회_API에_접근할_수_없다() throws Exception {
        // given
        MockHttpSession session = login("studentA");

        // when & then
        mockMvc.perform(get("/api/teacher/trips/{tripId}/locations", tripId).session(session))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));
    }

    private Long createUser(String loginId, String name, String role) {
        jdbcTemplate.update(
                "INSERT INTO users (login_id, password_hash, email, name, role, enabled, created_at) "
                        + "VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)",
                loginId,
                new BCryptPasswordEncoder().encode("password123"),
                loginId + "@example.com",
                name,
                role,
                true
        );
        return jdbcTemplate.queryForObject("SELECT id FROM users WHERE login_id = ?", Long.class, loginId);
    }

    private void saveCurrentLocation(Long userId, String latitude, String longitude, boolean outside) {
        jdbcTemplate.update(
                "INSERT INTO current_location (user_id, trip_id, latitude, longitude, is_outside, outside_since, updated_at) "
                        + "VALUES (?, ?, ?, ?, ?, CASE WHEN ? THEN CURRENT_TIMESTAMP ELSE NULL END, CURRENT_TIMESTAMP)",
                userId,
                tripId,
                new BigDecimal(latitude),
                new BigDecimal(longitude),
                outside,
                outside
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

    private MockHttpSession login(String loginId) throws Exception {
        return (MockHttpSession) mockMvc.perform(post("/api/auth/login")
                        .with(csrf())
                        .contentType("application/json")
                        .content("{\"loginId\":\"" + loginId + "\",\"password\":\"password123\"}"))
                .andExpect(status().isOk())
                .andReturn()
                .getRequest()
                .getSession(false);
    }
}

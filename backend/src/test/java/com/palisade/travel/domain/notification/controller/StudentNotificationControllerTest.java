package com.palisade.travel.domain.notification.controller;

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
import org.springframework.test.web.servlet.ResultActions;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class StudentNotificationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @BeforeEach
    void setUpUsers() {
        jdbcTemplate.update("DELETE FROM notification");
        jdbcTemplate.update("DELETE FROM users");
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
        jdbcTemplate.update(
                "INSERT INTO users (login_id, password_hash, email, name, role, enabled, created_at) "
                        + "VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)",
                "student1", encoder.encode("password123"), "student1@example.com", "학생1", "STUDENT", true);
        jdbcTemplate.update(
                "INSERT INTO users (login_id, password_hash, email, name, role, enabled, created_at) "
                        + "VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)",
                "teacher1", encoder.encode("password123"), "teacher1@example.com", "교사1", "TEACHER", true);
    }

    @Test
    void listRejectsRequestsWithoutASession() throws Exception {
        mockMvc.perform(get("/api/student/notifications"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void teacherCannotAccessTheStudentNotificationList() throws Exception {
        MockHttpSession session = (MockHttpSession) loginAs("teacher1").andReturn().getRequest().getSession(false);

        mockMvc.perform(get("/api/student/notifications").session(session))
                .andExpect(status().isForbidden());
    }

    @Test
    void listReturnsOnlyTheAuthenticatedStudentsNotificationsNewestFirst() throws Exception {
        Long studentId = jdbcTemplate.queryForObject("SELECT id FROM users WHERE login_id = ?", Long.class, "student1");
        Long otherId = jdbcTemplate.queryForObject("SELECT id FROM users WHERE login_id = ?", Long.class, "teacher1");
        jdbcTemplate.update(
                "INSERT INTO notification (user_id, trip_id, mission_id, type, title, message, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                studentId, 1L, null, "MISSION_CREATED", "새 미션 알림", "'사진 찍기' 미션이 등록됐어요.", "2026-08-26 09:00:00");
        jdbcTemplate.update(
                "INSERT INTO notification (user_id, trip_id, mission_id, type, title, message, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                studentId, 1L, null, "RANGE_EXIT", "안전 구역 이탈 알림", "안전 구역을 벗어났어요.", "2026-08-26 10:00:00");
        jdbcTemplate.update(
                "INSERT INTO notification (user_id, trip_id, mission_id, type, title, message, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                otherId, 1L, null, "MISSION_INCOMPLETED", "미션 미완료 알림", "다른 사용자 알림", "2026-08-26 11:00:00");
        MockHttpSession session = (MockHttpSession) loginAs("student1").andReturn().getRequest().getSession(false);

        mockMvc.perform(get("/api/student/notifications").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(2))
                .andExpect(jsonPath("$.data[0].type").value("RANGE_EXIT"))
                .andExpect(jsonPath("$.data[1].type").value("MISSION_CREATED"));
    }

    private ResultActions loginAs(String loginId) throws Exception {
        return mockMvc.perform(post("/api/auth/login")
                .with(csrf())
                .contentType("application/json")
                .content("{\"loginId\":\"" + loginId + "\",\"password\":\"password123\"}"));
    }
}

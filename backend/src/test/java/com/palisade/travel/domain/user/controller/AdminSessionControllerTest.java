package com.palisade.travel.domain.user.controller;

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
class AdminSessionControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @BeforeEach
    void setUpUsers() {
        jdbcTemplate.update("DELETE FROM device");
        jdbcTemplate.update("DELETE FROM users");
        String passwordHash = new BCryptPasswordEncoder().encode("password123");
        jdbcTemplate.update(
                "INSERT INTO users (login_id, password_hash, email, name, role, phone_number, enabled, created_at) "
                        + "VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)",
                "student1", passwordHash, "student1@example.com", "학생1", "STUDENT", "01012345678", true);
        jdbcTemplate.update(
                "INSERT INTO users (login_id, password_hash, email, name, role, phone_number, enabled, created_at) "
                        + "VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)",
                "admin1", passwordHash, "admin1@example.com", "관리자", "ADMIN", "01099998888", true);
    }

    @Test
    void adminCanForceExpireAllSessionsOfATargetUser() throws Exception {
        MockHttpSession studentSession = (MockHttpSession) login("student1").andReturn().getRequest().getSession(false);
        MockHttpSession adminSession = (MockHttpSession) login("admin1").andReturn().getRequest().getSession(false);

        Long studentId = jdbcTemplate.queryForObject(
                "SELECT id FROM users WHERE login_id = ?", Long.class, "student1");

        mockMvc.perform(get("/api/auth/me").session(studentSession))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/admin/users/{userId}/sessions/expire", studentId)
                        .session(adminSession)
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.userId").value(studentId))
                .andExpect(jsonPath("$.data.expiredSessionCount").value(1))
                .andExpect(jsonPath("$.data.revokedDeviceCount").value(0));

        mockMvc.perform(get("/api/auth/me").session(studentSession))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
    }

    @Test
    void forceExpiringSessionsAlsoDeletesAllFcmDeviceTokensOfTheTargetUser() throws Exception {
        MockHttpSession studentSession = (MockHttpSession) login("student1").andReturn().getRequest().getSession(false);
        MockHttpSession adminSession = (MockHttpSession) login("admin1").andReturn().getRequest().getSession(false);

        Long studentId = jdbcTemplate.queryForObject(
                "SELECT id FROM users WHERE login_id = ?", Long.class, "student1");
        jdbcTemplate.update(
                "INSERT INTO device (user_id, fcm_token, platform, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)",
                studentId, "fcm-token-1", "ANDROID");
        jdbcTemplate.update(
                "INSERT INTO device (user_id, fcm_token, platform, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)",
                studentId, "fcm-token-2", "IOS");

        mockMvc.perform(post("/api/admin/users/{userId}/sessions/expire", studentId)
                        .session(adminSession)
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.revokedDeviceCount").value(2));

        Integer remainingDeviceCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM device WHERE user_id = ?", Integer.class, studentId);
        org.junit.jupiter.api.Assertions.assertEquals(0, remainingDeviceCount);
    }

    @Test
    void nonAdminUserCannotCallTheForceExpireApi() throws Exception {
        MockHttpSession studentSession = (MockHttpSession) login("student1").andReturn().getRequest().getSession(false);
        Long studentId = jdbcTemplate.queryForObject(
                "SELECT id FROM users WHERE login_id = ?", Long.class, "student1");

        mockMvc.perform(post("/api/admin/users/{userId}/sessions/expire", studentId)
                        .session(studentSession)
                        .with(csrf()))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));
    }

    @Test
    void expiringSessionsForAnUnknownUserReturnsNotFound() throws Exception {
        MockHttpSession adminSession = (MockHttpSession) login("admin1").andReturn().getRequest().getSession(false);

        mockMvc.perform(post("/api/admin/users/{userId}/sessions/expire", 999_999L)
                        .session(adminSession)
                        .with(csrf()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("USER_NOT_FOUND"));
    }

    private ResultActions login(String loginId) throws Exception {
        return mockMvc.perform(post("/api/auth/login")
                .with(csrf())
                .contentType("application/json")
                .content("{\"loginId\":\"" + loginId + "\",\"password\":\"password123\"}"));
    }
}

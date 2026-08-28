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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class DeviceControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @BeforeEach
    void setUpUsers() {
        jdbcTemplate.update("DELETE FROM device");
        jdbcTemplate.update("DELETE FROM users");
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
        jdbcTemplate.update(
                "INSERT INTO users (login_id, password_hash, email, name, role, enabled, created_at) "
                        + "VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)",
                "student1", encoder.encode("password123"), "student1@example.com", "학생1", "STUDENT", true);
    }

    @Test
    void registerRejectsRequestsWithoutASession() throws Exception {
        mockMvc.perform(post("/api/notifications/devices")
                        .with(csrf())
                        .contentType("application/json")
                        .content("{\"token\":\"token-1\",\"platform\":\"WEB\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void registersADeviceTokenForTheAuthenticatedUser() throws Exception {
        MockHttpSession session = (MockHttpSession) loginAs("student1").andReturn().getRequest().getSession(false);

        mockMvc.perform(post("/api/notifications/devices")
                        .session(session)
                        .with(csrf())
                        .contentType("application/json")
                        .content("{\"token\":\"token-1\",\"platform\":\"WEB\"}"))
                .andExpect(status().isNoContent());

        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM device WHERE fcm_token = ?", Integer.class, "token-1");
        org.junit.jupiter.api.Assertions.assertEquals(1, count);
    }

    @Test
    void registrationStoresTheFcmTokenOnTheSessionForCleanupOnExpiry() throws Exception {
        MockHttpSession session = (MockHttpSession) loginAs("student1").andReturn().getRequest().getSession(false);

        mockMvc.perform(post("/api/notifications/devices")
                        .session(session)
                        .with(csrf())
                        .contentType("application/json")
                        .content("{\"token\":\"token-1\",\"platform\":\"WEB\"}"))
                .andExpect(status().isNoContent());

        org.junit.jupiter.api.Assertions.assertEquals(
                "token-1", session.getAttribute(DeviceController.FCM_TOKEN_ATTRIBUTE));
    }

    @Test
    void unregistersADeviceTokenForTheAuthenticatedUser() throws Exception {
        MockHttpSession session = (MockHttpSession) loginAs("student1").andReturn().getRequest().getSession(false);
        mockMvc.perform(post("/api/notifications/devices")
                .session(session)
                .with(csrf())
                .contentType("application/json")
                .content("{\"token\":\"token-1\",\"platform\":\"WEB\"}"));

        mockMvc.perform(delete("/api/notifications/devices")
                        .session(session)
                        .with(csrf())
                        .contentType("application/json")
                        .content("{\"token\":\"token-1\"}"))
                .andExpect(status().isNoContent());

        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM device WHERE fcm_token = ?", Integer.class, "token-1");
        org.junit.jupiter.api.Assertions.assertEquals(0, count);
    }

    private ResultActions loginAs(String loginId) throws Exception {
        return mockMvc.perform(post("/api/auth/login")
                .with(csrf())
                .contentType("application/json")
                .content("{\"loginId\":\"" + loginId + "\",\"password\":\"password123\"}"));
    }
}

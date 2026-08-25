package com.palisade.travel.domain.user.controller;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class UserSignUpControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @BeforeEach
    void clearUsers() {
        jdbcTemplate.update("DELETE FROM users");
    }

    @Test
    void studentSignUpPersistsRoleSpecificProfileAndBCryptPassword() throws Exception {
        mockMvc.perform(post("/api/auth/signup")
                        .with(csrf())
                        .contentType(APPLICATION_JSON)
                        .content("""
                                {"role":"STUDENT","name":"학생","loginId":"student1","password":"password123",
                                 "phoneNumber":"010-1111-2222","parentNumber":"010-3333-4444","guardianConsent":true}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        String passwordHash = jdbcTemplate.queryForObject(
                "SELECT password_hash FROM users WHERE login_id = ?", String.class, "student1");
        assertThat(passwordEncoder.matches("password123", passwordHash)).isTrue();
        assertThat(jdbcTemplate.queryForObject(
                "SELECT guardian_consent FROM users WHERE login_id = ?", Boolean.class, "student1")).isTrue();
    }

    @Test
    void teacherSignUpRequiresPhoneNumber() throws Exception {
        mockMvc.perform(post("/api/auth/signup")
                        .with(csrf())
                        .contentType(APPLICATION_JSON)
                        .content("""
                                {"role":"TEACHER","name":"교사","loginId":"teacher1","password":"password123"}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void studentSignUpRejectsMissingGuardianConsent() throws Exception {
        mockMvc.perform(post("/api/auth/signup")
                        .with(csrf())
                        .contentType(APPLICATION_JSON)
                        .content("""
                                {"role":"STUDENT","name":"학생","loginId":"student1","password":"password123",
                                 "phoneNumber":"010-1111-2222","parentNumber":"010-3333-4444","guardianConsent":false}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("GUARDIAN_CONSENT_REQUIRED"));
    }

    @Test
    void signUpRejectsDuplicateLoginId() throws Exception {
        jdbcTemplate.update(
                "INSERT INTO users (login_id, password_hash, email, name, role, enabled, created_at) "
                        + "VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)",
                "student1", "hash", "legacy@example.com", "기존 학생", "STUDENT", true);

        mockMvc.perform(post("/api/auth/signup")
                        .with(csrf())
                        .contentType(APPLICATION_JSON)
                        .content("""
                                {"role":"TEACHER","name":"교사","loginId":"student1","password":"password123",
                                 "phoneNumber":"010-1111-2222"}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("DUPLICATE_LOGIN_ID"));
    }
}

package com.palisade.travel.global.sse;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class SseControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @BeforeEach
    void setUpUsers() {
        jdbcTemplate.update("DELETE FROM users");
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
        jdbcTemplate.update(
                "INSERT INTO users (login_id, password_hash, email, name, role, enabled, created_at) "
                        + "VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)",
                "teacher1", encoder.encode("password123"), "teacher1@example.com", "교사1", "TEACHER", true);
        jdbcTemplate.update(
                "INSERT INTO users (login_id, password_hash, email, name, role, enabled, created_at) "
                        + "VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)",
                "student1", encoder.encode("password123"), "student1@example.com", "학생1", "STUDENT", true);
    }

    @Test
    void connectRejectsRequestsWithoutASession() throws Exception {
        mockMvc.perform(get("/api/teacher/sse/connect"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void connectRejectsAStudentSession() throws Exception {
        MockHttpSession session = (MockHttpSession) loginAs("student1").andReturn().getRequest().getSession(false);

        mockMvc.perform(get("/api/teacher/sse/connect").session(session))
                .andExpect(status().isForbidden());
    }

    @Test
    void connectStartsAnEventStreamForAnAuthenticatedTeacher() throws Exception {
        MockHttpSession session = (MockHttpSession) loginAs("teacher1").andReturn().getRequest().getSession(false);

        mockMvc.perform(get("/api/teacher/sse/connect").session(session))
                .andExpect(request().asyncStarted())
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.TEXT_EVENT_STREAM));
    }

    private ResultActions loginAs(String loginId) throws Exception {
        return mockMvc.perform(post("/api/auth/login")
                .with(csrf())
                .contentType("application/json")
                .content("{\"loginId\":\"" + loginId + "\",\"password\":\"password123\"}"));
    }
}

package com.palisade.travel.global.security;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.web.server.autoconfigure.ServerProperties;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.time.Duration;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class SessionAuthenticationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private ServerProperties serverProperties;

    @BeforeEach
    void setUpUser() {
        jdbcTemplate.update("DELETE FROM users");
        jdbcTemplate.update(
                "INSERT INTO users (login_id, password_hash, email, name, role, phone_number, enabled, created_at) "
                        + "VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)",
                "student1", new BCryptPasswordEncoder().encode("password123"),
                "student1@example.com", "학생1", "STUDENT", "01012345678", true);
    }

    @Test
    void currentUserEndpointRejectsRequestsWithoutASession() throws Exception {
        mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
    }

    @Test
    void studentLoginCreatesAnHttpSession() throws Exception {
        login()
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.loginId").value("student1"))
                .andExpect(jsonPath("$.data.role").value("STUDENT"));
    }

    @Test
    void Given_로그인_세션_When_쿠키를_발급하면_Then_앱_종료_후에도_12시간_보관한다() {
        // given & when
        Duration maxAge = serverProperties.getServlet().getSession().getCookie().getMaxAge();

        // then
        assertThat(maxAge).isEqualTo(Duration.ofHours(12));
    }

    @Test
    void 로그인_응답은_사용자의_전화번호를_포함한다() throws Exception {
        // given & when & then
        login()
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.phoneNumber").value("01012345678"));
    }

    @Test
    void loginWithAnInvalidPasswordReturnsUnauthorized() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .with(csrf())
                        .contentType("application/json")
                        .content("{\"loginId\":\"student1\",\"password\":\"wrong-password\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"))
                .andExpect(jsonPath("$.message").value("아이디 또는 비밀번호가 일치하지 않습니다."));
    }

    @Test
    void currentUserEndpointRestoresTheLoggedInUserFromTheSession() throws Exception {
        MockHttpSession session = (MockHttpSession) login().andReturn().getRequest().getSession(false);

        mockMvc.perform(get("/api/auth/me").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.loginId").value("student1"))
                .andExpect(jsonPath("$.data.name").value("학생1"))
                .andExpect(jsonPath("$.data.role").value("STUDENT"));
    }

    @Test
    void disabledAccountCannotLogIn() throws Exception {
        jdbcTemplate.update("UPDATE users SET enabled = false WHERE login_id = ?", "student1");

        mockMvc.perform(post("/api/auth/login")
                        .with(csrf())
                        .contentType("application/json")
                        .content("{\"loginId\":\"student1\",\"password\":\"password123\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("ACCOUNT_DISABLED"));
    }

    @Test
    void logoutInvalidatesTheHttpSession() throws Exception {
        MockHttpSession session = (MockHttpSession) login().andReturn().getRequest().getSession(false);

        mockMvc.perform(post("/api/auth/logout").session(session).with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        mockMvc.perform(get("/api/auth/me").session(session))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
    }

    @Test
    void csrfEndpointProvidesATokenForTheWebView() throws Exception {
        mockMvc.perform(get("/api/auth/csrf"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.token").isNotEmpty())
                .andExpect(jsonPath("$.data.headerName").value("X-CSRF-TOKEN"));
    }

    @Test
    void localMockStorageAcceptsAPhotoPutWithoutSessionOrCsrf() throws Exception {
        mockMvc.perform(put("/mock-storage/missions/2/students/10/photo.jpg")
                        .contentType("image/jpeg")
                        .content("photo"))
                .andExpect(status().isNoContent());
    }

    private org.springframework.test.web.servlet.ResultActions login() throws Exception {
        return mockMvc.perform(post("/api/auth/login")
                .with(csrf())
                .contentType("application/json")
                .content("{\"loginId\":\"student1\",\"password\":\"password123\"}"));
    }
}

package com.palisade.travel.domain.trip.controller;

import com.palisade.travel.domain.trip.dto.InviteCodeResponse;
import com.palisade.travel.domain.trip.dto.JoinTripResponse;
import com.palisade.travel.domain.trip.dto.TripParticipantResponse;
import com.palisade.travel.domain.trip.entity.TripParticipantType;
import com.palisade.travel.domain.trip.entity.TripStatus;
import com.palisade.travel.domain.trip.service.TripService;
import com.palisade.travel.global.error.GlobalExceptionHandler;
import com.palisade.travel.global.security.UserPrincipal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class TripControllerTest {
    private TripService tripService;
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        tripService = org.mockito.Mockito.mock(TripService.class);
        LocalValidatorFactoryBean validator = new LocalValidatorFactoryBean();
        validator.afterPropertiesSet();
        mockMvc = MockMvcBuilders.standaloneSetup(new TeacherTripController(tripService), new StudentTripController(tripService))
                .setControllerAdvice(new GlobalExceptionHandler())
                .setCustomArgumentResolvers(new TestUserPrincipalResolver())
                .setValidator(validator)
                .build();
    }

    @Test
    void 교사는_세_개_이상의_지오펜스_좌표로_체험학습을_생성한다() throws Exception {
        // given
        given(tripService.create(eq(10L), any())).willReturn(new InviteCodeResponse("AB1234", LocalDateTime.of(2026, 8, 25, 9, 5)));

        // when
        ResultActions result = mockMvc.perform(post("/api/teacher/trips")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title": "경복궁",
                                  "place": "서울",
                                  "startAt": "2026-08-25T00:00:00",
                                  "endAt": "2026-08-25T23:59:59",
                                  "geofencePoints": [
                                    {"latitude": 37.5796, "longitude": 126.9770},
                                    {"latitude": 37.5797, "longitude": 126.9780},
                                    {"latitude": 37.5788, "longitude": 126.9775}
                                  ]
                                }
                                """));

        // then
        result
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.code").value("AB1234"));
    }

    @Test
    void 지오펜스_좌표가_세_개보다_적으면_체험학습을_생성하지_않는다() throws Exception {
        // given
        String request = """
                {
                  "title": "경복궁",
                  "place": "서울",
                  "startAt": "2026-08-25T00:00:00",
                  "endAt": "2026-08-25T23:59:59",
                  "geofencePoints": [
                    {"latitude": 37.5796, "longitude": 126.9770},
                    {"latitude": 37.5797, "longitude": 126.9780}
                  ]
                }
                """;

        // when
        ResultActions result = mockMvc.perform(post("/api/teacher/trips")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(request));

        // then
        result
                .andExpect(status().isBadRequest());
        verifyNoInteractions(tripService);
    }

    @Test
    void studentCanJoinAndReadActiveTrip() throws Exception {
        JoinTripResponse trip = new JoinTripResponse(1L, "경복궁", "서울", TripStatus.ACTIVE);
        given(tripService.join(20L, "AB1234")).willReturn(trip);
        given(tripService.getActiveTrip(20L)).willReturn(trip);

        mockMvc.perform(post("/api/student/trips/join")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"AB1234\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.tripId").value(1));
        mockMvc.perform(get("/api/student/trips/active"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.title").value("경복궁"));
    }

    @Test
    void teacherCanAddAndListManualParticipants() throws Exception {
        TripParticipantResponse participant = new TripParticipantResponse(3L, null, "현장 확인 학생", TripParticipantType.MANUAL,
                LocalDateTime.of(2026, 8, 25, 9, 0));
        given(tripService.addManualParticipant(10L, 1L, "현장 확인 학생")).willReturn(participant);
        given(tripService.getParticipants(10L, 1L)).willReturn(List.of(participant));

        mockMvc.perform(post("/api/teacher/trips/1/participants/manual")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"현장 확인 학생\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.type").value("MANUAL"));
        mockMvc.perform(get("/api/teacher/trips/1/participants"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].name").value("현장 확인 학생"));
    }
}

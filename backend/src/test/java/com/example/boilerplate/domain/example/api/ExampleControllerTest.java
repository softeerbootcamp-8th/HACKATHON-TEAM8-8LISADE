package com.example.boilerplate.domain.example.api;

import com.example.boilerplate.domain.example.dto.ExampleResponse;
import com.example.boilerplate.domain.example.service.ExampleService;
import com.example.boilerplate.global.error.GlobalExceptionHandler;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class ExampleControllerTest {

    private ExampleService exampleService;
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        exampleService = org.mockito.Mockito.mock(ExampleService.class);
        LocalValidatorFactoryBean validator = new LocalValidatorFactoryBean();
        validator.afterPropertiesSet();
        mockMvc = MockMvcBuilders.standaloneSetup(new ExampleController(exampleService))
                .setControllerAdvice(new GlobalExceptionHandler())
                .setValidator(validator)
                .build();
    }

    @Test
    void blankNameOnCreateReturnsValidationError() throws Exception {
        mockMvc.perform(post("/api/examples")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\" \"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    void createsExampleWithCommonSuccessResponse() throws Exception {
        given(exampleService.create(any())).willReturn(exampleResponse(1L, "first example"));

        mockMvc.perform(post("/api/examples")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"first example\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(1))
                .andExpect(jsonPath("$.data.name").value("first example"));
    }

    @Test
    void getsExampleWithCommonSuccessResponse() throws Exception {
        given(exampleService.get(1L)).willReturn(exampleResponse(1L, "first example"));

        mockMvc.perform(get("/api/examples/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(1));
    }

    @Test
    void listsExamplesWithCommonSuccessResponse() throws Exception {
        given(exampleService.getAll()).willReturn(List.of(exampleResponse(1L, "first"), exampleResponse(2L, "second")));

        mockMvc.perform(get("/api/examples"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.length()").value(2))
                .andExpect(jsonPath("$.data[1].name").value("second"));
    }

    private ExampleResponse exampleResponse(Long id, String name) {
        return new ExampleResponse(id, name, LocalDateTime.of(2026, 1, 1, 0, 0));
    }
}

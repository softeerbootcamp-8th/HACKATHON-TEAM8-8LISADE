package com.palisade.travel.domain.example.service;

import com.palisade.travel.domain.example.entity.Example;
import com.palisade.travel.domain.example.exception.ExampleNotFoundException;
import com.palisade.travel.domain.example.dto.ExampleCreateRequest;
import com.palisade.travel.domain.example.dto.ExampleResponse;
import com.palisade.travel.domain.example.dto.ExampleUpdateRequest;
import com.palisade.travel.domain.example.repository.ExampleRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;

@ExtendWith(MockitoExtension.class)
class ExampleServiceTest {

    @Mock
    private ExampleRepository exampleRepository;

    @InjectMocks
    private ExampleService exampleService;

    @Test
    void createsExample() {
        given(exampleRepository.save(any(Example.class))).willAnswer(invocation -> {
            Example example = invocation.getArgument(0);
            return new Example(1L, example.getName(), example.getCreatedAt());
        });

        ExampleResponse response = exampleService.create(new ExampleCreateRequest("first example"));

        assertThat(response.id()).isEqualTo(1L);
        assertThat(response.name()).isEqualTo("first example");
        then(exampleRepository).should().save(any(Example.class));
    }

    @Test
    void getsExample() {
        Example example = example(1L, "first example");
        given(exampleRepository.findById(1L)).willReturn(Optional.of(example));

        ExampleResponse response = exampleService.get(1L);

        assertThat(response).isEqualTo(ExampleResponse.from(example));
    }

    @Test
    void listsExamples() {
        given(exampleRepository.findAll()).willReturn(List.of(example(1L, "first"), example(2L, "second")));

        List<ExampleResponse> responses = exampleService.getAll();

        assertThat(responses).extracting(ExampleResponse::name).containsExactly("first", "second");
    }

    @Test
    void updatesExampleName() {
        Example example = example(1L, "before");
        given(exampleRepository.findById(1L)).willReturn(Optional.of(example));

        ExampleResponse response = exampleService.update(1L, new ExampleUpdateRequest("after"));

        assertThat(response.name()).isEqualTo("after");
        assertThat(example.getName()).isEqualTo("after");
    }

    @Test
    void deletesExample() {
        Example example = example(1L, "first example");
        given(exampleRepository.findById(1L)).willReturn(Optional.of(example));

        exampleService.delete(1L);

        then(exampleRepository).should().delete(example);
    }

    @Test
    void throwsWhenExampleDoesNotExist() {
        given(exampleRepository.findById(99L)).willReturn(Optional.empty());

        assertThatThrownBy(() -> exampleService.get(99L))
                .isInstanceOf(ExampleNotFoundException.class);
    }

    private Example example(Long id, String name) {
        return new Example(id, name, LocalDateTime.of(2026, 1, 1, 0, 0));
    }
}

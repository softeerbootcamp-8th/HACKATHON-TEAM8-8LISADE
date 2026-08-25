package com.palisade.travel.domain.example.controller;

import com.palisade.travel.domain.example.dto.ExampleCreateRequest;
import com.palisade.travel.domain.example.dto.ExampleResponse;
import com.palisade.travel.domain.example.dto.ExampleUpdateRequest;
import com.palisade.travel.domain.example.service.ExampleService;
import com.palisade.travel.global.api.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/examples")
public class ExampleController {

    private final ExampleService exampleService;

    public ExampleController(ExampleService exampleService) {
        this.exampleService = exampleService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<ExampleResponse> create(@Valid @RequestBody ExampleCreateRequest request) {
        return ApiResponse.success(exampleService.create(request));
    }

    @GetMapping("/{id}")
    public ApiResponse<ExampleResponse> get(@PathVariable Long id) {
        return ApiResponse.success(exampleService.get(id));
    }

    @GetMapping
    public ApiResponse<List<ExampleResponse>> getAll() {
        return ApiResponse.success(exampleService.getAll());
    }

    @PatchMapping("/{id}")
    public ApiResponse<ExampleResponse> update(@PathVariable Long id,
                                               @Valid @RequestBody ExampleUpdateRequest request) {
        return ApiResponse.success(exampleService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        exampleService.delete(id);
    }
}

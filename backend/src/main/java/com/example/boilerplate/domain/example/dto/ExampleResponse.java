package com.example.boilerplate.domain.example.dto;

import com.example.boilerplate.domain.example.domain.Example;

import java.time.LocalDateTime;

public record ExampleResponse(Long id, String name, LocalDateTime createdAt) {

    public static ExampleResponse from(Example example) {
        return new ExampleResponse(example.getId(), example.getName(), example.getCreatedAt());
    }
}

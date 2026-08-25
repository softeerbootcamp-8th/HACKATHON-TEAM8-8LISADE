package com.palisade.travel.domain.example.dto;

import com.palisade.travel.domain.example.entity.Example;

import java.time.LocalDateTime;

public record ExampleResponse(Long id, String name, LocalDateTime createdAt) {

    public static ExampleResponse from(Example example) {
        return new ExampleResponse(example.getId(), example.getName(), example.getCreatedAt());
    }
}

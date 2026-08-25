package com.palisade.travel.domain.example.dto;

import jakarta.validation.constraints.NotBlank;

public record ExampleUpdateRequest(@NotBlank String name) {
}

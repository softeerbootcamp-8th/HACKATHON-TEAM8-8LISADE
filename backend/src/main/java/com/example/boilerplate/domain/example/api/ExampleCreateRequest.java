package com.example.boilerplate.domain.example.api;

import com.example.boilerplate.domain.example.dto.ExampleCreateCommand;
import jakarta.validation.constraints.NotBlank;

public record ExampleCreateRequest(@NotBlank String name) {

    public ExampleCreateCommand toCommand() {
        return new ExampleCreateCommand(name);
    }
}

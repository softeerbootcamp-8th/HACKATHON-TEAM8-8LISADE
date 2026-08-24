package com.example.boilerplate.domain.example.api;

import com.example.boilerplate.domain.example.dto.ExampleUpdateCommand;
import jakarta.validation.constraints.NotBlank;

public record ExampleUpdateRequest(@NotBlank String name) {

    public ExampleUpdateCommand toCommand() {
        return new ExampleUpdateCommand(name);
    }
}

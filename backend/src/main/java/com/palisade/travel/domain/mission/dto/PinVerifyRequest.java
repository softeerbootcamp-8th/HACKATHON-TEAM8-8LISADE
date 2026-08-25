package com.palisade.travel.domain.mission.dto;
import jakarta.validation.constraints.Pattern;
public record PinVerifyRequest(@Pattern(regexp = "\\d{4}") String pin) {}

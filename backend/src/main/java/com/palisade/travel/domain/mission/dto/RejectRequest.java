package com.palisade.travel.domain.mission.dto;
import jakarta.validation.constraints.NotBlank;
public record RejectRequest(@NotBlank String reason) {}

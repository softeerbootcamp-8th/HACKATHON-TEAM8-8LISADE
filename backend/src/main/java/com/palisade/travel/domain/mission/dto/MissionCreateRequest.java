package com.palisade.travel.domain.mission.dto;
import com.palisade.travel.domain.mission.entity.MissionType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;
public record MissionCreateRequest(@NotBlank String title, String description, @NotNull MissionType type, LocalDateTime startAt, LocalDateTime endAt) {}

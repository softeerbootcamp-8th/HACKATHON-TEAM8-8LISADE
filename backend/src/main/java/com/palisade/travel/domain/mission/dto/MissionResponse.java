package com.palisade.travel.domain.mission.dto;
import com.palisade.travel.domain.mission.entity.Mission;
import com.palisade.travel.domain.mission.entity.MissionType;
import java.time.LocalDateTime;
public record MissionResponse(Long id, Long tripId, String title, String description, MissionType type, LocalDateTime startAt, LocalDateTime endAt, LocalDateTime completedAt) { public static MissionResponse from(Mission m) { return new MissionResponse(m.getId(),m.getTripId(),m.getTitle(),m.getDescription(),m.getType(),m.getStartAt(),m.getEndAt(),m.getCompletedAt()); } }

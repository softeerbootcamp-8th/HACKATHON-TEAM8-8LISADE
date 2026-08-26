package com.palisade.travel.domain.mission.dto;

import com.palisade.travel.domain.mission.service.MissionService;

import java.util.List;

public record StudentMissionOverviewResponse(
        List<MissionResponse> currentMissions,
        int completedCount,
        int totalCount
) {
    public static StudentMissionOverviewResponse from(MissionService.StudentMissionOverview overview) {
        return new StudentMissionOverviewResponse(
                overview.currentMissions().stream().map(MissionResponse::from).toList(),
                overview.completedCount(),
                overview.totalCount()
        );
    }
}

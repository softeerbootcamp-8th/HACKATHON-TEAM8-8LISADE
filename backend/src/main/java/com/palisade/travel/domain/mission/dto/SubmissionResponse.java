package com.palisade.travel.domain.mission.dto;
import com.palisade.travel.domain.mission.entity.SubmissionStatus;
import com.palisade.travel.domain.mission.service.MissionService;
public record SubmissionResponse(Long submissionId, SubmissionStatus status, String imageKey) { public static SubmissionResponse from(MissionService.SubmissionResult r) { return new SubmissionResponse(r.submissionId(),r.status(),r.imageKey()); } }

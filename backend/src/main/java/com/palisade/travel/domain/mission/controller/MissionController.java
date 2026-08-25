package com.palisade.travel.domain.mission.controller;

import com.palisade.travel.domain.mission.dto.*;
import com.palisade.travel.domain.mission.service.MissionService;
import com.palisade.travel.global.api.ApiResponse;
import com.palisade.travel.global.security.UserPrincipal;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api")
public class MissionController {
    private final MissionService missionService;
    public MissionController(MissionService missionService) { this.missionService=missionService; }
    @PostMapping("/teacher/trips/{tripId}/missions") @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<MissionResponse> create(@PathVariable Long tripId, @AuthenticationPrincipal UserPrincipal user, @Valid @RequestBody MissionCreateRequest request) { return ApiResponse.success(MissionResponse.from(missionService.create(tripId,user.userId(),request.title(),request.description(),request.type(),request.startAt(),request.endAt()))); }
    @GetMapping("/teacher/trips/{tripId}/missions")
    public ApiResponse<List<MissionResponse>> teacherMissions(@PathVariable Long tripId, @AuthenticationPrincipal UserPrincipal user) { return ApiResponse.success(missionService.getTeacherMissions(tripId,user.userId()).stream().map(MissionResponse::from).toList()); }
    @PatchMapping("/teacher/missions/{missionId}")
    public ApiResponse<MissionResponse> update(@PathVariable Long missionId, @AuthenticationPrincipal UserPrincipal user, @Valid @RequestBody MissionCreateRequest request) { return ApiResponse.success(MissionResponse.from(missionService.update(missionId,user.userId(),request.title(),request.description(),request.startAt(),request.endAt()))); }
    @GetMapping("/trips/{tripId}/missions/current")
    public ApiResponse<List<MissionResponse>> currentMissions(@PathVariable Long tripId, @AuthenticationPrincipal UserPrincipal user) { return ApiResponse.success(missionService.getCurrentStudentMissions(tripId,user.userId()).stream().map(MissionResponse::from).toList()); }
    @GetMapping("/missions/{missionId}")
    public ApiResponse<MissionResponse> studentMission(@PathVariable Long missionId, @AuthenticationPrincipal UserPrincipal user) { return ApiResponse.success(MissionResponse.from(missionService.getStudentMission(missionId,user.userId()))); }
    @GetMapping("/teacher/missions/{missionId}/pin")
    public ApiResponse<String> pin(@PathVariable Long missionId, @AuthenticationPrincipal UserPrincipal user) { return ApiResponse.success(missionService.getPin(missionId,user.userId())); }
    @PostMapping("/missions/{missionId}/photo-upload")
    public ApiResponse<PresignedUploadResponse> preparePhoto(@PathVariable Long missionId, @AuthenticationPrincipal UserPrincipal user) { return ApiResponse.success(PresignedUploadResponse.from(missionService.preparePhotoUpload(missionId,user.userId()))); }
    @PostMapping("/missions/{missionId}/submissions/photo")
    public ApiResponse<SubmissionResponse> submitPhoto(@PathVariable Long missionId, @AuthenticationPrincipal UserPrincipal user, @Valid @RequestBody PhotoSubmitRequest request) { return ApiResponse.success(SubmissionResponse.from(missionService.submitPhoto(missionId,user.userId(),request.objectKey()))); }
    @PostMapping("/missions/{missionId}/submissions/pin")
    public ApiResponse<SubmissionResponse> verifyPin(@PathVariable Long missionId, @AuthenticationPrincipal UserPrincipal user, @Valid @RequestBody PinVerifyRequest request) { return ApiResponse.success(SubmissionResponse.from(missionService.verifyPin(missionId,user.userId(),request.pin()))); }
    @GetMapping("/missions/{missionId}/submission")
    public ApiResponse<SubmissionResponse> mySubmission(@PathVariable Long missionId, @AuthenticationPrincipal UserPrincipal user) { return ApiResponse.success(SubmissionResponse.from(missionService.getSubmission(missionId,user.userId()))); }
    @PostMapping("/teacher/missions/{missionId}/submissions/{studentId}/reject")
    public ApiResponse<Void> reject(@PathVariable Long missionId,@PathVariable Long studentId,@AuthenticationPrincipal UserPrincipal user) { missionService.reject(missionId,studentId,user.userId()); return ApiResponse.success(null); }
    @DeleteMapping("/teacher/missions/{missionId}") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long missionId,@AuthenticationPrincipal UserPrincipal user) { missionService.delete(missionId,user.userId()); }
}

package com.palisade.travel.domain.trip.controller;

import com.palisade.travel.domain.trip.dto.CreateTripRequest;
import com.palisade.travel.domain.trip.dto.InviteCodeResponse;
import com.palisade.travel.domain.trip.dto.ManualParticipantRequest;
import com.palisade.travel.domain.trip.dto.TripParticipantResponse;
import com.palisade.travel.domain.trip.service.TripService;
import com.palisade.travel.global.api.ApiResponse;
import com.palisade.travel.global.security.UserPrincipal;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/teacher/trips")
public class TeacherTripController {
    private final TripService tripService;

    public TeacherTripController(TripService tripService) {
        this.tripService = tripService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<InviteCodeResponse> create(@AuthenticationPrincipal UserPrincipal teacher,
                                                   @Valid @RequestBody CreateTripRequest request) {
        return ApiResponse.success(tripService.create(teacher.userId(), request));
    }

    @PostMapping("/{tripId}/invite-code")
    public ApiResponse<InviteCodeResponse> reissueInviteCode(@AuthenticationPrincipal UserPrincipal teacher,
                                                              @PathVariable Long tripId) {
        return ApiResponse.success(tripService.reissueInviteCode(teacher.userId(), tripId));
    }

    @GetMapping("/{tripId}/participants")
    public ApiResponse<List<TripParticipantResponse>> getParticipants(@AuthenticationPrincipal UserPrincipal teacher,
                                                                       @PathVariable Long tripId) {
        return ApiResponse.success(tripService.getParticipants(teacher.userId(), tripId));
    }

    @PostMapping("/{tripId}/participants/manual")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<TripParticipantResponse> addManualParticipant(@AuthenticationPrincipal UserPrincipal teacher,
                                                                       @PathVariable Long tripId,
                                                                       @Valid @RequestBody ManualParticipantRequest request) {
        return ApiResponse.success(tripService.addManualParticipant(teacher.userId(), tripId, request.name()));
    }
}

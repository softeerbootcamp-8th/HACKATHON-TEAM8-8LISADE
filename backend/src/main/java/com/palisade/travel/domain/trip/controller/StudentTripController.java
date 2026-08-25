package com.palisade.travel.domain.trip.controller;

import com.palisade.travel.domain.trip.dto.JoinTripRequest;
import com.palisade.travel.domain.trip.dto.JoinTripResponse;
import com.palisade.travel.domain.trip.service.TripService;
import com.palisade.travel.global.api.ApiResponse;
import com.palisade.travel.global.security.UserPrincipal;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/student/trips")
public class StudentTripController {
    private final TripService tripService;

    public StudentTripController(TripService tripService) {
        this.tripService = tripService;
    }

    @PostMapping("/join")
    public ApiResponse<JoinTripResponse> join(@AuthenticationPrincipal UserPrincipal student,
                                              @Valid @RequestBody JoinTripRequest request) {
        return ApiResponse.success(tripService.join(student.userId(), request.code()));
    }

    @GetMapping("/active")
    public ApiResponse<JoinTripResponse> getActiveTrip(@AuthenticationPrincipal UserPrincipal student) {
        return ApiResponse.success(tripService.getActiveTrip(student.userId()));
    }
}

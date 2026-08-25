package com.palisade.travel.domain.geo.controller;

import com.palisade.travel.domain.geo.dto.StudentLocationResponse;
import com.palisade.travel.domain.geo.service.LocationQueryService;
import com.palisade.travel.global.api.ApiResponse;
import com.palisade.travel.global.security.UserPrincipal;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/teacher/trips/{tripId}/locations")
public class LocationQueryController {

    private final LocationQueryService locationQueryService;

    public LocationQueryController(LocationQueryService locationQueryService) {
        this.locationQueryService = locationQueryService;
    }

    @GetMapping
    public ApiResponse<List<StudentLocationResponse>> snapshot(Authentication authentication,
                                                               @PathVariable Long tripId) {
        UserPrincipal user = (UserPrincipal) authentication.getPrincipal();
        return ApiResponse.success(locationQueryService.snapshot(user.userId(), tripId));
    }
}

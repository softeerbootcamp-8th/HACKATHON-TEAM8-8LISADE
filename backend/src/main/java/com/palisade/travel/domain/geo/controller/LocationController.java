package com.palisade.travel.domain.geo.controller;

import com.palisade.travel.domain.geo.dto.LocationUpdateRequest;
import com.palisade.travel.domain.geo.dto.LocationUpdateResponse;
import com.palisade.travel.domain.geo.service.LocationService;
import com.palisade.travel.global.api.ApiResponse;
import com.palisade.travel.global.security.UserPrincipal;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/student/locations")
public class LocationController {

    private final LocationService locationService;

    public LocationController(LocationService locationService) {
        this.locationService = locationService;
    }

    @PostMapping
    public ApiResponse<LocationUpdateResponse> update(Authentication authentication,
                                                      @Valid @RequestBody LocationUpdateRequest request) {
        UserPrincipal user = (UserPrincipal) authentication.getPrincipal();
        return ApiResponse.success(locationService.update(user.userId(), request));
    }
}

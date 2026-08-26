package com.palisade.travel.domain.geo.controller;

import com.palisade.travel.domain.geo.dto.LocationOverrideRequest;
import com.palisade.travel.domain.geo.dto.LocationOverrideResponse;
import com.palisade.travel.domain.geo.dto.LocationUpdateRequest;
import com.palisade.travel.domain.geo.dto.LocationUpdateResponse;
import com.palisade.travel.domain.geo.service.LocationService;
import com.palisade.travel.global.api.ApiResponse;
import com.palisade.travel.global.security.UserPrincipal;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;

@RestController
@RequestMapping("/api/student/locations")
@RequiredArgsConstructor
public class LocationController {

    private static final String OVERRIDE_LATITUDE = LocationController.class.getName() + ".overrideLatitude";
    private static final String OVERRIDE_LONGITUDE = LocationController.class.getName() + ".overrideLongitude";

    private final LocationService locationService;

    @PostMapping
    public ApiResponse<LocationUpdateResponse> update(Authentication authentication,
                                                      @Valid @RequestBody LocationUpdateRequest request,
                                                      HttpSession session) {
        UserPrincipal user = (UserPrincipal) authentication.getPrincipal();
        return ApiResponse.success(locationService.update(user.userId(), applyOverride(session, request)));
    }

    @GetMapping("/override")
    public ApiResponse<LocationOverrideResponse> getOverride(HttpSession session) {
        return ApiResponse.success(currentOverride(session));
    }

    @PutMapping("/override")
    public ApiResponse<LocationOverrideResponse> enableOverride(@Valid @RequestBody LocationOverrideRequest request,
                                                               HttpSession session) {
        // WebView와 Android 네이티브 요청이 같은 JSESSIONID를 쓰므로 세션에 둔 좌표 하나로 두 경로를 함께 제어한다.
        session.setAttribute(OVERRIDE_LATITUDE, request.latitude());
        session.setAttribute(OVERRIDE_LONGITUDE, request.longitude());
        return ApiResponse.success(new LocationOverrideResponse(true, request.latitude(), request.longitude()));
    }

    @DeleteMapping("/override")
    public ApiResponse<LocationOverrideResponse> disableOverride(HttpSession session) {
        session.removeAttribute(OVERRIDE_LATITUDE);
        session.removeAttribute(OVERRIDE_LONGITUDE);
        return ApiResponse.success(new LocationOverrideResponse(false, null, null));
    }

    private LocationUpdateRequest applyOverride(HttpSession session, LocationUpdateRequest request) {
        LocationOverrideResponse override = currentOverride(session);
        if (!override.enabled()) {
            return request;
        }
        return new LocationUpdateRequest(
                override.latitude(),
                override.longitude(),
                BigDecimal.ZERO,
                request.recordedAt()
        );
    }

    private LocationOverrideResponse currentOverride(HttpSession session) {
        BigDecimal latitude = (BigDecimal) session.getAttribute(OVERRIDE_LATITUDE);
        BigDecimal longitude = (BigDecimal) session.getAttribute(OVERRIDE_LONGITUDE);
        return latitude == null || longitude == null
                ? new LocationOverrideResponse(false, null, null)
                : new LocationOverrideResponse(true, latitude, longitude);
    }
}

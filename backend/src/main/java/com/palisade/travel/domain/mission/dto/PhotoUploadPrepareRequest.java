package com.palisade.travel.domain.mission.dto;
import jakarta.validation.constraints.Pattern;
public record PhotoUploadPrepareRequest(@Pattern(regexp = "image/jpeg|image/png", message = "지원하지 않는 사진 형식입니다.") String contentType) {}

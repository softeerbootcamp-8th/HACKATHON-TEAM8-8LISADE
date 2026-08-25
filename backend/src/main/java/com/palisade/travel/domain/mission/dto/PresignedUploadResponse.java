package com.palisade.travel.domain.mission.dto;
import com.palisade.travel.domain.mission.storage.StoragePresigner;
public record PresignedUploadResponse(String objectKey, String uploadUrl) { public static PresignedUploadResponse from(StoragePresigner.PresignedUpload upload) { return new PresignedUploadResponse(upload.objectKey(),upload.uploadUrl()); } }

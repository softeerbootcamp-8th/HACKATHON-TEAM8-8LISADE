package com.palisade.travel.domain.mission.storage;
public interface StoragePresigner { PresignedUpload presignPut(String objectKey); record PresignedUpload(String objectKey, String uploadUrl) {} }

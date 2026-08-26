package com.palisade.travel.domain.mission.storage;

import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Component
@Profile({"local", "test"})
public class LocalStoragePresigner implements StoragePresigner {

    private static final String MOCK_STORAGE_BASE_URL = "http://localhost:8080/mock-storage/";

    @Override
    public PresignedUpload presignPut(String objectKey, String contentType) {
        return new PresignedUpload(objectKey, MOCK_STORAGE_BASE_URL + objectKey);
    }

    @Override
    public String presignGet(String objectKey) {
        return MOCK_STORAGE_BASE_URL + objectKey;
    }

    @Override
    public void deleteObject(String objectKey) {
        // 로컬/테스트 환경에는 실제 저장소가 없다.
    }
}

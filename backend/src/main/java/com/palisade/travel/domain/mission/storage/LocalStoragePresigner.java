package com.palisade.travel.domain.mission.storage;

import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Component
@Profile({"local", "test"})
public class LocalStoragePresigner implements StoragePresigner {

    @Override
    public PresignedUpload presignPut(String objectKey) {
        return new PresignedUpload(objectKey, "http://localhost:8080/mock-storage/" + objectKey);
    }
}

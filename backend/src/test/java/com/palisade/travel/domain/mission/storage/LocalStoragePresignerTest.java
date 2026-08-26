package com.palisade.travel.domain.mission.storage;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class LocalStoragePresignerTest {

    @Test
    void returnsALocalPutEndpointForTheIssuedObjectKey() {
        LocalStoragePresigner presigner = new LocalStoragePresigner();

        StoragePresigner.PresignedUpload upload = presigner.presignPut("missions/12/students/3/photo.jpg", "image/jpeg");

        assertThat(upload.objectKey()).isEqualTo("missions/12/students/3/photo.jpg");
        assertThat(upload.uploadUrl()).isEqualTo("http://localhost:8080/mock-storage/missions/12/students/3/photo.jpg");
    }

    @Test
    void returnsALocalViewUrlForTheStoredObjectKey() {
        LocalStoragePresigner presigner = new LocalStoragePresigner();

        String viewUrl = presigner.presignGet("upload/missions/12/students/3/photo.jpg");

        assertThat(viewUrl).isEqualTo("http://localhost:8080/mock-storage/upload/missions/12/students/3/photo.jpg");
    }

    @Test
    void doesNothingWhenDeletingAnObject() {
        LocalStoragePresigner presigner = new LocalStoragePresigner();

        org.assertj.core.api.Assertions.assertThatCode(() -> presigner.deleteObject("upload/missions/12/students/3/photo.jpg"))
                .doesNotThrowAnyException();
    }
}

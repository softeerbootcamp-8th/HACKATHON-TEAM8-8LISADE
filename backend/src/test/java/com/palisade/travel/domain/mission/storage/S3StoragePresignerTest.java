package com.palisade.travel.domain.mission.storage;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

import java.net.URI;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class S3StoragePresignerTest {

    @Test
    void createsAFiveMinutePutUrlForTheConfiguredBucketAndObjectKey() throws Exception {
        S3Presigner client = mock(S3Presigner.class);
        PresignedPutObjectRequest request = mock(PresignedPutObjectRequest.class);
        when(client.presignPutObject(any(PutObjectPresignRequest.class))).thenReturn(request);
        when(request.url()).thenReturn(URI.create("https://bucket.s3.amazonaws.com/upload.jpg").toURL());
        S3StoragePresigner presigner = new S3StoragePresigner(client, "field-trip-photos");

        StoragePresigner.PresignedUpload upload = presigner.presignPut("missions/12/students/3/photo.jpg");

        ArgumentCaptor<PutObjectPresignRequest> captor = ArgumentCaptor.forClass(PutObjectPresignRequest.class);
        org.mockito.Mockito.verify(client).presignPutObject(captor.capture());
        assertThat(captor.getValue().signatureDuration()).isEqualTo(java.time.Duration.ofMinutes(5));
        assertThat(captor.getValue().putObjectRequest().bucket()).isEqualTo("field-trip-photos");
        assertThat(captor.getValue().putObjectRequest().key()).isEqualTo("missions/12/students/3/photo.jpg");
        assertThat(upload.uploadUrl()).isEqualTo("https://bucket.s3.amazonaws.com/upload.jpg");
    }
}

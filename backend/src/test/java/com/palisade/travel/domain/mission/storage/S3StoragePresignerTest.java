package com.palisade.travel.domain.mission.storage;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

import java.net.URI;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class S3StoragePresignerTest {

    @Test
    void createsAFiveMinutePutUrlForTheConfiguredBucketAndObjectKey() throws Exception {
        S3Presigner client = mock(S3Presigner.class);
        PresignedPutObjectRequest request = mock(PresignedPutObjectRequest.class);
        when(client.presignPutObject(any(PutObjectPresignRequest.class))).thenReturn(request);
        when(request.url()).thenReturn(URI.create("https://bucket.s3.amazonaws.com/upload.jpg").toURL());
        S3StoragePresigner presigner = new S3StoragePresigner(client, mock(S3Client.class), "field-trip-photos");

        StoragePresigner.PresignedUpload upload = presigner.presignPut("missions/12/students/3/photo.jpg", "image/jpeg");

        ArgumentCaptor<PutObjectPresignRequest> captor = ArgumentCaptor.forClass(PutObjectPresignRequest.class);
        org.mockito.Mockito.verify(client).presignPutObject(captor.capture());
        assertThat(captor.getValue().signatureDuration()).isEqualTo(java.time.Duration.ofMinutes(5));
        assertThat(captor.getValue().putObjectRequest().bucket()).isEqualTo("field-trip-photos");
        assertThat(captor.getValue().putObjectRequest().key()).isEqualTo("missions/12/students/3/photo.jpg");
        assertThat(captor.getValue().putObjectRequest().contentType()).isEqualTo("image/jpeg");
        assertThat(upload.uploadUrl()).isEqualTo("https://bucket.s3.amazonaws.com/upload.jpg");
    }

    @Test
    void signsWithThePngContentTypeWhenTheUploadIsAPng() throws Exception {
        S3Presigner client = mock(S3Presigner.class);
        PresignedPutObjectRequest request = mock(PresignedPutObjectRequest.class);
        when(client.presignPutObject(any(PutObjectPresignRequest.class))).thenReturn(request);
        when(request.url()).thenReturn(URI.create("https://bucket.s3.amazonaws.com/upload.png").toURL());
        S3StoragePresigner presigner = new S3StoragePresigner(client, mock(S3Client.class), "field-trip-photos");

        presigner.presignPut("missions/12/students/3/photo.png", "image/png");

        ArgumentCaptor<PutObjectPresignRequest> captor = ArgumentCaptor.forClass(PutObjectPresignRequest.class);
        org.mockito.Mockito.verify(client).presignPutObject(captor.capture());
        assertThat(captor.getValue().putObjectRequest().contentType()).isEqualTo("image/png");
    }

    @Test
    void createsAThirtyMinuteGetUrlForTheConfiguredBucketAndObjectKey() throws Exception {
        S3Presigner client = mock(S3Presigner.class);
        PresignedGetObjectRequest request = mock(PresignedGetObjectRequest.class);
        when(client.presignGetObject(any(GetObjectPresignRequest.class))).thenReturn(request);
        when(request.url()).thenReturn(URI.create("https://bucket.s3.amazonaws.com/view.jpg").toURL());
        S3StoragePresigner presigner = new S3StoragePresigner(client, mock(S3Client.class), "field-trip-photos");

        String viewUrl = presigner.presignGet("upload/missions/12/students/3/photo.jpg");

        ArgumentCaptor<GetObjectPresignRequest> captor = ArgumentCaptor.forClass(GetObjectPresignRequest.class);
        org.mockito.Mockito.verify(client).presignGetObject(captor.capture());
        assertThat(captor.getValue().signatureDuration()).isEqualTo(java.time.Duration.ofMinutes(30));
        assertThat(captor.getValue().getObjectRequest().bucket()).isEqualTo("field-trip-photos");
        assertThat(captor.getValue().getObjectRequest().key()).isEqualTo("upload/missions/12/students/3/photo.jpg");
        assertThat(viewUrl).isEqualTo("https://bucket.s3.amazonaws.com/view.jpg");
    }

    @Test
    void deletesTheObjectAtTheConfiguredBucketAndKey() {
        S3Client s3Client = mock(S3Client.class);
        S3StoragePresigner presigner = new S3StoragePresigner(mock(S3Presigner.class), s3Client, "field-trip-photos");

        presigner.deleteObject("upload/missions/12/students/3/photo.jpg");

        ArgumentCaptor<DeleteObjectRequest> captor = ArgumentCaptor.forClass(DeleteObjectRequest.class);
        verify(s3Client).deleteObject(captor.capture());
        assertThat(captor.getValue().bucket()).isEqualTo("field-trip-photos");
        assertThat(captor.getValue().key()).isEqualTo("upload/missions/12/students/3/photo.jpg");
    }

    @Test
    void swallowsAnS3ExceptionSoTheCallerIsNotAffected() {
        S3Client s3Client = mock(S3Client.class);
        when(s3Client.deleteObject(any(DeleteObjectRequest.class))).thenThrow(S3Exception.builder().message("boom").build());
        S3StoragePresigner presigner = new S3StoragePresigner(mock(S3Presigner.class), s3Client, "field-trip-photos");

        assertThatCode(() -> presigner.deleteObject("upload/missions/12/students/3/photo.jpg")).doesNotThrowAnyException();
    }
}

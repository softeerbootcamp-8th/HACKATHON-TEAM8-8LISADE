package com.palisade.travel.domain.mission.storage;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

import java.time.Duration;

@Component
@Profile("prod")
public class S3StoragePresigner implements StoragePresigner {

    private static final Logger log = LoggerFactory.getLogger(S3StoragePresigner.class);

    private static final Duration UPLOAD_SIGNATURE_DURATION = Duration.ofMinutes(5);
    /** 교사가 현황판을 열어둔 채로 URL 이 만료되지 않도록 조회는 더 길게 잡는다. */
    private static final Duration VIEW_SIGNATURE_DURATION = Duration.ofMinutes(30);

    private final S3Presigner s3Presigner;
    private final S3Client s3Client;
    private final String bucket;

    public S3StoragePresigner(S3Presigner s3Presigner, S3Client s3Client, @Value("${storage.s3.bucket}") String bucket) {
        this.s3Presigner = s3Presigner;
        this.s3Client = s3Client;
        this.bucket = bucket;
    }

    @Override
    public PresignedUpload presignPut(String objectKey, String contentType) {
        PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                .bucket(bucket)
                .key(objectKey)
                .contentType(contentType)
                .build();
        PresignedPutObjectRequest presignedRequest = s3Presigner.presignPutObject(PutObjectPresignRequest.builder()
                .signatureDuration(UPLOAD_SIGNATURE_DURATION)
                .putObjectRequest(putObjectRequest)
                .build());
        return new PresignedUpload(objectKey, presignedRequest.url().toString());
    }

    @Override
    public String presignGet(String objectKey) {
        GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                .bucket(bucket)
                .key(objectKey)
                .build();
        PresignedGetObjectRequest presignedRequest = s3Presigner.presignGetObject(GetObjectPresignRequest.builder()
                .signatureDuration(VIEW_SIGNATURE_DURATION)
                .getObjectRequest(getObjectRequest)
                .build());
        return presignedRequest.url().toString();
    }

    @Override
    public void deleteObject(String objectKey) {
        try {
            s3Client.deleteObject(DeleteObjectRequest.builder()
                    .bucket(bucket)
                    .key(objectKey)
                    .build());
        } catch (S3Exception exception) {
            log.warn("S3 object 삭제 실패: bucket={}, key={}", bucket, objectKey, exception);
        }
    }
}

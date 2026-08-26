package com.palisade.travel.domain.mission.storage;
public interface StoragePresigner {

    PresignedUpload presignPut(String objectKey, String contentType);

    /** 저장된 object 를 조회할 수 있는 만료형 URL 을 발급한다. */
    String presignGet(String objectKey);

    /** 저장된 object 를 삭제한다. 실패해도 호출자의 트랜잭션을 막지 않는다(best-effort). */
    void deleteObject(String objectKey);

    record PresignedUpload(String objectKey, String uploadUrl) {}
}

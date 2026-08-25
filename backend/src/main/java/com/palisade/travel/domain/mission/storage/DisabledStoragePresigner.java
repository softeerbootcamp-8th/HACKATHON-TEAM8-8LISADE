package com.palisade.travel.domain.mission.storage;
import com.palisade.travel.global.error.ApiException;
import com.palisade.travel.global.error.CommonErrorCode;
import org.springframework.stereotype.Component;
@Component public class DisabledStoragePresigner implements StoragePresigner { public PresignedUpload presignPut(String objectKey) { throw new ApiException(CommonErrorCode.INTERNAL_SERVER_ERROR); } }

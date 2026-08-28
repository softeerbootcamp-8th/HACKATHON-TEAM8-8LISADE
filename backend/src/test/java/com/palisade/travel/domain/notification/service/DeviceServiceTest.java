package com.palisade.travel.domain.notification.service;

import com.palisade.travel.domain.notification.entity.Device;
import com.palisade.travel.domain.notification.entity.DevicePlatform;
import com.palisade.travel.domain.notification.repository.DeviceRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.never;

@ExtendWith(MockitoExtension.class)
class DeviceServiceTest {

    private static final Long USER_ID = 1L;

    @Mock
    private DeviceRepository deviceRepository;

    @InjectMocks
    private DeviceService deviceService;

    @Test
    void 새_기기_등록시_저장된다() {
        // given
        given(deviceRepository.findByFcmToken("token-1")).willReturn(Optional.empty());

        // when
        deviceService.register(USER_ID, "token-1", DevicePlatform.WEB);

        // then
        ArgumentCaptor<Device> captor = ArgumentCaptor.forClass(Device.class);
        then(deviceRepository).should().save(captor.capture());
        assertThat(captor.getValue().getFcmToken()).isEqualTo("token-1");
    }

    @Test
    void 이미_등록된_토큰을_다시_등록하면_유저에게_재할당된다() {
        // given
        Device existing = Device.create(USER_ID, "token-1", DevicePlatform.WEB);
        given(deviceRepository.findByFcmToken("token-1")).willReturn(Optional.of(existing));

        // when
        deviceService.register(2L, "token-1", DevicePlatform.WEB);

        // then
        assertThat(existing.getUserId()).isEqualTo(2L);
        then(deviceRepository).should(never()).save(any());
    }

    @Test
    void 세션_만료시_해당_세션에_저장된_fcmToken과_userId로만_삭제한다() {
        // when
        deviceService.unregister(USER_ID, "token-1");

        // then
        then(deviceRepository).should().deleteByFcmTokenAndUserId("token-1", USER_ID);
    }
}

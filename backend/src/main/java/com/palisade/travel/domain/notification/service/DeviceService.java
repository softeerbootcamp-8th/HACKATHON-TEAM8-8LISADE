package com.palisade.travel.domain.notification.service;

import com.palisade.travel.domain.notification.entity.Device;
import com.palisade.travel.domain.notification.entity.DevicePlatform;
import com.palisade.travel.domain.notification.repository.DeviceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class DeviceService {

    private final DeviceRepository deviceRepository;

    @Transactional
    public void register(Long userId, String fcmToken, DevicePlatform platform) {
        deviceRepository.findByFcmToken(fcmToken)
                .ifPresentOrElse(
                        device -> device.reassignTo(userId, platform),
                        () -> deviceRepository.save(Device.create(userId, fcmToken, platform)));
    }

    @Transactional
    public void unregister(Long userId, String fcmToken) {
        deviceRepository.deleteByFcmTokenAndUserId(fcmToken, userId);
    }

    /**
     * 특정 유저에게 연결된 모든 FCM 디바이스 토큰을 삭제한다.
     *
     * @return 삭제된 디바이스 토큰 개수
     */
    @Transactional
    public long deleteAllByUserId(Long userId) {
        return deviceRepository.deleteAllByUserId(userId);
    }
}

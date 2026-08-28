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
    public void register(Long userId, String fcmToken, DevicePlatform platform, String sessionId) {
        deviceRepository.findByFcmToken(fcmToken)
                .ifPresentOrElse(
                        device -> device.reassignTo(userId, platform, sessionId),
                        () -> deviceRepository.save(Device.create(userId, fcmToken, platform, sessionId)));
    }

    @Transactional
    public void unregister(Long userId, String fcmToken) {
        deviceRepository.deleteByFcmTokenAndUserId(fcmToken, userId);
    }

    @Transactional
    public void deleteBySessionId(String sessionId) {
        deviceRepository.deleteBySessionId(sessionId);
    }
}

package com.palisade.travel.domain.notification.service;

import com.palisade.travel.domain.notification.entity.Device;
import com.palisade.travel.domain.notification.entity.DevicePlatform;
import com.palisade.travel.domain.notification.repository.DeviceRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class DeviceService {

    private final DeviceRepository deviceRepository;

    public DeviceService(DeviceRepository deviceRepository) {
        this.deviceRepository = deviceRepository;
    }

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
}

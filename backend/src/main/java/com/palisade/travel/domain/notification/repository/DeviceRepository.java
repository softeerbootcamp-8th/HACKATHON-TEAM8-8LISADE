package com.palisade.travel.domain.notification.repository;

import com.palisade.travel.domain.notification.entity.Device;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DeviceRepository extends JpaRepository<Device, Long> {

    Optional<Device> findByFcmToken(String fcmToken);

    List<Device> findAllByUserId(Long userId);

    void deleteByFcmTokenAndUserId(String fcmToken, Long userId);

    void deleteBySessionId(String sessionId);
}

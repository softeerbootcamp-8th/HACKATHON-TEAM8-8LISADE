package com.palisade.travel.domain.notification.service;

import com.google.firebase.FirebaseApp;
import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.FirebaseMessagingException;
import com.google.firebase.messaging.Message;
import com.google.firebase.messaging.MessagingErrorCode;
import com.google.firebase.messaging.Notification;
import com.palisade.travel.domain.notification.entity.Device;
import com.palisade.travel.domain.notification.repository.DeviceRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional(readOnly = true)
public class PushNotificationService {

    private static final Logger log = LoggerFactory.getLogger(PushNotificationService.class);

    private final DeviceRepository deviceRepository;

    public PushNotificationService(DeviceRepository deviceRepository) {
        this.deviceRepository = deviceRepository;
    }

    @Transactional
    public void sendToUser(Long userId, String title, String body) {
        if (FirebaseApp.getApps().isEmpty()) {
            log.warn("Firebase is not initialized; skip sending push to userId={}", userId);
            return;
        }

        List<Device> devices = deviceRepository.findAllByUserId(userId);
        for (Device device : devices) {
            send(device, title, body);
        }
    }

    private void send(Device device, String title, String body) {
        Message message = Message.builder()
                .setToken(device.getFcmToken())
                .setNotification(Notification.builder()
                        .setTitle(title)
                        .setBody(body)
                        .build())
                .build();
        try {
            FirebaseMessaging.getInstance().send(message);
        } catch (FirebaseMessagingException e) {
            if (isInvalidToken(e.getMessagingErrorCode())) {
                deviceRepository.delete(device);
            } else {
                log.warn("Failed to send FCM push to deviceId={}", device.getId(), e);
            }
        }
    }

    private boolean isInvalidToken(MessagingErrorCode errorCode) {
        return errorCode == MessagingErrorCode.UNREGISTERED
                || errorCode == MessagingErrorCode.INVALID_ARGUMENT;
    }
}

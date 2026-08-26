package com.palisade.travel.domain.notification.service;

import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** 위치 미수신 지속 학생을 주기적으로 점검해 확인 불가 알림을 발송한다(§6.1). */
@Component
@RequiredArgsConstructor
public class UnreachableAlertScheduler {

    private final UnreachableAlertService unreachableAlertService;

    @Scheduled(fixedDelayString = "${notification.unreachable.fixed-delay-ms:60000}")
    public void run() {
        unreachableAlertService.sweep();
    }
}

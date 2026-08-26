package com.palisade.travel.domain.notification.service;

import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/** 마감 지난 활동 미션의 미완료 요약 알림을 주기적으로 발송한다(§6.1). */
@Component
@RequiredArgsConstructor
public class MissionIncompleteAlertScheduler {

    private final MissionIncompleteAlertService missionIncompleteAlertService;

    @Scheduled(fixedDelayString = "${notification.mission-incomplete.fixed-delay-ms:60000}")
    public void run() {
        missionIncompleteAlertService.notifyOverdueMissions(LocalDateTime.now());
    }
}

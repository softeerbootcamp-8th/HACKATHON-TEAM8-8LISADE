package com.palisade.travel.domain.notification.service;

import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/** 마감이 임박한 활동 미션의 미완료 학생 알림을 주기적으로 발송한다(§6.2). */
@Component
@RequiredArgsConstructor
public class DeadlineImminentAlertScheduler {

    private final DeadlineImminentAlertService deadlineImminentAlertService;

    @Scheduled(fixedDelayString = "${notification.deadline-imminent.fixed-delay-ms:60000}")
    public void run() {
        deadlineImminentAlertService.notifyUpcomingDeadlines(LocalDateTime.now());
    }
}

package com.palisade.travel.domain.mission.entity;

import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

class MissionTest {

    @Test
    void scheduledMissionIsNotAccessibleBeforeItsStart() {
        Mission mission = Mission.create(1L, "사진", "제출", MissionType.ACTIVITY,
                LocalDateTime.of(2026, 8, 25, 10, 0), LocalDateTime.of(2026, 8, 25, 11, 0));

        assertThat(mission.isAccessibleAt(LocalDateTime.of(2026, 8, 25, 9, 59))).isFalse();
        assertThat(mission.isAccessibleAt(LocalDateTime.of(2026, 8, 25, 10, 0))).isTrue();
    }

    @Test
    void checkMissionGeneratesFourDigitPinAndValidatesIt() {
        Mission mission = Mission.createCheck(1L, "출석", "PIN 입력", null, null, "0123");

        assertThat(mission.getAttendancePin()).isEqualTo("0123");
        assertThat(mission.matchesPin("0123")).isTrue();
        assertThat(mission.matchesPin("1234")).isFalse();
    }
}

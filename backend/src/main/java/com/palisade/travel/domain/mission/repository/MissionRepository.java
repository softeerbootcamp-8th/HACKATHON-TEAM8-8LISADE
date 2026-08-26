package com.palisade.travel.domain.mission.repository;

import com.palisade.travel.domain.mission.entity.Mission;
import com.palisade.travel.domain.mission.entity.MissionType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface MissionRepository extends JpaRepository<Mission, Long> {

    List<Mission> findByTripIdOrderByStartAtAsc(Long tripId);

    /** 마감(endAt)이 지난 특정 유형 미션 — 미완료 마감 알림 배치용. */
    List<Mission> findByTypeAndEndAtIsNotNullAndEndAtBefore(MissionType type, LocalDateTime time);

    /** 마감(endAt)이 구간 내인 특정 유형 미션 — 마감 임박(§6.2) 알림 배치용. */
    List<Mission> findByTypeAndEndAtIsNotNullAndEndAtBetween(MissionType type, LocalDateTime start, LocalDateTime end);
}

package com.palisade.travel.domain.mission.repository;
import com.palisade.travel.domain.mission.entity.MissionSubmission;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
public interface MissionSubmissionRepository extends JpaRepository<MissionSubmission, Long> { Optional<MissionSubmission> findByMissionIdAndUserId(Long missionId, Long userId); }

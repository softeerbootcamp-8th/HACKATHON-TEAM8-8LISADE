package com.palisade.travel.domain.mission.repository;
import com.palisade.travel.domain.mission.entity.Mission;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface MissionRepository extends JpaRepository<Mission, Long> { List<Mission> findByTripIdOrderByStartAtAsc(Long tripId); }

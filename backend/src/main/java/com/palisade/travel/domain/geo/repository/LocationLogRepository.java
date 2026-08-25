package com.palisade.travel.domain.geo.repository;

import com.palisade.travel.domain.geo.entity.LocationLog;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LocationLogRepository extends JpaRepository<LocationLog, Long> {
}

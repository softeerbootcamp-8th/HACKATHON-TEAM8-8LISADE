package com.palisade.travel.domain.geo.repository;

import com.palisade.travel.domain.geo.entity.GeofencePoint;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface GeofencePointRepository extends JpaRepository<GeofencePoint, Long> {

    List<GeofencePoint> findAllByGeofenceIdOrderBySequenceAsc(Long geofenceId);
}

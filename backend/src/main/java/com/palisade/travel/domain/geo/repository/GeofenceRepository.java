package com.palisade.travel.domain.geo.repository;

import com.palisade.travel.domain.geo.entity.Geofence;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GeofenceRepository extends JpaRepository<Geofence, Long> {
}

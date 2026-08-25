package com.palisade.travel.domain.geo.repository;

import com.palisade.travel.domain.geo.entity.CurrentLocation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CurrentLocationRepository extends JpaRepository<CurrentLocation, Long> {

    Optional<CurrentLocation> findByUserIdAndTripId(Long userId, Long tripId);

    List<CurrentLocation> findAllByTripIdOrderByUserIdAsc(Long tripId);
}

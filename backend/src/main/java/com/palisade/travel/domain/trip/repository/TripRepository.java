package com.palisade.travel.domain.trip.repository;

import com.palisade.travel.domain.trip.entity.Trip;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TripRepository extends JpaRepository<Trip, Long> {
    List<Trip> findAllByTeacherIdOrderByCreatedAtDesc(Long teacherId);
}

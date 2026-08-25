package com.palisade.travel.domain.trip.repository;

import com.palisade.travel.domain.trip.entity.TripParticipant;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface TripParticipantRepository extends JpaRepository<TripParticipant, Long> {

    Optional<TripParticipant> findFirstByUserIdOrderByCreatedAtDescIdDesc(Long userId);
}

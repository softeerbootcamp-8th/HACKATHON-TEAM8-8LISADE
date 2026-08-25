package com.palisade.travel.domain.trip.repository;

import com.palisade.travel.domain.trip.entity.Trip;
import com.palisade.travel.domain.trip.entity.TripParticipant;
import com.palisade.travel.domain.trip.entity.TripStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface TripParticipantRepository extends JpaRepository<TripParticipant, Long> {

    Optional<TripParticipant> findFirstByUserIdOrderByCreatedAtDescIdDesc(Long userId);

    Optional<TripParticipant> findByTripIdAndUserId(Long tripId, Long userId);

    List<TripParticipant> findAllByTripIdOrderByCreatedAtAsc(Long tripId);

    @Query("select case when count(p) > 0 then true else false end from TripParticipant p join Trip t on p.tripId = t.id where p.userId = :userId and t.status = :status")
    boolean existsByUserIdAndTripStatus(Long userId, TripStatus status);

    @Query("select t from TripParticipant p join Trip t on p.tripId = t.id where p.userId = :userId and t.status = :status")
    Optional<Trip> findTripByUserIdAndTripStatus(Long userId, TripStatus status);
}

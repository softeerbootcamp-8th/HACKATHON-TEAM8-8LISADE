package com.palisade.travel.domain.trip.repository;

import com.palisade.travel.domain.trip.entity.InviteCode;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface InviteCodeRepository extends JpaRepository<InviteCode, Long> {

    Optional<InviteCode> findByCode(String code);

    Optional<InviteCode> findByTripIdAndRevokedAtIsNull(Long tripId);
}

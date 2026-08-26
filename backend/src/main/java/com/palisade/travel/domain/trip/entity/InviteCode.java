package com.palisade.travel.domain.trip.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Getter
@Table(name = "invite_code")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
public class InviteCode {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "trip_id", nullable = false)
    private Long tripId;

    @Column(name = "code", nullable = false, unique = true, length = 6)
    private String code;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(name = "revoked_at")
    private LocalDateTime revokedAt;

    public static InviteCode create(Long tripId, String code, LocalDateTime expiresAt) {
        return new InviteCode(null, tripId, code, expiresAt, null);
    }

    public boolean isUsableAt(LocalDateTime now) {
        return revokedAt == null && expiresAt.isAfter(now);
    }

    public void revoke(LocalDateTime now) {
        this.revokedAt = now;
    }
}

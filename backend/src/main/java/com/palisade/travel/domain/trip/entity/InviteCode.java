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

    /**
     * DB 컬럼이 NOT NULL이라 값은 계속 채우지만, 더 이상 만료 판정에 쓰지 않는다
     * (초대 코드는 Trip 종료로만 무효화된다 — {@link #isUsableAt}). 마이그레이션 도구가
     * 없어 컬럼 자체는 남겨둔다.
     */
    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(name = "revoked_at")
    private LocalDateTime revokedAt;

    private static final LocalDateTime UNUSED_EXPIRES_AT = LocalDateTime.of(2999, 1, 1, 0, 0);

    public static InviteCode create(Long tripId, String code) {
        return new InviteCode(null, tripId, code, UNUSED_EXPIRES_AT, null);
    }

    public boolean isUsable() {
        return revokedAt == null;
    }

    public void revoke(LocalDateTime now) {
        this.revokedAt = now;
    }
}

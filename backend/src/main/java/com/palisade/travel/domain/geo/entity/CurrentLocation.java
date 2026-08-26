package com.palisade.travel.domain.geo.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Getter
@Table(name = "current_location")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CurrentLocation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "trip_id", nullable = false)
    private Long tripId;

    @Column(name = "latitude", nullable = false, precision = 10, scale = 7)
    private BigDecimal latitude;

    @Column(name = "longitude", nullable = false, precision = 10, scale = 7)
    private BigDecimal longitude;

    @Column(name = "is_outside", nullable = false)
    private boolean isOutside;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "outside_since")
    private LocalDateTime outsideSince;

    public CurrentLocation(Long id, Long userId, Long tripId, BigDecimal latitude, BigDecimal longitude,
                           boolean isOutside, LocalDateTime updatedAt) {
        this.id = id;
        this.userId = userId;
        this.tripId = tripId;
        this.latitude = latitude;
        this.longitude = longitude;
        this.isOutside = isOutside;
        this.updatedAt = updatedAt;
        this.outsideSince = isOutside ? updatedAt : null;
    }

    public static CurrentLocation create(Long userId, Long tripId, BigDecimal latitude, BigDecimal longitude,
                                         boolean isOutside, LocalDateTime updatedAt) {
        return new CurrentLocation(null, userId, tripId, latitude, longitude, isOutside, updatedAt);
    }

    public void update(BigDecimal latitude, BigDecimal longitude, boolean isOutside, LocalDateTime updatedAt) {
        this.latitude = latitude;
        this.longitude = longitude;
        if (isOutside && (!this.isOutside || this.outsideSince == null)) {
            this.outsideSince = updatedAt;
        } else if (!isOutside) {
            this.outsideSince = null;
        }
        this.isOutside = isOutside;
        this.updatedAt = updatedAt;
    }

}

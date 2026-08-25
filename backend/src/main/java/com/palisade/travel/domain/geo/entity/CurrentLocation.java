package com.palisade.travel.domain.geo.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Getter
@Table(name = "current_location")
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

    protected CurrentLocation() {
    }

    public CurrentLocation(Long id, Long userId, Long tripId, BigDecimal latitude, BigDecimal longitude,
                           boolean isOutside, LocalDateTime updatedAt) {
        this.id = id;
        this.userId = userId;
        this.tripId = tripId;
        this.latitude = latitude;
        this.longitude = longitude;
        this.isOutside = isOutside;
        this.updatedAt = updatedAt;
    }

    public static CurrentLocation create(Long userId, Long tripId, BigDecimal latitude, BigDecimal longitude,
                                         boolean isOutside, LocalDateTime updatedAt) {
        return new CurrentLocation(null, userId, tripId, latitude, longitude, isOutside, updatedAt);
    }

}

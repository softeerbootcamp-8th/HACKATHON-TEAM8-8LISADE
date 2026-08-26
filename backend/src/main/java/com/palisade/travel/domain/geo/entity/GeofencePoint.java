package com.palisade.travel.domain.geo.entity;

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

import java.math.BigDecimal;

@Entity
@Getter
@Table(name = "geofence_point")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
public class GeofencePoint {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "geofence_id", nullable = false)
    private Long geofenceId;

    @Column(name = "sequence", nullable = false)
    private Integer sequence;

    @Column(name = "latitude", nullable = false, precision = 10, scale = 7)
    private BigDecimal latitude;

    @Column(name = "longitude", nullable = false, precision = 10, scale = 7)
    private BigDecimal longitude;

    public static GeofencePoint create(Long geofenceId, Integer sequence, BigDecimal latitude, BigDecimal longitude) {
        return new GeofencePoint(null, geofenceId, sequence, latitude, longitude);
    }

}

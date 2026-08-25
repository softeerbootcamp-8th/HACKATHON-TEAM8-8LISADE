package com.palisade.travel.domain.geo.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;

import java.math.BigDecimal;

@Entity
@Getter
@Table(name = "geofence_point")
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

    protected GeofencePoint() {
    }

    public GeofencePoint(Long id, Long geofenceId, Integer sequence, BigDecimal latitude, BigDecimal longitude) {
        this.id = id;
        this.geofenceId = geofenceId;
        this.sequence = sequence;
        this.latitude = latitude;
        this.longitude = longitude;
    }

    public static GeofencePoint create(Long geofenceId, Integer sequence, BigDecimal latitude, BigDecimal longitude) {
        return new GeofencePoint(null, geofenceId, sequence, latitude, longitude);
    }

}

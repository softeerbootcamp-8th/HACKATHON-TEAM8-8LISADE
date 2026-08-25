package com.palisade.travel.domain.mission.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;

import java.time.LocalDateTime;

@Entity
@Getter
@Table(name = "mission")
public class Mission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long tripId;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column
    private LocalDateTime startAt;

    @Column
    private LocalDateTime endAt;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    protected Mission() {
    }

    public Mission(Long id, Long tripId, String title, String description,
                   LocalDateTime startAt, LocalDateTime endAt, LocalDateTime createdAt) {
        this.id = id;
        this.tripId = tripId;
        this.title = title;
        this.description = description;
        this.startAt = startAt;
        this.endAt = endAt;
        this.createdAt = createdAt;
    }

    public static Mission create(Long tripId, String title, String description,
                                 LocalDateTime startAt, LocalDateTime endAt) {
        return new Mission(null, tripId, title, description, startAt, endAt, LocalDateTime.now());
    }

}

package com.palisade.travel.domain.mission.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;

import java.time.LocalDateTime;

@Entity
@Getter
@Table(name = "mission_submission")
public class MissionSubmission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long missionId;

    @Column(nullable = false)
    private Long userId;

    @Column(nullable = false, length = 1024)
    private String imageUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ValidationStatus validationStatus;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    protected MissionSubmission() {
    }

    public MissionSubmission(Long id, Long missionId, Long userId, String imageUrl,
                             ValidationStatus validationStatus, LocalDateTime createdAt) {
        this.id = id;
        this.missionId = missionId;
        this.userId = userId;
        this.imageUrl = imageUrl;
        this.validationStatus = validationStatus;
        this.createdAt = createdAt;
    }

    public static MissionSubmission create(Long missionId, Long userId, String imageUrl, ValidationStatus validationStatus) {
        return new MissionSubmission(null, missionId, userId, imageUrl, validationStatus, LocalDateTime.now());
    }

}

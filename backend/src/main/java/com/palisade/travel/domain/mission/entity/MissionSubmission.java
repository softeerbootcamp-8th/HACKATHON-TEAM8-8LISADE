package com.palisade.travel.domain.mission.entity;

import jakarta.persistence.*;
import lombok.Getter;

import java.time.LocalDateTime;

@Entity
@Getter
@Table(name = "mission_submission", uniqueConstraints = @UniqueConstraint(columnNames = {"mission_id", "user_id"}))
public class MissionSubmission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "mission_id", nullable = false)
    private Long missionId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    // Existing deployments created this column as image_url; it stores the opaque object key now.
    @Column(name = "image_url", nullable = false, length = 1024)
    private String imageKey;

    @Enumerated(EnumType.STRING)
    @Column(name = "validation_status", nullable = false, length = 20)
    private SubmissionStatus status;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;


    protected MissionSubmission() {
    }

    private MissionSubmission(Long missionId, Long userId, String imageKey, SubmissionStatus status) {
        this.missionId = missionId; this.userId = userId; this.imageKey = imageKey; this.status = status;
        this.createdAt = LocalDateTime.now();
    }
    public static MissionSubmission photo(Long missionId, Long userId, String imageKey) { return new MissionSubmission(missionId, userId, imageKey, SubmissionStatus.COMPLETED); }
    public static MissionSubmission completedCheck(Long missionId, Long userId) { return new MissionSubmission(missionId, userId, "", SubmissionStatus.COMPLETED); }
    public void resubmit(String imageKey) { this.imageKey = imageKey; this.status = SubmissionStatus.COMPLETED; }
    public void reject() { this.status = SubmissionStatus.REJECTED; }
    public SubmissionStatus currentStatus(LocalDateTime now, Mission mission) { return status == SubmissionStatus.WAITING && mission.isExpiredAt(now) ? SubmissionStatus.EXPIRED : status; }

}

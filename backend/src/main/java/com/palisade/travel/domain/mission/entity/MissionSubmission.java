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

    @Column(name = "image_key", length = 1024)
    private String imageKey;

    @Enumerated(EnumType.STRING)
    @Column(name = "submission_status", nullable = false, length = 20)
    private SubmissionStatus status;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    protected MissionSubmission() {
    }

    private MissionSubmission(Long missionId, Long userId, String imageKey, SubmissionStatus status) {
        this.missionId = missionId; this.userId = userId; this.imageKey = imageKey; this.status = status;
        this.createdAt = LocalDateTime.now(); this.updatedAt = this.createdAt;
    }
    public static MissionSubmission photo(Long missionId, Long userId, String imageKey) { return new MissionSubmission(missionId, userId, imageKey, SubmissionStatus.WAITING); }
    public static MissionSubmission completedCheck(Long missionId, Long userId) { return new MissionSubmission(missionId, userId, null, SubmissionStatus.COMPLETED); }
    public void resubmit(String imageKey) { this.imageKey = imageKey; this.status = SubmissionStatus.WAITING; this.updatedAt = LocalDateTime.now(); }
    public void reject() { this.status = SubmissionStatus.REJECTED; this.updatedAt = LocalDateTime.now(); }
    public SubmissionStatus currentStatus(LocalDateTime now, Mission mission) { return status == SubmissionStatus.WAITING && mission.isExpiredAt(now) ? SubmissionStatus.EXPIRED : status; }

}

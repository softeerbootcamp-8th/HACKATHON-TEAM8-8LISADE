package com.palisade.travel.domain.mission.dto;
import com.palisade.travel.domain.mission.service.MissionService;
import java.time.LocalDateTime;
import java.util.List;

public record MissionStatusBoardResponse(
        MissionResponse mission,
        int totalStudentCount,
        List<SubmittedEntry> submitted,
        List<NotSubmittedEntry> notSubmitted
) {
    public static MissionStatusBoardResponse from(MissionService.StatusBoard board) {
        return new MissionStatusBoardResponse(
                MissionResponse.from(board.mission()),
                board.totalStudentCount(),
                board.submitted().stream().map(SubmittedEntry::from).toList(),
                board.notSubmitted().stream().map(NotSubmittedEntry::from).toList()
        );
    }

    public record SubmittedEntry(Long studentId, String studentName, String imageKey, LocalDateTime submittedAt) {
        static SubmittedEntry from(MissionService.SubmittedEntry entry) { return new SubmittedEntry(entry.studentId(), entry.studentName(), entry.imageKey(), entry.submittedAt()); }
    }

    public record NotSubmittedEntry(Long studentId, String studentName, String rejectionReason) {
        static NotSubmittedEntry from(MissionService.NotSubmittedEntry entry) { return new NotSubmittedEntry(entry.studentId(), entry.studentName(), entry.rejectionReason()); }
    }
}

package com.palisade.travel.domain.mission.entity;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class MissionSubmissionTest {

    @Test
    void rejectingStoresTheReason() {
        MissionSubmission submission = MissionSubmission.photo(1L, 10L, "missions/1/students/10/a.jpg");

        submission.reject("사진이 흐릿합니다.");

        assertThat(submission.getStatus()).isEqualTo(SubmissionStatus.REJECTED);
        assertThat(submission.getRejectionReason()).isEqualTo("사진이 흐릿합니다.");
    }

    @Test
    void resubmittingClearsThePriorRejectionReason() {
        MissionSubmission submission = MissionSubmission.photo(1L, 10L, "missions/1/students/10/a.jpg");
        submission.reject("사진이 흐릿합니다.");

        submission.resubmit("missions/1/students/10/b.jpg");

        assertThat(submission.getStatus()).isEqualTo(SubmissionStatus.COMPLETED);
        assertThat(submission.getRejectionReason()).isNull();
    }

    @Test
    void completingOnBehalfOfAStudentClearsAnyPriorRejectionReason() {
        MissionSubmission submission = MissionSubmission.photo(1L, 10L, "missions/1/students/10/a.jpg");
        submission.reject("사진이 흐릿합니다.");

        submission.completeByTeacher();

        assertThat(submission.getStatus()).isEqualTo(SubmissionStatus.COMPLETED);
        assertThat(submission.getRejectionReason()).isNull();
    }

    @Test
    void photoSubmittedAfterTheDeadlineIsMarkedLate() {
        MissionSubmission submission = MissionSubmission.photo(1L, 10L, "missions/1/students/10/a.jpg", true);

        assertThat(submission.getStatus()).isEqualTo(SubmissionStatus.LATE);
    }

    @Test
    void photoSubmittedBeforeTheDeadlineIsCompletedNotLate() {
        MissionSubmission submission = MissionSubmission.photo(1L, 10L, "missions/1/students/10/a.jpg", false);

        assertThat(submission.getStatus()).isEqualTo(SubmissionStatus.COMPLETED);
    }

    @Test
    void resubmittingAfterTheDeadlineIsMarkedLate() {
        MissionSubmission submission = MissionSubmission.photo(1L, 10L, "missions/1/students/10/a.jpg");
        submission.reject("사진이 흐릿합니다.");

        submission.resubmit("missions/1/students/10/b.jpg", true);

        assertThat(submission.getStatus()).isEqualTo(SubmissionStatus.LATE);
        assertThat(submission.getRejectionReason()).isNull();
    }
}

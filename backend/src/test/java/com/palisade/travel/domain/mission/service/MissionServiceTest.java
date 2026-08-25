package com.palisade.travel.domain.mission.service;

import com.palisade.travel.domain.mission.entity.Mission;
import com.palisade.travel.domain.mission.entity.MissionSubmission;
import com.palisade.travel.domain.mission.entity.MissionType;
import com.palisade.travel.domain.mission.entity.SubmissionStatus;
import com.palisade.travel.domain.mission.repository.MissionRepository;
import com.palisade.travel.domain.mission.repository.MissionSubmissionRepository;
import com.palisade.travel.domain.mission.storage.StoragePresigner;
import com.palisade.travel.domain.trip.entity.Trip;
import com.palisade.travel.domain.trip.entity.TripParticipant;
import com.palisade.travel.domain.trip.entity.TripStatus;
import com.palisade.travel.domain.trip.repository.TripParticipantRepository;
import com.palisade.travel.domain.trip.repository.TripRepository;
import com.palisade.travel.domain.user.entity.User;
import com.palisade.travel.domain.user.entity.UserRole;
import com.palisade.travel.domain.user.repository.UserRepository;
import com.palisade.travel.global.error.ApiException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MissionServiceTest {

    @Mock MissionRepository missionRepository;
    @Mock MissionSubmissionRepository submissionRepository;
    @Mock TripRepository tripRepository;
    @Mock TripParticipantRepository participantRepository;
    @Mock UserRepository userRepository;
    @Mock StoragePresigner storagePresigner;
    @InjectMocks MissionService missionService;

    private Trip trip(Long teacherId) {
        return Trip.create(teacherId, null, "경주 수학여행", "경주", "", null, null, TripStatus.ACTIVE);
    }

    private User user(Long id, String name) {
        return new User(id, "login" + id, "hash", null, name, UserRole.STUDENT, null, null, null, true, LocalDateTime.now());
    }

    @Test
    void statusBoardSeparatesSubmittedFromNotSubmittedRosterStudents() {
        Mission mission = Mission.create(1L, "사진", "", MissionType.ACTIVITY, null, null);
        when(missionRepository.findById(2L)).thenReturn(Optional.of(mission));
        when(tripRepository.findById(1L)).thenReturn(Optional.of(trip(100L)));
        when(participantRepository.findAllByTripIdOrderByCreatedAtAsc(1L)).thenReturn(List.of(
                TripParticipant.create(1L, 10L), TripParticipant.create(1L, 11L)));
        MissionSubmission completed = MissionSubmission.photo(2L, 10L, "missions/2/students/10/a.jpg");
        when(submissionRepository.findByMissionId(2L)).thenReturn(List.of(completed));
        when(userRepository.findAllById(any())).thenReturn(List.of(user(10L, "김학생"), user(11L, "이학생")));

        var board = missionService.getStatusBoard(2L, 100L);

        assertThat(board.submitted()).hasSize(1);
        assertThat(board.submitted().get(0).studentName()).isEqualTo("김학생");
        assertThat(board.notSubmitted()).hasSize(1);
        assertThat(board.notSubmitted().get(0).studentName()).isEqualTo("이학생");
        assertThat(board.notSubmitted().get(0).rejectionReason()).isNull();
    }

    @Test
    void statusBoardExposesTheRejectionReasonForARejectedStudent() {
        Mission mission = Mission.create(1L, "사진", "", MissionType.ACTIVITY, null, null);
        when(missionRepository.findById(2L)).thenReturn(Optional.of(mission));
        when(tripRepository.findById(1L)).thenReturn(Optional.of(trip(100L)));
        when(participantRepository.findAllByTripIdOrderByCreatedAtAsc(1L)).thenReturn(List.of(TripParticipant.create(1L, 11L)));
        MissionSubmission rejected = MissionSubmission.photo(2L, 11L, "missions/2/students/11/a.jpg");
        rejected.reject("사진이 흐릿합니다.");
        when(submissionRepository.findByMissionId(2L)).thenReturn(List.of(rejected));
        when(userRepository.findAllById(any())).thenReturn(List.of(user(11L, "이학생")));

        var board = missionService.getStatusBoard(2L, 100L);

        assertThat(board.notSubmitted().get(0).rejectionReason()).isEqualTo("사진이 흐릿합니다.");
    }

    @Test
    void completingOnBehalfCreatesACompletedSubmissionWhenNoneExists() {
        Mission mission = Mission.createCheck(1L, "출석", "", null, null, "1234");
        when(missionRepository.findById(2L)).thenReturn(Optional.of(mission));
        when(tripRepository.findById(1L)).thenReturn(Optional.of(trip(100L)));
        when(participantRepository.findByTripIdAndUserId(1L, 11L)).thenReturn(Optional.of(TripParticipant.create(1L, 11L)));
        when(submissionRepository.findByMissionIdAndUserId(2L, 11L)).thenReturn(Optional.empty());
        when(submissionRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        missionService.completeOnBehalf(2L, 100L, 11L);

        var captor = org.mockito.ArgumentCaptor.forClass(MissionSubmission.class);
        org.mockito.Mockito.verify(submissionRepository).save(captor.capture());
        assertThat(captor.getValue().getStatus()).isEqualTo(SubmissionStatus.COMPLETED);
    }

    @Test
    void completingOnBehalfRejectsAStudentNotInTheRoster() {
        Mission mission = Mission.createCheck(1L, "출석", "", null, null, "1234");
        when(missionRepository.findById(2L)).thenReturn(Optional.of(mission));
        when(tripRepository.findById(1L)).thenReturn(Optional.of(trip(100L)));
        when(participantRepository.findByTripIdAndUserId(1L, 99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> missionService.completeOnBehalf(2L, 100L, 99L))
                .isInstanceOf(ApiException.class);
    }

    @Test
    void rejectingASubmissionStoresTheReason() {
        Mission mission = Mission.create(1L, "사진", "", MissionType.ACTIVITY, null, null);
        MissionSubmission submission = MissionSubmission.photo(2L, 10L, "missions/2/students/10/a.jpg");
        when(missionRepository.findById(2L)).thenReturn(Optional.of(mission));
        when(tripRepository.findById(1L)).thenReturn(Optional.of(trip(100L)));
        when(submissionRepository.findByMissionIdAndUserId(2L, 10L)).thenReturn(Optional.of(submission));

        missionService.reject(2L, 10L, 100L, "사진이 흐릿합니다.");

        assertThat(submission.getRejectionReason()).isEqualTo("사진이 흐릿합니다.");
    }

    @Test
    void studentCannotAccessFutureMission() {
        Mission mission = Mission.create(1L, "예약", "", MissionType.ACTIVITY,
                LocalDateTime.now().plusMinutes(1), null);
        when(missionRepository.findById(2L)).thenReturn(Optional.of(mission));
        when(participantRepository.existsByTripIdAndUserId(1L, 10L)).thenReturn(true);

        assertThatThrownBy(() -> missionService.getStudentMission(2L, 10L))
                .isInstanceOf(ApiException.class);
    }

    @Test
    void correctPinCompletesCheckMission() {
        Mission mission = Mission.createCheck(1L, "출석", "", null, null, "1234");
        when(missionRepository.findById(2L)).thenReturn(Optional.of(mission));
        when(participantRepository.existsByTripIdAndUserId(1L, 10L)).thenReturn(true);
        when(submissionRepository.findByMissionIdAndUserId(2L, 10L)).thenReturn(Optional.empty());
        when(submissionRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        assertThat(missionService.verifyPin(2L, 10L, "1234").status()).isEqualTo(SubmissionStatus.COMPLETED);
    }

    @Test
    void photoSubmissionRejectsAKeyNotIssuedForTheStudent() {
        Mission mission = Mission.create(1L, "사진", "", MissionType.ACTIVITY, null, null);
        when(missionRepository.findById(2L)).thenReturn(Optional.of(mission));
        when(participantRepository.existsByTripIdAndUserId(1L, 10L)).thenReturn(true);

        assertThatThrownBy(() -> missionService.submitPhoto(2L, 10L, "missions/2/students/11/x.jpg"))
                .isInstanceOf(ApiException.class);
    }

    @Test
    void photoSubmissionCompletesImmediately() {
        Mission mission = Mission.create(1L, "사진", "", MissionType.ACTIVITY, null, null);
        when(missionRepository.findById(2L)).thenReturn(Optional.of(mission));
        when(participantRepository.existsByTripIdAndUserId(1L, 10L)).thenReturn(true);
        when(submissionRepository.findByMissionIdAndUserId(2L, 10L)).thenReturn(Optional.empty());
        when(submissionRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        assertThat(missionService.submitPhoto(2L, 10L, "missions/2/students/10/x.jpg").status())
                .isEqualTo(SubmissionStatus.COMPLETED);
    }

    @Test
    void resubmittedPhotoCompletesImmediatelyAfterRejection() {
        Mission mission = Mission.create(1L, "사진", "", MissionType.ACTIVITY, null, null);
        MissionSubmission rejected = MissionSubmission.photo(2L, 10L, "missions/2/students/10/old.jpg");
        rejected.reject("사진이 흐릿합니다.");
        when(missionRepository.findById(2L)).thenReturn(Optional.of(mission));
        when(participantRepository.existsByTripIdAndUserId(1L, 10L)).thenReturn(true);
        when(submissionRepository.findByMissionIdAndUserId(2L, 10L)).thenReturn(Optional.of(rejected));

        assertThat(missionService.submitPhoto(2L, 10L, "missions/2/students/10/new.jpg").status())
                .isEqualTo(SubmissionStatus.COMPLETED);
    }
}

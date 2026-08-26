package com.palisade.travel.domain.mission.service;

import com.palisade.travel.domain.mission.entity.Mission;
import com.palisade.travel.domain.mission.entity.MissionSubmission;
import com.palisade.travel.domain.mission.entity.MissionType;
import com.palisade.travel.domain.mission.entity.SubmissionStatus;
import com.palisade.travel.domain.mission.repository.MissionRepository;
import com.palisade.travel.domain.mission.repository.MissionSubmissionRepository;
import com.palisade.travel.domain.mission.storage.StoragePresigner;
import com.palisade.travel.domain.notification.entity.Notification;
import com.palisade.travel.domain.notification.entity.NotificationType;
import com.palisade.travel.domain.notification.repository.NotificationRepository;
import com.palisade.travel.domain.notification.service.PushNotificationService;
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
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MissionServiceTest {

    @Mock MissionRepository missionRepository;
    @Mock MissionSubmissionRepository submissionRepository;
    @Mock TripRepository tripRepository;
    @Mock TripParticipantRepository participantRepository;
    @Mock UserRepository userRepository;
    @Mock StoragePresigner storagePresigner;
    @Mock NotificationRepository notificationRepository;
    @Mock PushNotificationService pushNotificationService;
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
        MissionSubmission completed = MissionSubmission.photo(2L, 10L, "upload/missions/2/students/10/a.jpg");
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
    void statusBoardIssuesAViewUrlForEachSubmittedPhoto() {
        Mission mission = Mission.create(1L, "사진", "", MissionType.ACTIVITY, null, null);
        when(missionRepository.findById(2L)).thenReturn(Optional.of(mission));
        when(tripRepository.findById(1L)).thenReturn(Optional.of(trip(100L)));
        when(participantRepository.findAllByTripIdOrderByCreatedAtAsc(1L))
                .thenReturn(List.of(TripParticipant.create(1L, 10L)));
        when(submissionRepository.findByMissionId(2L))
                .thenReturn(List.of(MissionSubmission.photo(2L, 10L, "upload/missions/2/students/10/a.jpg")));
        when(userRepository.findAllById(any())).thenReturn(List.of(user(10L, "김학생")));
        when(storagePresigner.presignGet("upload/missions/2/students/10/a.jpg"))
                .thenReturn("https://storage.example/view");

        var board = missionService.getStatusBoard(2L, 100L);

        assertThat(board.submitted().get(0).imageUrl()).isEqualTo("https://storage.example/view");
    }

    @Test
    void statusBoardOmitsTheViewUrlWhenTheSubmissionHasNoImage() {
        Mission mission = Mission.createCheck(1L, "출석", "", null, null, "1234");
        when(missionRepository.findById(2L)).thenReturn(Optional.of(mission));
        when(tripRepository.findById(1L)).thenReturn(Optional.of(trip(100L)));
        when(participantRepository.findAllByTripIdOrderByCreatedAtAsc(1L))
                .thenReturn(List.of(TripParticipant.create(1L, 10L)));
        when(submissionRepository.findByMissionId(2L))
                .thenReturn(List.of(MissionSubmission.completedCheck(2L, 10L)));
        when(userRepository.findAllById(any())).thenReturn(List.of(user(10L, "김학생")));

        var board = missionService.getStatusBoard(2L, 100L);

        assertThat(board.submitted().get(0).imageUrl()).isNull();
        org.mockito.Mockito.verify(storagePresigner, org.mockito.Mockito.never()).presignGet(any());
    }

    @Test
    void statusBoardIsDeniedToATeacherWhoDoesNotOwnTheTrip() {
        Mission mission = Mission.create(1L, "사진", "", MissionType.ACTIVITY, null, null);
        when(missionRepository.findById(2L)).thenReturn(Optional.of(mission));
        when(tripRepository.findById(1L)).thenReturn(Optional.of(trip(100L)));

        assertThatThrownBy(() -> missionService.getStatusBoard(2L, 999L))
                .isInstanceOf(ApiException.class);
    }

    @Test
    void statusBoardExposesTheRejectionReasonForARejectedStudent() {
        Mission mission = Mission.create(1L, "사진", "", MissionType.ACTIVITY, null, null);
        when(missionRepository.findById(2L)).thenReturn(Optional.of(mission));
        when(tripRepository.findById(1L)).thenReturn(Optional.of(trip(100L)));
        when(participantRepository.findAllByTripIdOrderByCreatedAtAsc(1L)).thenReturn(List.of(TripParticipant.create(1L, 11L)));
        MissionSubmission rejected = MissionSubmission.photo(2L, 11L, "upload/missions/2/students/11/a.jpg");
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
        MissionSubmission submission = MissionSubmission.photo(2L, 10L, "upload/missions/2/students/10/a.jpg");
        when(missionRepository.findById(2L)).thenReturn(Optional.of(mission));
        when(tripRepository.findById(1L)).thenReturn(Optional.of(trip(100L)));
        when(submissionRepository.findByMissionIdAndUserId(2L, 10L)).thenReturn(Optional.of(submission));

        missionService.reject(2L, 10L, 100L, "사진이 흐릿합니다.");

        assertThat(submission.getRejectionReason()).isEqualTo("사진이 흐릿합니다.");
    }

    @Test
    void rejectingASubmissionSendsAMissionRejectedNotificationToTheStudent() {
        Mission mission = Mission.create(1L, "사진", "", MissionType.ACTIVITY, null, null);
        MissionSubmission submission = MissionSubmission.photo(2L, 10L, "upload/missions/2/students/10/a.jpg");
        when(missionRepository.findById(2L)).thenReturn(Optional.of(mission));
        when(tripRepository.findById(1L)).thenReturn(Optional.of(trip(100L)));
        when(submissionRepository.findByMissionIdAndUserId(2L, 10L)).thenReturn(Optional.of(submission));
        ArgumentCaptor<Notification> captor = ArgumentCaptor.forClass(Notification.class);

        missionService.reject(2L, 10L, 100L, "사진이 흐릿합니다.");

        then(notificationRepository).should(times(1)).save(captor.capture());
        Notification saved = captor.getValue();
        assertThat(saved.getUserId()).isEqualTo(10L);
        assertThat(saved.getTripId()).isEqualTo(1L);
        assertThat(saved.getType()).isEqualTo(NotificationType.MISSION_REJECTED);
        assertThat(saved.getMessage()).contains("사진이 흐릿합니다.");
        then(pushNotificationService).should(times(1)).sendToUser(eq(10L), any(), any());
    }

    @Test
    void rejectingASubmissionDeletesTheImageFromStorage() {
        Mission mission = Mission.create(1L, "사진", "", MissionType.ACTIVITY, null, null);
        MissionSubmission submission = MissionSubmission.photo(2L, 10L, "upload/missions/2/students/10/a.jpg");
        when(missionRepository.findById(2L)).thenReturn(Optional.of(mission));
        when(tripRepository.findById(1L)).thenReturn(Optional.of(trip(100L)));
        when(submissionRepository.findByMissionIdAndUserId(2L, 10L)).thenReturn(Optional.of(submission));

        missionService.reject(2L, 10L, 100L, "사진이 흐릿합니다.");

        then(storagePresigner).should(times(1)).deleteObject("upload/missions/2/students/10/a.jpg");
    }

    @Test
    void rejectingACheckSubmissionWithNoImageDoesNotAttemptStorageDeletion() {
        Mission mission = Mission.createCheck(1L, "출석", "", null, null, "1234");
        MissionSubmission submission = MissionSubmission.completedCheck(2L, 10L);
        when(missionRepository.findById(2L)).thenReturn(Optional.of(mission));
        when(tripRepository.findById(1L)).thenReturn(Optional.of(trip(100L)));
        when(submissionRepository.findByMissionIdAndUserId(2L, 10L)).thenReturn(Optional.of(submission));

        missionService.reject(2L, 10L, 100L, "사유");

        then(storagePresigner).should(org.mockito.Mockito.never()).deleteObject(any());
    }

    @Test
    void creatingAMissionNotifiesEveryParticipatingStudent() {
        when(tripRepository.findById(1L)).thenReturn(Optional.of(trip(100L)));
        when(participantRepository.findAllByTripIdOrderByCreatedAtAsc(1L)).thenReturn(List.of(
                TripParticipant.create(1L, 10L), TripParticipant.create(1L, 11L)));
        when(missionRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        missionService.create(1L, 100L, "사진 미션", "설명", MissionType.ACTIVITY, null, null);

        ArgumentCaptor<Notification> captor = ArgumentCaptor.forClass(Notification.class);
        then(notificationRepository).should(times(2)).save(captor.capture());
        assertThat(captor.getAllValues()).extracting(Notification::getUserId).containsExactlyInAnyOrder(10L, 11L);
        assertThat(captor.getAllValues()).allSatisfy(notification -> {
            assertThat(notification.getType()).isEqualTo(NotificationType.MISSION_CREATED);
            assertThat(notification.getTripId()).isEqualTo(1L);
        });
        then(pushNotificationService).should(times(1)).sendToUser(eq(10L), any(), any());
        then(pushNotificationService).should(times(1)).sendToUser(eq(11L), any(), any());
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

        assertThatThrownBy(() -> missionService.submitPhoto(2L, 10L, "upload/missions/2/students/11/x.jpg"))
                .isInstanceOf(ApiException.class);
    }

    @Test
    void photoSubmissionCompletesImmediately() {
        Mission mission = Mission.create(1L, "사진", "", MissionType.ACTIVITY, null, null);
        when(missionRepository.findById(2L)).thenReturn(Optional.of(mission));
        when(participantRepository.existsByTripIdAndUserId(1L, 10L)).thenReturn(true);
        when(submissionRepository.findByMissionIdAndUserId(2L, 10L)).thenReturn(Optional.empty());
        when(submissionRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        assertThat(missionService.submitPhoto(2L, 10L, "upload/missions/2/students/10/x.jpg").status())
                .isEqualTo(SubmissionStatus.COMPLETED);
    }

    @Test
    void resubmittedPhotoCompletesImmediatelyAfterRejection() {
        Mission mission = Mission.create(1L, "사진", "", MissionType.ACTIVITY, null, null);
        MissionSubmission rejected = MissionSubmission.photo(2L, 10L, "upload/missions/2/students/10/old.jpg");
        rejected.reject("사진이 흐릿합니다.");
        when(missionRepository.findById(2L)).thenReturn(Optional.of(mission));
        when(participantRepository.existsByTripIdAndUserId(1L, 10L)).thenReturn(true);
        when(submissionRepository.findByMissionIdAndUserId(2L, 10L)).thenReturn(Optional.of(rejected));

        assertThat(missionService.submitPhoto(2L, 10L, "upload/missions/2/students/10/new.jpg").status())
                .isEqualTo(SubmissionStatus.COMPLETED);
    }

    @Test
    void photoUploadUsesTheUploadPrefixAllowedByTheEc2Role() {
        Mission mission = Mission.create(1L, "사진", "", MissionType.ACTIVITY, null, null);
        when(missionRepository.findById(2L)).thenReturn(Optional.of(mission));
        when(participantRepository.existsByTripIdAndUserId(1L, 10L)).thenReturn(true);
        when(storagePresigner.presignPut(any(), any())).thenReturn(new StoragePresigner.PresignedUpload("upload/missions/2/students/10/photo.jpg", "https://storage.example/upload"));

        missionService.preparePhotoUpload(2L, 10L, "image/jpeg");

        org.mockito.Mockito.verify(storagePresigner).presignPut(org.mockito.ArgumentMatchers.startsWith("upload/missions/2/students/10/"), org.mockito.ArgumentMatchers.eq("image/jpeg"));
    }

    @Test
    void photoUploadUsesAJpgExtensionForJpegContentType() {
        Mission mission = Mission.create(1L, "사진", "", MissionType.ACTIVITY, null, null);
        when(missionRepository.findById(2L)).thenReturn(Optional.of(mission));
        when(participantRepository.existsByTripIdAndUserId(1L, 10L)).thenReturn(true);
        when(storagePresigner.presignPut(any(), any())).thenReturn(new StoragePresigner.PresignedUpload("upload/missions/2/students/10/photo.jpg", "https://storage.example/upload"));

        missionService.preparePhotoUpload(2L, 10L, "image/jpeg");

        org.mockito.Mockito.verify(storagePresigner).presignPut(org.mockito.ArgumentMatchers.endsWith(".jpg"), org.mockito.ArgumentMatchers.any());
    }

    @Test
    void photoUploadUsesAPngExtensionForPngContentType() {
        Mission mission = Mission.create(1L, "사진", "", MissionType.ACTIVITY, null, null);
        when(missionRepository.findById(2L)).thenReturn(Optional.of(mission));
        when(participantRepository.existsByTripIdAndUserId(1L, 10L)).thenReturn(true);
        when(storagePresigner.presignPut(any(), any())).thenReturn(new StoragePresigner.PresignedUpload("upload/missions/2/students/10/photo.png", "https://storage.example/upload"));

        missionService.preparePhotoUpload(2L, 10L, "image/png");

        org.mockito.Mockito.verify(storagePresigner).presignPut(org.mockito.ArgumentMatchers.endsWith(".png"), org.mockito.ArgumentMatchers.eq("image/png"));
    }

    @Test
    void teacherCanManuallyCompleteAMission() {
        Mission mission = Mission.create(1L, "사진", "", MissionType.ACTIVITY, null, null);
        when(missionRepository.findById(2L)).thenReturn(Optional.of(mission));
        when(tripRepository.findById(1L)).thenReturn(Optional.of(trip(100L)));

        missionService.complete(2L, 100L);

        assertThat(mission.isCompleted()).isTrue();
    }

    @Test
    void completingAnAlreadyCompletedMissionThrows() {
        Mission mission = Mission.create(1L, "사진", "", MissionType.ACTIVITY, null, null);
        mission.complete(LocalDateTime.now());
        when(missionRepository.findById(2L)).thenReturn(Optional.of(mission));
        when(tripRepository.findById(1L)).thenReturn(Optional.of(trip(100L)));

        assertThatThrownBy(() -> missionService.complete(2L, 100L))
                .isInstanceOf(ApiException.class);
    }

    @Test
    void studentCannotAccessACompletedMission() {
        Mission mission = Mission.create(1L, "사진", "", MissionType.ACTIVITY, null, null);
        mission.complete(LocalDateTime.now());
        when(missionRepository.findById(2L)).thenReturn(Optional.of(mission));
        when(participantRepository.existsByTripIdAndUserId(1L, 10L)).thenReturn(true);

        assertThatThrownBy(() -> missionService.getStudentMission(2L, 10L))
                .isInstanceOf(ApiException.class);
    }

    @Test
    void completedMissionsAreExcludedFromTheStudentsCurrentMissionList() {
        Mission open = Mission.create(1L, "진행중", "", MissionType.ACTIVITY, null, null);
        Mission completed = Mission.create(1L, "완료됨", "", MissionType.ACTIVITY, null, null);
        completed.complete(LocalDateTime.now());
        when(participantRepository.existsByTripIdAndUserId(1L, 10L)).thenReturn(true);
        when(missionRepository.findByTripIdOrderByStartAtAsc(1L)).thenReturn(List.of(open, completed));

        assertThat(missionService.getCurrentStudentMissions(1L, 10L)).containsExactly(open);
    }
}

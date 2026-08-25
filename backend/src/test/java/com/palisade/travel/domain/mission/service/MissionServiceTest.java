package com.palisade.travel.domain.mission.service;

import com.palisade.travel.domain.mission.entity.Mission;
import com.palisade.travel.domain.mission.entity.MissionSubmission;
import com.palisade.travel.domain.mission.entity.MissionType;
import com.palisade.travel.domain.mission.entity.SubmissionStatus;
import com.palisade.travel.domain.mission.repository.MissionRepository;
import com.palisade.travel.domain.mission.repository.MissionSubmissionRepository;
import com.palisade.travel.domain.mission.storage.StoragePresigner;
import com.palisade.travel.domain.trip.entity.Trip;
import com.palisade.travel.domain.trip.entity.TripStatus;
import com.palisade.travel.domain.trip.repository.TripParticipantRepository;
import com.palisade.travel.domain.trip.repository.TripRepository;
import com.palisade.travel.domain.user.entity.UserRole;
import com.palisade.travel.global.error.ApiException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
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
    @Mock StoragePresigner storagePresigner;
    @InjectMocks MissionService missionService;

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
}

package com.palisade.travel.domain.mission.service;

import com.palisade.travel.domain.mission.entity.*;
import com.palisade.travel.domain.mission.repository.MissionRepository;
import com.palisade.travel.domain.mission.repository.MissionSubmissionRepository;
import com.palisade.travel.domain.mission.storage.StoragePresigner;
import com.palisade.travel.domain.trip.entity.Trip;
import com.palisade.travel.domain.trip.entity.TripParticipant;
import com.palisade.travel.domain.trip.repository.TripParticipantRepository;
import com.palisade.travel.domain.trip.repository.TripRepository;
import com.palisade.travel.domain.user.entity.User;
import com.palisade.travel.domain.user.repository.UserRepository;
import com.palisade.travel.global.error.ApiException;
import com.palisade.travel.global.error.CommonErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class MissionService {
    private final MissionRepository missionRepository;
    private final MissionSubmissionRepository submissionRepository;
    private final TripRepository tripRepository;
    private final TripParticipantRepository participantRepository;
    private final UserRepository userRepository;
    private final StoragePresigner storagePresigner;

    @Transactional
    public Mission create(Long tripId, Long teacherId, String title, String description, MissionType type, LocalDateTime startAt, LocalDateTime endAt) {
        requireTeacher(tripId, teacherId);
        if (endAt != null && startAt != null && endAt.isBefore(startAt)) throw new ApiException(CommonErrorCode.INVALID_REQUEST);
        Mission mission = type == MissionType.CHECK ? Mission.createCheck(tripId, title, description, startAt, endAt, String.format("%04d", ThreadLocalRandom.current().nextInt(10_000))) : Mission.create(tripId, title, description, type, startAt, endAt);
        return missionRepository.save(mission);
    }
    public List<Mission> getTeacherMissions(Long tripId, Long teacherId) { requireTeacher(tripId, teacherId); return missionRepository.findByTripIdOrderByStartAtAsc(tripId); }
    @Transactional
    public Mission update(Long missionId, Long teacherId, String title, String description, LocalDateTime startAt, LocalDateTime endAt) {
        Mission mission = findMission(missionId); requireTeacher(mission.getTripId(), teacherId);
        if (endAt != null && startAt != null && endAt.isBefore(startAt)) throw new ApiException(CommonErrorCode.INVALID_REQUEST);
        mission.change(title, description, startAt, endAt); return mission;
    }
    public Mission getStudentMission(Long missionId, Long studentId) { Mission mission = findMission(missionId); requireParticipant(mission, studentId); requireAccessible(mission); return mission; }
    public List<Mission> getCurrentStudentMissions(Long tripId, Long studentId) { if (!participantRepository.existsByTripIdAndUserId(tripId, studentId)) throw new ApiException(CommonErrorCode.FORBIDDEN); LocalDateTime now=LocalDateTime.now(); return missionRepository.findByTripIdOrderByStartAtAsc(tripId).stream().filter(m -> m.isAccessibleAt(now)).toList(); }
    @Transactional
    public SubmissionResult verifyPin(Long missionId, Long studentId, String pin) {
        Mission mission = getStudentMission(missionId, studentId);
        if (mission.getType() != MissionType.CHECK || !mission.matchesPin(pin) || mission.isExpiredAt(LocalDateTime.now())) throw new ApiException(CommonErrorCode.INVALID_REQUEST);
        MissionSubmission submission = submissionRepository.findByMissionIdAndUserId(missionId, studentId).orElseGet(() -> submissionRepository.save(MissionSubmission.completedCheck(missionId, studentId)));
        return SubmissionResult.from(submission, mission);
    }
    @Transactional
    public SubmissionResult submitPhoto(Long missionId, Long studentId, String imageKey) {
        Mission mission=getStudentMission(missionId, studentId);
        String requiredPrefix = "upload/missions/" + missionId + "/students/" + studentId + "/";
        if (mission.getType()!=MissionType.ACTIVITY || mission.isExpiredAt(LocalDateTime.now()) || imageKey==null || !imageKey.startsWith(requiredPrefix)) throw new ApiException(CommonErrorCode.INVALID_REQUEST);
        MissionSubmission submission=submissionRepository.findByMissionIdAndUserId(missionId, studentId).map(s -> { if (s.getStatus()!=SubmissionStatus.REJECTED) throw new ApiException(CommonErrorCode.INVALID_REQUEST); s.resubmit(imageKey); return s; }).orElseGet(() -> submissionRepository.save(MissionSubmission.photo(missionId,studentId,imageKey)));
        return SubmissionResult.from(submission, mission);
    }
    public StoragePresigner.PresignedUpload preparePhotoUpload(Long missionId, Long studentId) { Mission mission=getStudentMission(missionId,studentId); if (mission.getType()!=MissionType.ACTIVITY || mission.isExpiredAt(LocalDateTime.now())) throw new ApiException(CommonErrorCode.INVALID_REQUEST); return storagePresigner.presignPut("upload/missions/"+missionId+"/students/"+studentId+"/"+java.util.UUID.randomUUID()+".jpg"); }
    @Transactional
    public void reject(Long missionId, Long studentId, Long teacherId, String reason) { Mission mission=findMission(missionId); requireTeacher(mission.getTripId(),teacherId); MissionSubmission submission=submissionRepository.findByMissionIdAndUserId(missionId,studentId).orElseThrow(() -> new ApiException(CommonErrorCode.INVALID_REQUEST)); submission.reject(reason); }
    @Transactional
    public void delete(Long missionId, Long teacherId) { Mission mission=findMission(missionId); requireTeacher(mission.getTripId(), teacherId); missionRepository.delete(mission); }
    public String getPin(Long missionId, Long teacherId) { Mission mission=findMission(missionId); requireTeacher(mission.getTripId(), teacherId); if (mission.getType()!=MissionType.CHECK) throw new ApiException(CommonErrorCode.INVALID_REQUEST); return mission.getAttendancePin(); }
    public SubmissionResult getSubmission(Long missionId, Long studentId) { Mission mission=getStudentMission(missionId,studentId); return submissionRepository.findByMissionIdAndUserId(missionId,studentId).map(s -> SubmissionResult.from(s,mission)).orElse(new SubmissionResult(null, SubmissionStatus.WAITING, null)); }

    public StatusBoard getStatusBoard(Long missionId, Long teacherId) {
        Mission mission = findMission(missionId);
        requireTeacher(mission.getTripId(), teacherId);
        List<TripParticipant> roster = participantRepository.findAllByTripIdOrderByCreatedAtAsc(mission.getTripId()).stream()
                .filter(participant -> participant.getUserId() != null).toList();
        Map<Long, MissionSubmission> submissionsByStudent = submissionRepository.findByMissionId(missionId).stream()
                .collect(Collectors.toMap(MissionSubmission::getUserId, s -> s));
        Map<Long, String> namesByStudent = userRepository.findAllById(roster.stream().map(TripParticipant::getUserId).toList()).stream()
                .collect(Collectors.toMap(User::getId, User::getName));

        List<SubmittedEntry> submitted = new ArrayList<>();
        List<NotSubmittedEntry> notSubmitted = new ArrayList<>();
        for (TripParticipant participant : roster) {
            Long studentId = participant.getUserId();
            String studentName = namesByStudent.getOrDefault(studentId, participant.getParticipantName());
            MissionSubmission submission = submissionsByStudent.get(studentId);
            if (submission != null && submission.getStatus() == SubmissionStatus.COMPLETED) {
                submitted.add(new SubmittedEntry(studentId, studentName, submission.getImageKey(), submission.getCreatedAt()));
            } else {
                String rejectionReason = submission != null && submission.getStatus() == SubmissionStatus.REJECTED ? submission.getRejectionReason() : null;
                notSubmitted.add(new NotSubmittedEntry(studentId, studentName, rejectionReason));
            }
        }
        return new StatusBoard(mission, roster.size(), submitted, notSubmitted);
    }

    @Transactional
    public void completeOnBehalf(Long missionId, Long teacherId, Long studentId) {
        Mission mission = findMission(missionId);
        requireTeacher(mission.getTripId(), teacherId);
        if (participantRepository.findByTripIdAndUserId(mission.getTripId(), studentId).isEmpty()) throw new ApiException(CommonErrorCode.INVALID_REQUEST);
        submissionRepository.findByMissionIdAndUserId(missionId, studentId)
                .map(submission -> { submission.completeByTeacher(); return submission; })
                .orElseGet(() -> submissionRepository.save(MissionSubmission.completedByTeacher(missionId, studentId)));
    }

    private Mission findMission(Long id) { return missionRepository.findById(id).orElseThrow(() -> new ApiException(CommonErrorCode.INVALID_REQUEST)); }
    private void requireParticipant(Mission mission, Long userId) { if (!participantRepository.existsByTripIdAndUserId(mission.getTripId(),userId)) throw new ApiException(CommonErrorCode.FORBIDDEN); }
    private void requireAccessible(Mission mission) { if (!mission.isAccessibleAt(LocalDateTime.now())) throw new ApiException(CommonErrorCode.FORBIDDEN); }
    private void requireTeacher(Long tripId, Long teacherId) { Trip trip=tripRepository.findById(tripId).orElseThrow(() -> new ApiException(CommonErrorCode.INVALID_REQUEST)); if (!trip.getTeacherId().equals(teacherId)) throw new ApiException(CommonErrorCode.FORBIDDEN); }
    public record SubmissionResult(Long submissionId, SubmissionStatus status, String imageKey) { static SubmissionResult from(MissionSubmission submission, Mission mission) { return new SubmissionResult(submission.getId(), submission.currentStatus(LocalDateTime.now(),mission), submission.getImageKey()); } }
    public record StatusBoard(Mission mission, int totalStudentCount, List<SubmittedEntry> submitted, List<NotSubmittedEntry> notSubmitted) {}
    public record SubmittedEntry(Long studentId, String studentName, String imageKey, LocalDateTime submittedAt) {}
    public record NotSubmittedEntry(Long studentId, String studentName, String rejectionReason) {}
}

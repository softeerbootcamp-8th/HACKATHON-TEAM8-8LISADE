package com.palisade.travel.domain.user.service;

import com.palisade.travel.domain.user.exception.UserErrorCode;
import com.palisade.travel.domain.user.exception.UserException;
import com.palisade.travel.domain.user.repository.UserRepository;
import com.palisade.travel.global.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.session.SessionInformation;
import org.springframework.security.core.session.SessionRegistry;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AdminSessionService {

    private final SessionRegistry sessionRegistry;
    private final UserRepository userRepository;

    /**
     * 특정 유저와 연결된 모든 활성 세션을 강제로 만료시킨다.
     * {@link SessionInformation#expireNow()}는 만료 플래그만 세우며, 실제로 요청이 거부되는 시점은
     * 다음 요청에서 {@code ConcurrentSessionFilter}가 이 플래그를 확인할 때다.
     *
     * @return 강제 만료된 세션 개수
     */
    @Transactional(readOnly = true)
    public int expireAllSessions(Long userId) {
        if (!userRepository.existsById(userId)) {
            throw new UserException(UserErrorCode.USER_NOT_FOUND);
        }

        int expiredSessionCount = 0;
        for (Object principal : sessionRegistry.getAllPrincipals()) {
            if (!(principal instanceof UserPrincipal userPrincipal) || !userPrincipal.userId().equals(userId)) {
                continue;
            }
            for (SessionInformation sessionInformation : sessionRegistry.getAllSessions(principal, false)) {
                sessionInformation.expireNow();
                expiredSessionCount++;
            }
        }
        return expiredSessionCount;
    }
}

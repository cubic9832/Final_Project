package com.kh.back.member.recommendation;

import lombok.RequiredArgsConstructor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class RecommendationInputsService {
    private final RecommendationInputsRepository repository;

    public RecommendationInputsRepository.Saved get(Long userId) {
        long owner = member(userId);
        repository.requireMember(owner, false);
        return repository.find(owner);
    }

    @Transactional
    public RecommendationInputsRepository.Saved save(Long userId, RecommendationInputsRequest request) {
        long owner = member(userId);
        // The withdrawal transaction takes the same owner lock before deleting personal inputs.
        repository.requireMember(owner, true);
        if (request.financialInputs() == null && request.vehiclePreferences() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "저장할 입력이 필요합니다.");
        }
        if (request.version() == 0) {
            try {
                repository.insert(owner, request);
            } catch (DuplicateKeyException error) {
                throw conflict();
            }
        } else if (repository.update(owner, request) != 1) {
            throw conflict();
        }
        return repository.find(owner);
    }

    private long member(Long userId) {
        if (userId == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다.");
        return userId;
    }

    private ResponseStatusException conflict() {
        return new ResponseStatusException(HttpStatus.CONFLICT, "다른 곳에서 입력 정보가 변경되었습니다.");
    }
}

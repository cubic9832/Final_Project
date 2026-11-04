package com.kh.back.admin.service;

import com.kh.back.admin.dto.ModelTrafficRequest.Allocation;
import java.util.List;

// 모델 관리: 여러 추천 모델에 사용자를 나눠 보내는 비율 바꾸기 (총관리자, 운영 로그에 남긴다)
public interface AdminModelTrafficService {

    void updateAllocations(Long actorId, List<Allocation> allocations);
}

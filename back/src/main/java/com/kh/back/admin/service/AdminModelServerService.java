package com.kh.back.admin.service;

import com.kh.back.admin.dto.ModelServerResponse;

// 모델 관리: 관리자 화면에서 추천 서버 켜기 · 끄기 (총관리자, 운영 로그에 남긴다)
public interface AdminModelServerService {

    ModelServerResponse start(Long actorId, String runId);

    void stop(Long actorId, int port);
}

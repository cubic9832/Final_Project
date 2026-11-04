package com.kh.back.admin.dto;

// 모델 관리: 켜기 요청을 받은 추천 서버 (켜는 데 몇 초 걸려 처음엔 STARTING — 화면이 /admin/models 를 다시 불러 상태를 본다)
public record ModelServerResponse(int port, String runName, String state) {
}

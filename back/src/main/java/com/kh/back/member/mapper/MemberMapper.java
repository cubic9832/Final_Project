package com.kh.back.member.mapper;

import com.kh.back.member.dto.MemberDto;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface MemberMapper {

    MemberDto findById(Long id);

    MemberDto findByEmail(String email);

    // 같은 닉네임 회원 수 (보완 3 · 닉네임 중복 확인). 0 이면 사용 가능
    int countByNickName(String nickName);

    // 실행 후 member.id 에 DB 가 만든 번호가 채워진다 (XML 의 useGeneratedKeys)
    void insert(MemberDto member);

    // 보완 7 추가: 비밀번호 재설정
    int updatePasswordHash(@Param("id") Long id, @Param("passwordHash") String passwordHash);

    // 닉네임 변경 (보완 3 추가). UNIQUE(V7) 에 걸리면 DuplicateKeyException
    int updateNickName(@Param("id") Long id, @Param("nickName") String nickName);

    // ── 회원 탈퇴 (보완 4) — MemberServiceImpl.withdraw 에서 한 트랜잭션으로 순서대로 실행 ──
    // users 를 참조하는 데이터를 먼저 정리해야 회원을 지울 수 있다 (외래키)
    int deleteFavoriteVehicles(Long userId);   // 관심차량 삭제

    int deletePurchasePlans(Long userId);      // 구매계획 삭제

    int detachInputSnapshots(Long userId);     // 분석 입력 기록은 남기고 회원 연결만 끊음 (user_id = NULL)

    // 보완 15: 회원 줄은 남기고 "탈퇴 회원" 으로 바꾼다 (role = WITHDRAWN, 이메일 · 닉네임 · 비밀번호를 알아볼 수 없는 값으로)
    int anonymize(@Param("id") Long id, @Param("email") String email, @Param("nickName") String nickName);

    // 보완 15: 예전에는 회원 삭제 때 CASCADE 로 함께 지워지던 개인 데이터 — 이제 직접 지운다
    int deleteProfile(Long userId);            // 생년월일 · 성별 등

    int deleteSocialAccounts(Long userId);     // 구글 연결 (끊어야 같은 구글 계정으로 새로 가입할 수 있다)

    int deleteAgreements(Long userId);         // 약관 동의

    int deleteCurrentTaste(Long userId);       // 취향 테스트 결과

    int deleteAdminAccount(Long userId);       // 관리자 권한 (관리자가 탈퇴할 때)

    int deleteQuickReplies(Long userId);       // 상담원 자주 쓰는 문구
}

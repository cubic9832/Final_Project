package com.kh.back.member.service;

import com.kh.back.member.dto.ProfileUpdateRequest;
import com.kh.back.member.dto.UserProfileDto;
import com.kh.back.member.dto.MemberDto;
import com.kh.back.member.dto.MemberResponse;
import com.kh.back.member.mapper.MemberMapper;
import com.kh.back.member.mapper.UserProfileMapper;

import com.kh.back.auth.service.NickNamePolicy;
import com.kh.back.auth.service.PasswordChangeLimiter;
import com.kh.back.auth.mapper.RefreshTokenMapper;
import com.kh.back.chat.service.ChatRoomService;
import com.kh.back.common.exception.ApiException;
import java.time.LocalDate;
import java.time.Period;
import java.util.HashSet;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class MemberServiceImpl implements MemberService {

    // 가입 · 입력 가능 나이 — 회원가입 AuthServiceImpl.MIN_SIGNUP_AGE · 화면 profileRules.js 와 같은 값 (운전면허 취득 가능 나이)
    private static final int MIN_AGE = 18;

    private final MemberMapper memberMapper;
    private final UserProfileMapper userProfileMapper;
    private final PasswordEncoder passwordEncoder;
    private final PasswordChangeLimiter passwordChangeLimiter; // 보완 4 추가: 비밀번호 변경과 같은 "현재 비밀번호 틀린 횟수"
    private final RefreshTokenMapper refreshTokenMapper;
    private final ChatRoomService chatRoomService; // 보완 15: 탈퇴하면 진행 중 1:1 상담 종료

    @Override
    @Transactional(readOnly = true)
    public MemberResponse getMember(Long userId) {
        // 보완 5: 개인 정보(user_profiles)를 함께 돌려준다. 보완 5 이전 가입 회원은 null
        return MemberResponse.from(findMember(userId), userProfileMapper.findByUserId(userId));
    }

    // 닉네임 변경 (보완 3 추가) — 마이페이지 [프로필 수정] 팝업
    // 회원가입과 같은 중복 금지: 먼저 세어 보고, 그사이 다른 사람이 먼저 바꿨으면 UNIQUE(V7) 오류로 한 번 더 막는다
    // 보완 3 추가: 회원가입과 같은 금지어 검사 (바꿀 때만. 지금 닉네임 그대로 저장하면 검사하지 않는다)
    @Override
    @Transactional
    public MemberResponse updateNickName(Long userId, String nickName) {
        MemberDto member = findMember(userId);
        changeNickName(member, nickName);
        return MemberResponse.from(member, userProfileMapper.findByUserId(userId));
    }

    // 닉네임 바꾸기 (PATCH /members/me 와 개인정보 저장이 같이 쓴다). 같은 닉네임이면 아무것도 하지 않는다
    private void changeNickName(MemberDto member, String nickName) {
        Long userId = member.getId();
        if (!nickName.equals(member.getNickName())) {
            String forbidden = NickNamePolicy.check(nickName);
            if (forbidden != null) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "NICKNAME_FORBIDDEN", forbidden);
            }
            if (memberMapper.countByNickName(nickName) > 0) {
                throw nickNameDuplicated();
            }
            try {
                memberMapper.updateNickName(userId, nickName);
            } catch (DuplicateKeyException e) {
                throw nickNameDuplicated();
            }
            member.setNickName(nickName);
        }
    }

    // 개인정보 수정 (6단계) — 개인정보 · 계정 관리 화면 [개인정보 저장]
    // 구글로 가입한 회원은 user_profiles 행이 없을 수 있어 upsert(없으면 만들고 있으면 바꾸기)로 저장한다
    @Override
    @Transactional
    public MemberResponse updateProfile(Long userId, ProfileUpdateRequest request) {
        MemberDto member = findMember(userId);
        UserProfileDto profile = userProfileMapper.findByUserId(userId);
        if (profile == null) {
            profile = new UserProfileDto();
            profile.setUserId(userId);
        }
        // 10-27: 이번 요청에서 바꾼 칸 — DB 에는 이 칸만 쓴다 (동시에 다른 칸을 저장한 요청을 덮어쓰지 않게)
        Set<String> changed = new HashSet<>();

        // 생년월일 · 성별: 보내지 않으면 그대로
        if (request.getBirthDate() != null) {
            // 회원가입과 같은 만 18세 검사 (구글 가입은 "만 18세 이상" 동의만 받았으므로 여기서 처음 확인된다)
            if (Period.between(request.getBirthDate(), LocalDate.now()).getYears() < MIN_AGE) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "AGE_RESTRICTED",
                        "만 " + MIN_AGE + "세 이상만 입력할 수 있습니다. 생년월일을 다시 확인해 주세요.");
            }
            profile.setBirthDate(request.getBirthDate());
            changed.add("birthDate");
        }
        if (request.getGender() != null) {
            profile.setGender(request.getGender());
            changed.add("gender");
        }

        // 전화번호(필수, 보완 11): null = 그대로, 값 = 바꾸기, 빈 값으로 지우는 요청은 거절
        // (Controller 의 @Valid 를 거치지 않는 호출도 여기서 막는다)
        if (request.getPhone() != null) {
            if (request.getPhone().isBlank()) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "PHONE_REQUIRED", "전화번호를 입력해 주세요.");
            }
            profile.setPhone(request.getPhone().replace("-", "")); // 숫자만 저장
            changed.add("phone");
        }
        if (request.getDrivingExperience() != null) {
            profile.setDrivingExperience(blankToNull(request.getDrivingExperience()));
            changed.add("drivingExperience");
        }
        if (request.getPurchaseTiming() != null) {
            profile.setPurchaseTiming(blankToNull(request.getPurchaseTiming()));
            changed.add("purchaseTiming");
        }

        // 닉네임도 같은 트랜잭션에서 바꾼다 → 아래 저장이 실패하면 닉네임 변경도 함께 취소된다
        // (예전에는 화면이 닉네임 PATCH 후 개인정보 PUT 을 따로 불러, 뒤가 실패하면 닉네임만 바뀌었다)
        if (request.getNickName() != null) {
            changeNickName(member, request.getNickName());
        }
        if (!changed.isEmpty()) {
            userProfileMapper.upsert(profile, changed); // 닉네임만 바꿨으면 개인정보 표는 건드리지 않는다
        }
        return MemberResponse.from(member, profile);
    }

    private static String blankToNull(String value) {
        return value.isBlank() ? null : value;
    }

    private ApiException nickNameDuplicated() {
        return new ApiException(HttpStatus.CONFLICT, "NICKNAME_DUPLICATED", "이미 사용 중인 닉네임입니다.");
    }

    // 회원 탈퇴 (보완 4)
    // 한 트랜잭션: 중간에 하나라도 실패하면 모두 취소되어 "반만 탈퇴된" 상태가 생기지 않는다
    // noRollbackFor: 오류는 삭제 전에만 난다. 5번 틀려 로그아웃시킬 때 지운 refresh token 이 롤백으로 되살아나지 않게 (보완 4 추가)
    @Override
    @Transactional(noRollbackFor = ApiException.class)
    public void withdraw(Long userId, String password, String confirmText) {
        memberMapper.lockRecommendationInputsOwner(userId);
        MemberDto member = findMember(userId);
        // 11-05: 일반 관리자도 직접 탈퇴하지 않는다 — 총관리자가 권한을 빼면(회원 관리) 일반 회원이 되고, 그때 탈퇴한다
        // (직원 계정은 본인이 아니라 운영 쪽이 회수 · 운영 로그의 작업자가 갑자기 "탈퇴한 회원" 으로 바뀌지 않게)
        if ("ADMIN".equals(member.getRole())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "ADMIN_WITHDRAW",
                    "관리자는 직접 탈퇴할 수 없습니다. 총관리자에게 관리자 권한 해제를 요청한 뒤 탈퇴해 주세요.");
        }
        // 9단계: 정지 중에는 탈퇴할 수 없다 — 탈퇴 → 같은 이메일로 다시 가입해 정지를 피하지 못하게
        // (정지하면 로그인이 막히지만, 이미 받은 access token 이 최대 30분 남아 있을 수 있다)
        AccountSuspension.requireActive(member);

        if (member.isSocialOnly()) {
            // 보완 8: 구글로만 가입한 회원은 비밀번호가 없다 → "탈퇴" 를 직접 입력했는지로 확인
            if (!"탈퇴".equals(confirmText == null ? null : confirmText.trim())) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "CONFIRM_TEXT_MISMATCH", "확인을 위해 \"탈퇴\"를 정확히 입력해 주세요.");
            }
        } else if (password == null || password.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "BAD_REQUEST", "비밀번호를 입력해 주세요.");
        } else if (lockedOrMismatch(userId, password, member)) {
            // 되돌릴 수 없는 작업이라 비밀번호를 한 번 더 확인한다 (로그인과 같은 BCrypt 비교)
            // 보완 4 추가: 비밀번호 변경과 합쳐 5번 틀리면 모든 기기 로그아웃 (맞히는 순간 계정이 지워지므로)
            ApiException failure = passwordChangeLimiter.mismatch(userId, "비밀번호가 올바르지 않습니다.");
            if (PasswordChangeLimiter.LOGOUT_CODE.equals(failure.getCode())) {
                refreshTokenMapper.deleteByUserId(userId);
            }
            throw failure;
        }
        passwordChangeLimiter.reset(userId);

        if ("SUPER_ADMIN".equals(member.getRole())) {
            // 잠금 조회는 다른 탈퇴가 끝난 뒤의 최신 상태를 읽으며, 정리 작업 전에 검사한다.
            var superAdminIds = memberMapper.lockSuperAdminIds();
            if (!superAdminIds.contains(userId)) {
                throw new ApiException(HttpStatus.NOT_FOUND, "MEMBER_NOT_FOUND", "회원 정보를 찾을 수 없습니다.");
            }
            if (superAdminIds.size() <= 1) {
                throw new ApiException(HttpStatus.CONFLICT, "SUPER_ADMIN_WITHDRAW",
                        "마지막 총관리자는 탈퇴할 수 없습니다. 다른 총관리자를 먼저 지정해 주세요.");
            }
        }

        // 보완 15 (11-03 회의): 회원 줄은 남기고 "탈퇴 회원" 으로 바꾼다 — 1:1 상담 · 만족도 · 신고 · 콤파 대화는 그대로 남는다
        // 개인 데이터는 지우고, 이메일 · 닉네임은 알아볼 수 없는 값으로 → 같은 이메일로 다시 가입하면 새 회원 (예전 기록과 연결 안 됨)

        memberMapper.detachInputSnapshots(userId);
        memberMapper.deleteRecommendationInputs(userId);
        memberMapper.deleteProfile(userId);
        memberMapper.deleteSocialAccounts(userId);
        memberMapper.deleteAgreements(userId);
        memberMapper.deleteCurrentTaste(userId);
        // 일반 관리자는 직접 탈퇴할 수 없고, 탈퇴 가능한 총관리자는 상담 배정·권한을 정리한다.
        if ("SUPER_ADMIN".equals(member.getRole())) {
            chatRoomService.releaseRoomsOf(userId); // 맡던 진행 중 상담 → 대기 (다른 관리자가 다시 맡는다)
            memberMapper.deleteAdminAccount(userId);
            memberMapper.deleteQuickReplies(userId);
        }
        chatRoomService.closeForWithdrawal(userId); // 대기 · 진행 중이던 내 상담은 종료
        refreshTokenMapper.deleteByUserId(userId); // 다른 브라우저 로그인도 끝남
        memberMapper.anonymize(userId, withdrawnEmail(userId), withdrawnNickName(userId));
    }

    // 탈퇴 회원 이메일: 실제로 받을 수 없는 주소(.invalid), 번호로 겹치지 않게
    static String withdrawnEmail(Long userId) {
        return "withdrawn-" + userId + "@deleted.invalid";
    }

    // 탈퇴 회원 닉네임: 관리자 상담 화면 · 운영 로그에 이 이름으로 보인다. 13자 이상이라 회원이 고를 수 없는 이름(닉네임은 2~12자)
    static String withdrawnNickName(Long userId) {
        return "[탈퇴한 회원] 번호 " + userId;
    }

    // 10-22: 5번 틀려 잠겼으면 비밀번호를 보지 않고 거절(429), 아니면 비밀번호가 틀렸는지
    private boolean lockedOrMismatch(Long userId, String password, MemberDto member) {
        passwordChangeLimiter.checkLocked(userId);
        return !passwordEncoder.matches(password, member.getPasswordHash());
    }

    private MemberDto findMember(Long userId) {
        MemberDto member = memberMapper.findById(userId);
        if (member == null) {
            // 토큰은 유효한데 회원이 탈퇴 등으로 사라진 경우
            throw new ApiException(HttpStatus.NOT_FOUND, "MEMBER_NOT_FOUND", "회원 정보를 찾을 수 없습니다.");
        }
        return member;
    }
}

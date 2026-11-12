package com.kh.back.member.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.kh.back.auth.mapper.RefreshTokenMapper;
import com.kh.back.auth.service.PasswordChangeLimiter;
import com.kh.back.chat.service.ChatRoomService;
import com.kh.back.common.exception.ApiException;
import com.kh.back.member.dto.MemberDto;
import com.kh.back.member.mapper.MemberMapper;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;

// 일반 관리자 직접 탈퇴 차단 및 마지막 총관리자 보호.
@ExtendWith(MockitoExtension.class)
class MemberWithdrawTests {

    @Mock MemberMapper memberMapper;
    @Mock PasswordEncoder passwordEncoder;
    @Mock PasswordChangeLimiter passwordChangeLimiter;
    @Mock RefreshTokenMapper refreshTokenMapper;
    @Mock ChatRoomService chatRoomService;
    @InjectMocks MemberServiceImpl memberService;

    @Test
    void 탈퇴_회원_이메일_닉네임은_번호로_겹치지_않고_회원이_고를_수_없는_이름이다() {
        assertThat(MemberServiceImpl.withdrawnEmail(12L)).isEqualTo("withdrawn-12@deleted.invalid");
        // 닉네임은 2~12자만 쓸 수 있다 → 13자 이상이면 회원이 같은 이름을 미리 쓸 수 없다
        assertThat(MemberServiceImpl.withdrawnNickName(1L)).hasSizeGreaterThan(12);
    }

    @Test
    void 마지막_총관리자는_탈퇴할_수_없고_개인정보와_권한을_유지한다() {
        givenSuperAdmin();
        when(passwordEncoder.matches("password", "$2a$bcrypt")).thenReturn(true);
        when(memberMapper.lockSuperAdminIds()).thenReturn(List.of(35L));

        assertThatThrownBy(() -> memberService.withdraw(35L, "password", null))
                .isInstanceOfSatisfying(ApiException.class, e -> assertThat(e.getCode()).isEqualTo("SUPER_ADMIN_WITHDRAW"));
        verify(memberMapper, never()).deleteProfile(any());
        verify(memberMapper, never()).deleteAdminAccount(any());
        verify(memberMapper, never()).anonymize(any(), any(), any());
        verify(chatRoomService, never()).releaseRoomsOf(any());
    }

    @Test
    void 다른_총관리자가_있으면_권한과_상담배정을_정리하고_탈퇴한다() {
        givenSuperAdmin();
        when(passwordEncoder.matches("password", "$2a$bcrypt")).thenReturn(true);
        when(memberMapper.lockSuperAdminIds()).thenReturn(List.of(35L, 36L));

        memberService.withdraw(35L, "password", null);

        verify(chatRoomService).releaseRoomsOf(35L);
        verify(memberMapper).deleteAdminAccount(35L);
        verify(memberMapper).deleteQuickReplies(35L);
        verify(chatRoomService).closeForWithdrawal(35L);
        verify(refreshTokenMapper).deleteByUserId(35L);
        verify(memberMapper).anonymize(35L, "withdrawn-35@deleted.invalid", MemberServiceImpl.withdrawnNickName(35L));
    }

    @Test
    void 총관리자도_비밀번호가_틀리면_탈퇴할_수_없다() {
        givenSuperAdmin();
        when(passwordChangeLimiter.mismatch(35L, "비밀번호가 올바르지 않습니다."))
                .thenReturn(new ApiException(HttpStatus.BAD_REQUEST, "PASSWORD_MISMATCH", "비밀번호가 올바르지 않습니다."));

        assertThatThrownBy(() -> memberService.withdraw(35L, "wrong", null))
                .isInstanceOfSatisfying(ApiException.class, e -> assertThat(e.getCode()).isEqualTo("PASSWORD_MISMATCH"));
        verify(memberMapper, never()).lockSuperAdminIds();
        verify(memberMapper, never()).deleteAdminAccount(any());
        verify(memberMapper, never()).anonymize(any(), any(), any());
    }

    @Test
    void 대기중_다른_요청에서_이미_탈퇴한_총관리자는_다시_처리하지_않는다() {
        givenSuperAdmin();
        when(passwordEncoder.matches("password", "$2a$bcrypt")).thenReturn(true);
        when(memberMapper.lockSuperAdminIds()).thenReturn(List.of(36L, 37L));

        assertThatThrownBy(() -> memberService.withdraw(35L, "password", null))
                .isInstanceOfSatisfying(ApiException.class, e -> assertThat(e.getCode()).isEqualTo("MEMBER_NOT_FOUND"));
        verify(memberMapper, never()).deleteProfile(any());
        verify(memberMapper, never()).deleteAdminAccount(any());
    }

    private void givenSuperAdmin() {
        MemberDto superAdmin = new MemberDto();
        superAdmin.setId(35L);
        superAdmin.setRole("SUPER_ADMIN");
        superAdmin.setPasswordHash("$2a$bcrypt");
        when(memberMapper.findById(35L)).thenReturn(superAdmin);

    }

    @Test
    void 일반_관리자도_직접_탈퇴할_수_없다() { // 11-05: 총관리자가 권한을 뺀 뒤 일반 회원으로 탈퇴
        MemberDto admin = new MemberDto();
        admin.setId(77L);
        admin.setRole("ADMIN");
        admin.setPasswordHash("$2a$bcrypt");
        when(memberMapper.findById(77L)).thenReturn(admin);

        assertThatThrownBy(() -> memberService.withdraw(77L, "password", null))
                .isInstanceOfSatisfying(ApiException.class, e -> assertThat(e.getCode()).isEqualTo("ADMIN_WITHDRAW"));
        verify(memberMapper, never()).anonymize(any(), any(), any());
    }
}

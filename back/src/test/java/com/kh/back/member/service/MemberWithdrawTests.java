package com.kh.back.member.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.kh.back.common.exception.ApiException;
import com.kh.back.member.dto.MemberDto;
import com.kh.back.member.mapper.MemberMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

// 7단계: 총관리자는 탈퇴할 수 없다 (관리자 권한을 줄 사람이 없어지므로)
@ExtendWith(MockitoExtension.class)
class MemberWithdrawTests {

    @Mock MemberMapper memberMapper;
    @InjectMocks MemberServiceImpl memberService;

    @Test
    void 탈퇴_회원_이메일_닉네임은_번호로_겹치지_않고_회원이_고를_수_없는_이름이다() {
        assertThat(MemberServiceImpl.withdrawnEmail(12L)).isEqualTo("withdrawn-12@deleted.invalid");
        // 닉네임은 2~12자만 쓸 수 있다 → 13자 이상이면 회원이 같은 이름을 미리 쓸 수 없다
        assertThat(MemberServiceImpl.withdrawnNickName(1L)).hasSizeGreaterThan(12);
    }

    @Test
    void 총관리자는_탈퇴할_수_없다() {
        MemberDto superAdmin = new MemberDto();
        superAdmin.setId(35L);
        superAdmin.setRole("SUPER_ADMIN");
        superAdmin.setPasswordHash("$2a$bcrypt");
        when(memberMapper.findById(35L)).thenReturn(superAdmin);

        assertThatThrownBy(() -> memberService.withdraw(35L, "password", null))
                .isInstanceOfSatisfying(ApiException.class, e -> assertThat(e.getCode()).isEqualTo("SUPER_ADMIN_WITHDRAW"));
        verify(memberMapper, never()).anonymize(any(), any(), any());
    }
}

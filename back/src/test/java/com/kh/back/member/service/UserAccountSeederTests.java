package com.kh.back.member.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anySet;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.kh.back.diagnosis.dto.DiagnosisLoan;
import com.kh.back.diagnosis.dto.DiagnosisSaveRequest;
import com.kh.back.diagnosis.service.DiagnosisService;
import com.kh.back.member.dto.MemberDto;
import com.kh.back.member.dto.UserProfileDto;
import com.kh.back.member.mapper.MemberMapper;
import com.kh.back.member.mapper.UserAgreementMapper;
import com.kh.back.member.mapper.UserProfileMapper;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.crypto.password.PasswordEncoder;

// 일반 회원 테스트 계정 시드 — 값이 있을 때만 실제 회원처럼 개인 정보 · 동의 · 재무 진단까지 만들고, 이미 있으면 건드리지 않는다
class UserAccountSeederTests {

    private final MemberMapper memberMapper = mock(MemberMapper.class);
    private final UserProfileMapper userProfileMapper = mock(UserProfileMapper.class);
    private final UserAgreementMapper userAgreementMapper = mock(UserAgreementMapper.class);
    private final DiagnosisService diagnosisService = mock(DiagnosisService.class);
    private final PasswordEncoder passwordEncoder = mock(PasswordEncoder.class);

    private UserAccountSeeder seeder(String emails, String password) {
        return new UserAccountSeeder(memberMapper, userProfileMapper, userAgreementMapper, diagnosisService,
                passwordEncoder, emails, password);
    }

    @Test
    void 값이_없으면_아무것도_하지_않는다() {
        seeder("", "").seed();
        verifyNoInteractions(memberMapper, userProfileMapper, userAgreementMapper, diagnosisService);
    }

    @Test
    void 없는_이메일이면_일반_회원과_개인_정보_동의_재무_진단을_만든다() {
        when(passwordEncoder.encode(any())).thenReturn("hashed");

        seeder(" Member@Example.com ", "Credit#Seed27").seed();

        ArgumentCaptor<MemberDto> saved = ArgumentCaptor.forClass(MemberDto.class);
        verify(memberMapper).insert(saved.capture());
        assertThat(saved.getValue().getEmail()).isEqualTo("member@example.com");
        assertThat(saved.getValue().getRole()).isEqualTo("USER");
        assertThat(saved.getValue().getPasswordHash()).isEqualTo("hashed");
        ArgumentCaptor<UserProfileDto> profile = ArgumentCaptor.forClass(UserProfileDto.class);
        verify(userProfileMapper).upsert(profile.capture(), anySet());
        assertThat(profile.getValue().getPurchaseTiming()).isNotNull();
        verify(userAgreementMapper).insert(any());
        verify(diagnosisService).save(any(), any(DiagnosisSaveRequest.class));
    }

    @Test
    void 이메일을_여러_개_적으면_순서대로_인물을_붙이고_이미_있는_이메일은_건너뛴다() {
        when(memberMapper.findByEmail("taken@example.com")).thenReturn(new MemberDto());

        seeder("one@example.com, taken@example.com ,three@example.com", "Credit#Seed27").seed();

        ArgumentCaptor<MemberDto> saved = ArgumentCaptor.forClass(MemberDto.class);
        verify(memberMapper, times(2)).insert(saved.capture());
        assertThat(saved.getAllValues()).extracting(MemberDto::getEmail)
                .containsExactly("one@example.com", "three@example.com");
        assertThat(saved.getAllValues()).extracting(MemberDto::getNickName)
                .containsExactly("준혁97", "도현아빠");
        verify(diagnosisService, times(2)).save(any(), any());
    }

    @Test
    void 이미_가입한_이메일이면_바꾸지_않는다() {
        when(memberMapper.findByEmail("member@example.com")).thenReturn(new MemberDto());

        seeder("member@example.com", "Credit#Seed27").seed();

        verify(memberMapper, never()).insert(any());
        verifyNoInteractions(userProfileMapper, userAgreementMapper, diagnosisService);
    }

    @Test
    void 비밀번호가_규칙에_맞지_않으면_만들지_않는다() {
        seeder("member@example.com", "1234").seed();
        verify(memberMapper, never()).insert(any());
        verify(diagnosisService, never()).save(anyLong(), any());
    }

    // 재무 진단 화면과 같은 규칙: 월 여유금 = 소득(기타 소득 포함) - 지출 - 대출 월 상환액 합계
    @Test
    void 재무_진단의_월_여유금은_소득에서_지출과_대출_상환액을_뺀_값이다() {
        UserAccountSeeder.Persona family = UserAccountSeeder.PERSONAS.get(2);

        DiagnosisSaveRequest request = UserAccountSeeder.diagnosis(family);

        assertThat(request.getMonthlyAvailable()).isEqualTo(5_500_000 - 3_600_000 - 1_200_000 - 350_000);
        assertThat(request.getLoans()).extracting(DiagnosisLoan::getType).containsExactly("주택담보대출", "자동차대출");
    }

    @Test
    void 대출이_없는_인물은_빈_대출_목록으로_저장한다() {
        DiagnosisSaveRequest request = UserAccountSeeder.diagnosis(UserAccountSeeder.PERSONAS.get(3));

        assertThat(request.getLoans()).isEmpty();
        assertThat(request.getMonthlyAvailable()).isEqualTo(900_000);
    }
}

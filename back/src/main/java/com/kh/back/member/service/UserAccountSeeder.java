package com.kh.back.member.service;

import com.kh.back.auth.service.PasswordPolicy;
import com.kh.back.diagnosis.dto.DiagnosisLoan;
import com.kh.back.diagnosis.dto.DiagnosisSaveRequest;
import com.kh.back.diagnosis.service.DiagnosisService;
import com.kh.back.member.dto.MemberDto;
import com.kh.back.member.dto.UserAgreementDto;
import com.kh.back.member.dto.UserProfileDto;
import com.kh.back.member.mapper.MemberMapper;
import com.kh.back.member.mapper.UserAgreementMapper;
import com.kh.back.member.mapper.UserProfileMapper;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Set;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * 일반 회원 테스트 계정 시드 (서버가 켜질 때 한 번). 총관리자 시드(AdminAccountSeeder)와 같은 방식이다.
 * back/admin-seed.local.properties 또는 환경변수 USER_SEED_EMAILS(쉼표로 여러 개) · USER_SEED_PASSWORD(모두 같은 비밀번호)에
 * 값을 넣으면 이메일마다 실제 회원처럼 회원 · 개인 정보 · 약관 동의 기록과 재무 진단 1건(소득 · 지출 · 대출 · 예금)을 만든다.
 * 이메일 인증은 건너뛴다. 가상 인물(PERSONAS)은 적은 순서대로 돌아가며 붙고, 닉네임 · 전화번호도 인물을 따른다.
 * 전화번호는 실제로 쓰이지 않는 010-0000-xxxx 대역이다.
 * 이미 가입한 이메일은 아무것도 바꾸지 않는다. 값이 없으면 아무것도 하지 않는다.
 */
@Slf4j
@Component
public class UserAccountSeeder {

    // 재무 진단 화면이 추천 서버에서 받아 보내는 모델 버전과 같은 값 (V26 데모 진단과 같다)
    static final String SEED_MODEL_VERSION = "candidate-v2";
    private static final Set<String> PROFILE_FIELDS = Set.of("phone", "birthDate", "gender", "drivingExperience", "purchaseTiming");

    /** 시드 회원 한 명의 가상 인물. 금액은 원 단위, monthlyIncome 은 기타 정기소득을 포함한다 (재무 진단 저장 요청과 같은 규칙) */
    record Persona(String nickName, String phone, LocalDate birthDate, String gender, String drivingExperience, String purchaseTiming,
                   long monthlyIncome, long otherIncome, long monthlyExpense, long purchaseFunds, long priceUpper,
                   List<Loan> loans) {

        long monthlyAvailable() {
            return monthlyIncome - monthlyExpense - loans.stream().mapToLong(Loan::payment).sum();
        }
    }

    record Loan(String type, Long balance, long payment) {
    }

    static final List<Persona> PERSONAS = List.of(
            // 사회초년생 · 첫 차 · 학자금 상환 중
            new Persona("준혁97", "01000000101", LocalDate.of(1997, 4, 12), "MALE", "UNDER_1Y", "WITHIN_6M",
                    2_800_000, 0, 1_600_000, 15_000_000, 28_000_000,
                    List.of(new Loan("학자금대출", 8_000_000L, 150_000))),
            // 30대 직장인 · 전세 거주 · 부업 소득
            new Persona("이서연", "01000000102", LocalDate.of(1990, 9, 3), "FEMALE", "YEARS_1_3", "WITHIN_3M",
                    4_500_000, 300_000, 2_300_000, 30_000_000, 45_000_000,
                    List.of(new Loan("전세자금대출", 120_000_000L, 450_000))),
            // 40대 4인 가족 · 주택담보 · 기존 차 할부 → 여유금이 빠듯하다
            new Persona("도현아빠", "01000000103", LocalDate.of(1983, 1, 27), "MALE", "OVER_3Y", "WITHIN_1Y",
                    5_500_000, 0, 3_600_000, 10_000_000, 20_000_000,
                    List.of(new Loan("주택담보대출", 250_000_000L, 1_200_000), new Loan("자동차대출", 6_000_000L, 350_000))),
            // 20대 · 면허만 있음 · 대출 없음
            new Persona("첫차고민중", "01000000104", LocalDate.of(1999, 11, 18), "FEMALE", "NONE", "UNDECIDED",
                    2_400_000, 0, 1_500_000, 8_000_000, 18_000_000,
                    List.of()),
            // 50대 · 임대 소득 · 여유 자금 많음
            new Persona("한정민", "01000000105", LocalDate.of(1974, 6, 9), "MALE", "OVER_3Y", "WITHIN_3M",
                    8_000_000, 1_000_000, 3_500_000, 60_000_000, 70_000_000,
                    List.of(new Loan("신용대출", 20_000_000L, 500_000))));

    private final MemberMapper memberMapper;
    private final UserProfileMapper userProfileMapper;
    private final UserAgreementMapper userAgreementMapper;
    private final DiagnosisService diagnosisService;
    private final PasswordEncoder passwordEncoder;
    private final List<String> emails;
    private final String password;

    public UserAccountSeeder(MemberMapper memberMapper, UserProfileMapper userProfileMapper,
                             UserAgreementMapper userAgreementMapper, DiagnosisService diagnosisService,
                             PasswordEncoder passwordEncoder,
                             @Value("${user.seed.emails:}") String emails,
                             @Value("${user.seed.password:}") String password) {
        this.memberMapper = memberMapper;
        this.userProfileMapper = userProfileMapper;
        this.userAgreementMapper = userAgreementMapper;
        this.diagnosisService = diagnosisService;
        this.passwordEncoder = passwordEncoder;
        // 회원가입 · 로그인과 같은 이메일 정리 규칙
        this.emails = Arrays.stream(emails.split(",")).map(e -> e.trim().toLowerCase()).filter(e -> !e.isBlank()).toList();
        this.password = password;
    }

    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void seed() {
        for (int i = 0; i < emails.size(); i++) {
            seedOne(emails.get(i), PERSONAS.get(i % PERSONAS.size()));
        }
    }

    private void seedOne(String email, Persona persona) {
        if (memberMapper.findByEmail(email) != null) {
            return;
        }
        if (!password.matches(PasswordPolicy.FORMAT) || PasswordPolicy.check(password, email) != null) {
            log.warn("user seed skipped: password does not meet the password policy");
            return;
        }
        MemberDto member = new MemberDto();
        member.setEmail(email);
        member.setPasswordHash(passwordEncoder.encode(password));
        // 이메일을 인물 수보다 많이 적어 같은 인물이 다시 쓰이면 닉네임이 겹치므로 뒤에 숫자를 붙인다
        String nickName = persona.nickName();
        member.setNickName(memberMapper.countByNickName(nickName) == 0 ? nickName : nickName + System.currentTimeMillis() % 1000);
        member.setRole("USER");
        memberMapper.insert(member);

        userProfileMapper.upsert(profile(member.getId(), persona), PROFILE_FIELDS);
        userAgreementMapper.insert(UserAgreementDto.atSignup(member.getId(), LocalDateTime.now()));
        diagnosisService.save(member.getId(), diagnosis(persona));
        log.info("user seed: USER account created (id {})", member.getId());
    }

    private static UserProfileDto profile(Long userId, Persona persona) {
        UserProfileDto profile = new UserProfileDto();
        profile.setUserId(userId);
        profile.setPhone(persona.phone());
        profile.setBirthDate(persona.birthDate());
        profile.setGender(persona.gender());
        profile.setDrivingExperience(persona.drivingExperience());
        profile.setPurchaseTiming(persona.purchaseTiming());
        return profile;
    }

    static DiagnosisSaveRequest diagnosis(Persona persona) {
        DiagnosisSaveRequest request = new DiagnosisSaveRequest();
        request.setModelVersion(SEED_MODEL_VERSION);
        request.setMonthlyIncome(persona.monthlyIncome());
        request.setOtherIncome(persona.otherIncome());
        request.setMonthlyExpense(persona.monthlyExpense());
        request.setMonthlyAvailable(persona.monthlyAvailable());
        request.setPurchaseFunds(persona.purchaseFunds());
        request.setPriceUpper(persona.priceUpper());
        request.setLoans(persona.loans().stream().map(UserAccountSeeder::loan).toList());
        return request;
    }

    private static DiagnosisLoan loan(Loan source) {
        DiagnosisLoan loan = new DiagnosisLoan();
        loan.setType(source.type());
        loan.setBalance(source.balance());
        loan.setPayment(source.payment());
        return loan;
    }
}

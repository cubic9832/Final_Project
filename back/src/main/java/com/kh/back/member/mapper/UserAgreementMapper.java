package com.kh.back.member.mapper;

import com.kh.back.member.dto.UserAgreementDto;
import org.apache.ibatis.annotations.Mapper;

// 보완 9: 가입 동의 기록 (user_agreements, V14). 11-05: 이메일 알림 설정은 없앰
@Mapper
public interface UserAgreementMapper {

    void insert(UserAgreementDto agreement);

}

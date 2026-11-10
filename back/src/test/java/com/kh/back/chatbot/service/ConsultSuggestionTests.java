package com.kh.back.chatbot.service;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

// 11-05: 콤파가 답하지 못하면 1:1 상담 버튼 — 글자 규칙
class ConsultSuggestionTests {

    @Test
    void 답하지_못했다는_말이_있으면_상담을_권한다() {
        assertThat(ConsultSuggestion.needed("내 대출 한도 얼마예요?", "개인 대출 한도는 콤파가 확인하기 어려워요.")).isTrue();
        assertThat(ConsultSuggestion.needed("보험료 계산", "정확한 금액은 답변드리기 어렵습니다.")).isTrue();
    }

    @Test
    void 회원이_상담원을_찾으면_상담을_권한다() {
        assertThat(ConsultSuggestion.needed("상담원이랑 얘기하고 싶어요", "무엇이 궁금하신가요?")).isTrue();
    }

    @Test
    void 평범하게_답했으면_권하지_않는다() {
        assertThat(ConsultSuggestion.needed("SUV 가 뭐예요?", "SUV 는 스포츠 유틸리티 차량으로, 차체가 높고 실내가 넓어요.")).isFalse();
        assertThat(ConsultSuggestion.needed(null, null)).isFalse();
    }
}

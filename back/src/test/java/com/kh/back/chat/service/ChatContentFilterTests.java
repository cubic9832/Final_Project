package com.kh.back.chat.service;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

// 8단계 · 보완 13: 금칙어 검사 — 띄어쓰기 · 기호 섞기, 풀어 쓴 자모, 영어 자판, 늘인 말도 막고 평범한 말은 통과
class ChatContentFilterTests {

    final ChatContentFilter filter = new ChatContentFilter();

    @Test
    void 띄어쓰기_숫자_기호를_섞어도_막는다() {
        assertThat(filter.isBlocked("씨 1발 왜 답이 없어요")).isTrue();
        assertThat(filter.isBlocked("f.u.c.k")).isTrue();
    }

    @Test
    void 풀어_쓴_자모도_막는다() {
        assertThat(filter.isBlocked("ㅆㅣㅂㅏㄹ 진짜")).isTrue();
        assertThat(filter.isBlocked("ㅂㅕㅇㅅㅣㄴ")).isTrue();
    }

    @Test
    void 영어_자판으로_친_한글도_막는다() {
        assertThat(filter.isBlocked("tlqkf 답 좀 해요")).isTrue(); // 시발
        assertThat(filter.isBlocked("qudtls")).isTrue();            // 병신
        assertThat(filter.isBlocked("rotorl")).isTrue();            // 개새기
    }

    @Test
    void 늘이거나_소리를_바꾼_말도_막는다() {
        assertThat(filter.isBlocked("씨이발 왜 이래요")).isTrue();
        assertThat(filter.isBlocked("씨빨")).isTrue();
    }

    @Test
    void 평범한_한글과_영어_문장은_통과한다() {
        assertThat(filter.isBlocked("대출 시 발생하는 이자가 궁금해요")).isFalse();
        assertThat(filter.isBlocked("ㅋㅋㅋ 감사합니다 ㅠㅠ")).isFalse();
        assertThat(filter.isBlocked("I want to check my loan limit, thanks!")).isFalse();
        assertThat(filter.isBlocked("SUV vs sedan, which is better for a first car?")).isFalse();
        assertThat(filter.isBlocked("Qt with tq and whw")).isFalse(); // 짧은 말(ㅅㅂ · 좆)은 영어 자판 쪽에서 안 본다
    }

    @Test
    void 자모_합치기는_완성된_글자와_홀로_있는_자모를_그대로_둔다() {
        assertThat(HangulJamo.compose("ㅆㅣㅂㅏㄹ")).isEqualTo("씨발");
        assertThat(HangulJamo.compose("ㄱㅘㄴ리자ㅋㅋ")).isEqualTo("관리자ㅋㅋ");
        assertThat(HangulJamo.compose(HangulJamo.fromQwerty("dkssud"))).isEqualTo("안녕");
    }
}

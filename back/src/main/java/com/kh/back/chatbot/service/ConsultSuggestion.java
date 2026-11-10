package com.kh.back.chatbot.service;

import java.util.List;
import java.util.regex.Pattern;

/**
 * 11-05 (류상민, 조장 확인): 콤파가 원하는 답을 주지 못했을 때 1:1 상담 버튼을 띄울지 정하는 규칙.
 * AI 에게 표시를 따로 시키지 않고(프롬프트는 DB 버전 관리) 서버가 글자로 판단한다 — 돈 드는 판별 없음.
 *   - 답에 "확인하기 어렵 · 답변드리기 어렵" 처럼 답하지 못했다는 말이 있으면
 *   - 회원이 질문에서 상담원 · 상담사를 찾으면
 * 회원이 그 답에 [싫어요] 를 누른 경우는 화면(ChatWidget)이 따로 버튼을 띄운다.
 * 글자로 보는 규칙이라 놓치거나 더 띄울 수 있다 (한계 — 버튼은 이동만 하므로 잘못 떠도 해가 없다).
 */
public final class ConsultSuggestion {

    // "확인하기 어렵습니다 · 어려워요", "답변드리기 어려워요", "확인할 수 없어요" 처럼 어미가 달라도 잡는다
    private static final Pattern CANNOT_ANSWER = Pattern.compile(
            "(확인|답변|안내|도와|알려|말씀)\\s?(드리|하)?기\\s?어(렵|려)|(확인|답변|제공|안내)(할|해 드릴) 수 없|정확히 알 수 없|상담원|상담사");
    private static final List<String> WANTS_PERSON = List.of("상담원", "상담사", "사람이랑", "사람과", "직원");

    private ConsultSuggestion() {
    }

    public static boolean needed(String question, String answer) {
        String q = question == null ? "" : question;
        String a = answer == null ? "" : answer;
        return CANNOT_ANSWER.matcher(a).find() || WANTS_PERSON.stream().anyMatch(q::contains);
    }
}

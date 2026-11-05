package com.kh.back.chatbot.dto;

import java.util.List;

// consultSuggested: 콤파가 답하지 못했다고 서버가 판단하면 true → 답 아래 [상담원과 1:1 상담하기] (11-05, ConsultSuggestion)
public record ChatResponse(String answer, String question, int remaining, List<Source> sources,
                           long questionId, long answerId, boolean consultSuggested) {
    public record Source(String id, String title, String content) {}
}

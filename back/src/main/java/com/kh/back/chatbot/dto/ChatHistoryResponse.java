package com.kh.back.chatbot.dto;

import java.util.List;

public record ChatHistoryResponse(List<Message> messages, int remaining, boolean hasMore) {
    // consultSuggested: 다시 불러온 콤파 답에도 1:1 상담 버튼 (답 글자로 같은 규칙, 11-05)
    public record Message(long id, String role, String text, String rating, boolean consultSuggested) {}
}

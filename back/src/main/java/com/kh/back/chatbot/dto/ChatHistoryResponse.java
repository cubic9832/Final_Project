package com.kh.back.chatbot.dto;

import java.util.List;

public record ChatHistoryResponse(List<Message> messages, int remaining, boolean hasMore) {
    public record Message(long id, String role, String text, String rating) {}
}

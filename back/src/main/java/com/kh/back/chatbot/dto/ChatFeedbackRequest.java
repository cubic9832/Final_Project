package com.kh.back.chatbot.dto;

import jakarta.validation.constraints.NotNull;

public record ChatFeedbackRequest(@NotNull Rating rating) {
    public enum Rating { LIKE, DISLIKE }
}

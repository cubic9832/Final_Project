package com.kh.back.chatbot.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Pattern;

public record ChatGuideRequest(@NotBlank @Size(max = 80) String guideId,
                               @Pattern(regexp = "QUICK_QUESTION|TERM_CLICK") String source) {
    public ChatGuideRequest(String guideId) { this(guideId, null); }
}

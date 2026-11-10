package com.kh.back.chat.service;

import com.kh.back.chat.dto.ChatFeedbackDto;
import com.kh.back.chat.dto.ChatFeedbackRequest;
import com.kh.back.chat.dto.ChatFeedbackSummary;
import java.util.List;

/**
 * 8단계: 상담 만족도 + 상담원 신고. 남기는 것은 회원, 보는 것은 총관리자만.
 */
public interface ChatFeedbackService {

    void submit(Long userId, ChatFeedbackRequest request);

    List<ChatFeedbackDto> getRoomFeedback(Long actorId, Long roomId);

    List<ChatFeedbackSummary> getSummary(Long actorId);

    // adminId: null 이면 모든 상담원, 있으면 그 상담원이 받은 평가만 (11-05)
    List<ChatFeedbackDto> getFeedback(Long actorId, String sort, boolean reportedOnly, int offset, Long adminId);
}

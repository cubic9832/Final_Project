package com.kh.back.chat.service;

import com.kh.back.chat.dto.ChatAdminOption;
import com.kh.back.chat.dto.ChatMessageDto;
import com.kh.back.chat.dto.ChatRoomDto;
import java.util.List;

/**
 * 8단계: 1:1 상담 채팅 (회원 ↔ 관리자).
 * 상태: 대기(WAITING) → [맡기] 진행 중(ACTIVE) → [상담 종료] 종료(CLOSED) → 회원이 [새로 상담하기] → 대기
 */
public interface ChatRoomService {

    // ── 회원 ──
    ChatRoomDto getMyRoom(Long userId);

    ChatRoomDto startConsultation(Long userId);

    void closeByMember(Long userId);

    // ── 회원 · 관리자 공통 ──
    boolean canView(Long viewerId, Long roomId);

    List<ChatMessageDto> getMessages(Long viewerId, Long roomId, Long beforeId, int size);

    ChatMessageDto sendMessage(Long senderId, Long roomId, String content);

    // ── 관리자 (관리자 · 총관리자) ──
    List<ChatRoomDto> getRooms(Long viewerId, String status);
    List<ChatRoomDto> getRooms(Long viewerId, String status, int offset);
    ChatRoomDto getRoom(Long viewerId, Long roomId);

    List<ChatAdminOption> getAdmins();

    void assign(Long adminId, Long roomId);

    void transfer(Long actorId, Long roomId, Long toAdminId, String reason);

    void closeByAdmin(Long actorId, Long roomId);

    void restrict(Long actorId, Long roomId, int days, String reason);

    void unrestrict(Long actorId, Long roomId);

    void warn(Long actorId, Long roomId, String reason);

    // 권한 변경 전에 진행 중인 담당 상담을 확인한다. 호출자는 권한 변경 잠금을 먼저 얻는다.
    void requireNoActiveRoomsOf(List<Long> adminIds);

    void releaseRoomsOf(Long adminId);

    void closeForSuspension(Long userId);

    // 보완 15: 회원이 탈퇴하면 대기 · 진행 중 상담을 종료한다 (상담 기록은 남는다)
    void closeForWithdrawal(Long userId);

    // 11-05 (멘토링): 무응답 상담 — 상담원 답 뒤 10분 조용하면 경고, 경고 뒤 5분 더 조용하면 자동 종료 (ChatIdleScheduler 가 1분마다)
    void handleIdleRooms();
}

package com.kh.back.chat.service;

import com.kh.back.admin.mapper.AdminAuditLogMapper;
import com.kh.back.chat.dto.ChatAdminOption;
import com.kh.back.chat.dto.ChatMessageDto;
import com.kh.back.chat.dto.ChatRestrictRequest;
import com.kh.back.chat.dto.ChatRoomDto;
import com.kh.back.chat.mapper.ChatMapper;
import com.kh.back.common.exception.ApiException;
import com.kh.back.common.security.CurrentRoleLookup;
import com.kh.back.member.dto.MemberDto;
import com.kh.back.member.mapper.MemberMapper;
import com.kh.back.member.service.AccountSuspension;
import com.kh.back.notification.SavingsNotificationRequest;
import com.kh.back.notification.SavingsNotificationService;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 8단계: 1:1 상담 채팅 규칙.
 * 권한은 "지금" DB 의 권한으로 본다 (CurrentRoleLookup, 7단계) — 관리자에서 해제된 사람의 토큰이 남아 있어도 상담은 못 한다.
 *   - 회원: 내 상담방만 보고, 종료되지 않았으면 쓴다
 *   - 관리자 · 총관리자: 모든 상담방을 보고, 내가 맡은 진행 중 상담에만 쓴다 (담당이 아니면 보기만)
 *   - 넘기기 · 종료: 담당 관리자 또는 총관리자 (총관리자는 휴가 · 퇴사한 관리자의 상담을 옮길 수 있다)
 */
@Service
@RequiredArgsConstructor
public class ChatRoomServiceImpl implements ChatRoomService {

    private static final int MAX_LENGTH = 1000; // chat_message.content VARCHAR(1000)
    private static final Set<String> ADMIN_ROLES = Set.of("ADMIN", "SUPER_ADMIN");
    private static final DateTimeFormatter UNTIL_FORMAT = DateTimeFormatter.ofPattern("M월 d일 HH:mm"); // 제한 안내

    // 11-05 (멘토링): 회원이 [상담 종료]를 안 누르고 떠나도 상담이 계속 열려 있지 않게
    static final int IDLE_WARN_MINUTES = 10;   // 상담원 답 뒤 회원이 이만큼 조용하면 경고
    static final int IDLE_CLOSE_MINUTES = 5;   // 경고 뒤 이만큼 더 조용하면 자동 종료
    static final int REOPEN_COOLDOWN_MINUTES = 3; // 종료 뒤 이만큼 지나야 [새로 상담하기] (열었다 닫았다 반복 막기)
    // 경고 문구 = 자동 종료 대상을 찾는 표시 (마지막 메시지가 이 SYSTEM 문구인 방) — 바꾸면 이미 경고받은 방은 다시 경고부터
    static final String IDLE_WARNING = "회원님의 답이 " + IDLE_WARN_MINUTES + "분 동안 없어요. "
            + IDLE_CLOSE_MINUTES + "분 안에 답이 없으면 상담이 자동으로 종료됩니다.";
    static final String UNRESTRICTED_NOTICE = "상담 제한이 풀렸습니다. [새로 상담하기]로 다시 상담할 수 있어요.";

    private final ChatMapper chatMapper;
    private final ChatBroadcaster broadcaster;
    private final CurrentRoleLookup currentRoleLookup;
    private final com.kh.back.common.security.AdminScreenAccess adminScreenAccess;
    private final AdminAuditLogMapper adminAuditLogMapper;
    private final ChatContentFilter contentFilter;
    private final MemberMapper memberMapper; // 9단계: 정지된 회원인지
    private final SavingsNotificationService notificationService; // 11-05: 헤더 종 알림 (형철님 알림센터)

    // ───────────── 회원 ─────────────

    // 내 상담방 (없으면 null). 담당 관리자 닉네임은 지운다 — 회원 화면에는 "상담원" 으로만 보인다
    @Override
    public ChatRoomDto getMyRoom(Long userId) {
        ChatRoomDto room = chatMapper.findRoomByUserId(userId);
        if (room != null) {
            room.setAssignedAdminId(null);
            room.setAssignedAdminNickName(null);
            room.setReportCount(0); // 신고 수는 총관리자만
        }
        return room;
    }

    // [1:1 상담] · [새로 상담하기]: 처음이면 방을 만들고, 종료됐으면 대기로 되돌린다. 대기 · 진행 중이면 그대로
    @Override
    @Transactional
    public ChatRoomDto startConsultation(Long userId) {
        requireNotSuspended(userId);
        ChatRoomDto room = chatMapper.findRoomByUserId(userId);
        if (room != null && ChatRoomDto.CLOSED.equals(room.getStatus()) && room.isRestricted()) {
            // 욕설 등으로 관리자가 제한한 회원: 기간이 끝날 때까지 새 상담 불가
            throw new ApiException(HttpStatus.FORBIDDEN, "CHAT_RESTRICTED", restrictionText(room.getRestrictedUntil()));
        }
        if (room == null) {
            room = new ChatRoomDto();
            room.setUserId(userId);
            chatMapper.insertRoom(room);
            system(room.getId(), "상담을 요청했습니다. 상담원이 연결되면 이곳에서 대화할 수 있어요.");
            broadcaster.roomChanged(room.getId(), ChatRoomDto.WAITING);
        } else if (ChatRoomDto.CLOSED.equals(room.getStatus())) {
            // 11-05: 종료 직후면 0줄 → 잠시 뒤에 다시 (제한은 위에서 걸렀다)
            //        단, 관리자가 [제한 풀기] 한 직후는 바로 (풀기 안내도 마지막 메시지 시각을 바꾸기 때문)
            int cooldown = UNRESTRICTED_NOTICE.equals(room.getLastMessage()) ? 0 : REOPEN_COOLDOWN_MINUTES;
            if (chatMapper.reopen(room.getId(), cooldown) == 0) {
                throw new ApiException(HttpStatus.CONFLICT, "CHAT_COOLDOWN",
                        "상담이 끝나고 " + REOPEN_COOLDOWN_MINUTES + "분이 지나면 새로 상담할 수 있어요. 잠시 후 다시 눌러 주세요.");
            }
            system(room.getId(), "새 상담을 요청했습니다. 상담원이 연결되면 알려 드릴게요.");
            broadcaster.roomChanged(room.getId(), ChatRoomDto.WAITING);
        }
        return getMyRoom(userId);
    }

    // 회원이 [상담 종료]
    @Override
    @Transactional
    public void closeByMember(Long userId) {
        ChatRoomDto room = chatMapper.findRoomByUserId(userId);
        if (room == null) {
            throw roomNotFound();
        }
        closeRoom(room.getId(), "회원이 상담을 종료했습니다.");
    }

    // ───────────── 공통 ─────────────

    // 이 방을 볼 수 있나: 방 주인(회원) 또는 관리자 · 총관리자 — WebSocket 구독(StompAuthInterceptor)과 REST 가 같은 규칙
    @Override
    public boolean canView(Long viewerId, Long roomId) {
        ChatRoomDto room = chatMapper.findRoomById(roomId);
        return room != null && (room.getUserId().equals(viewerId) || isAdmin(viewerId));
    }

    @Override
    public List<ChatMessageDto> getMessages(Long viewerId, Long roomId, Long beforeId, int size) {
        if (!canView(viewerId, roomId)) {
            throw forbidden("볼 수 없는 상담입니다.");
        }
        return chatMapper.findMessages(roomId, beforeId, size);
    }

    // 메시지 보내기 (STOMP SEND /app/chat/rooms/{id} → ChatMessageController)
    // 누가 보냈는지에 따라 USER · ADMIN 을 서버가 정한다 (화면이 보낸 값은 믿지 않는다)
    @Override
    @Transactional
    public ChatMessageDto sendMessage(Long senderId, Long roomId, String content) {
        String text = content == null ? "" : content.strip(); // 앞뒤 공백 제거
        if (text.isEmpty() || text.length() > MAX_LENGTH) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "CHAT_INVALID", "메시지는 1~1000자로 입력해 주세요.");
        }
        // 욕설 · 패드립 · 성적인 표현은 저장하지 않고 막는다 (회원 · 상담원 모두). 보낸 사람에게만 오류가 간다
        if (contentFilter.isBlocked(text)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "CHAT_BLOCKED_WORD",
                    "욕설이나 부적절한 표현이 있어 보낼 수 없습니다. 내용을 고쳐 다시 보내 주세요.");
        }
        ChatRoomDto room = chatMapper.findRoomById(roomId);
        if (room == null) {
            throw roomNotFound();
        }

        String senderType;
        if (room.getUserId().equals(senderId)) {
            if (ChatRoomDto.CLOSED.equals(room.getStatus())) {
                throw new ApiException(HttpStatus.CONFLICT, "CHAT_CLOSED", "종료된 상담입니다. [새로 상담하기]를 눌러 주세요.");
            }
            requireNotSuspended(senderId);
            senderType = ChatMessageDto.USER; // 대기 중에도 남겨 둘 수 있다 → 상담원이 맡으면 읽는다
        } else if (isAdmin(senderId)) {
            if (!ChatRoomDto.ACTIVE.equals(room.getStatus()) || !senderId.equals(room.getAssignedAdminId())) {
                throw forbidden("담당 상담원만 답장할 수 있습니다. 먼저 [맡기]를 눌러 주세요.");
            }
            senderType = ChatMessageDto.ADMIN;
        } else {
            throw forbidden("볼 수 없는 상담입니다.");
        }

        ChatMessageDto saved = save(roomId, senderType, senderId, text);
        broadcaster.roomChanged(roomId, room.getStatus());
        if (ChatMessageDto.ADMIN.equals(senderType)) {
            notifyReply(room);
        }
        return saved;
    }

    // ───────────── 관리자 ─────────────

    @Override
    public List<ChatRoomDto> getRooms(Long viewerId, String status) {
        if (status != null && !Set.of(ChatRoomDto.WAITING, ChatRoomDto.ACTIVE, ChatRoomDto.CLOSED).contains(status)) {
            status = null; // 모르는 값이면 전체
        }
        List<ChatRoomDto> rooms = chatMapper.findRooms(status);
        // 신고 수는 총관리자만 — 신고당한 상담원이 보지 않게 일반 관리자에게는 0 으로 보낸다
        if (!"SUPER_ADMIN".equals(currentRoleLookup.currentRole(viewerId))) {
            rooms.forEach(room -> room.setReportCount(0));
        }
        return rooms;
    }

    @Override
    public List<ChatAdminOption> getAdmins() {
        return chatMapper.findAdmins().stream().filter(admin -> isAdmin(admin.id())).toList();
    }

    // [맡기]: 대기 중인 상담만. 두 관리자가 동시에 눌러도 DB 의 조건부 UPDATE 로 한 명만 성공한다
    @Override
    @Transactional
    public void assign(Long adminId, Long roomId) {
        requireAdminActor(adminId, "상담 화면을 사용할 권한이 없습니다.");
        ChatRoomDto room = requireRoom(roomId);
        if (chatMapper.assign(roomId, adminId) == 0) {
            throw new ApiException(HttpStatus.CONFLICT, "CHAT_ALREADY_ASSIGNED",
                    ChatRoomDto.ACTIVE.equals(room.getStatus()) ? "이미 다른 상담원이 맡은 상담입니다." : "대기 중인 상담만 맡을 수 있습니다.");
        }
        system(roomId, "상담원이 연결되었습니다.");
        broadcaster.roomChanged(roomId, ChatRoomDto.ACTIVE);
    }

    // [넘기기]: 관리자 · 총관리자 누구나, 남이 맡은 상담도 (11-03). 받는 사람의 수락 없이 바로 넘어간다
    // 이유는 운영 로그에만 (회원에게는 "상담원이 바뀌었습니다")
    @Override
    @Transactional
    public void transfer(Long actorId, Long roomId, Long toAdminId, String reason) {
        ChatRoomDto room = requireRoom(roomId);
        if (!ChatRoomDto.ACTIVE.equals(room.getStatus())) {
            throw new ApiException(HttpStatus.CONFLICT, "CHAT_NOT_ACTIVE", "진행 중인 상담만 넘길 수 있습니다.");
        }
        requireAdminActor(actorId, "관리자만 상담을 넘길 수 있습니다.");
        if (toAdminId.equals(room.getAssignedAdminId())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "CHAT_SAME_ADMIN", "지금 담당자에게는 넘길 수 없습니다.");
        }
        if (!isAdmin(toAdminId)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "CHAT_TARGET_NOT_ADMIN", "관리자에게만 넘길 수 있습니다.");
        }
        if (chatMapper.transfer(roomId, room.getAssignedAdminId(), toAdminId) == 0) {
            throw new ApiException(HttpStatus.CONFLICT, "CHAT_CHANGED", "그 사이 상담 상태가 바뀌었습니다. 목록을 새로고침해 주세요.");
        }
        String memo = reason == null || reason.isBlank() ? "" : " (" + reason.strip() + ")";
        // 운영 로그: 대상 = 상담받는 회원, 내용 = 누구 → 누구 + 이유 (같은 트랜잭션)
        adminAuditLogMapper.insert(actorId, "CHAT_TRANSFER", "MEMBER", room.getUserId(),
                "상담 넘김 #" + room.getAssignedAdminId() + " → #" + toAdminId + memo);
        system(roomId, "상담원이 바뀌었습니다.");
        broadcaster.roomChanged(roomId, ChatRoomDto.ACTIVE);
    }

    // [상담 종료] (관리자): 관리자 · 총관리자 누구나 (11-03: 총관리자에게 몰린 일을 일반 관리자도 — 대기 중인 상담 포함)
    // 11-04: 남이 맡은 상담도 끊을 수 있어서, 넘기기 · 제한처럼 누가 종료했는지 운영 로그에 남긴다 (내용 = 그때 담당자)
    @Override
    @Transactional
    public void closeByAdmin(Long actorId, Long roomId) {
        ChatRoomDto room = requireRoom(roomId);
        requireAdminActor(actorId, "관리자만 상담을 종료할 수 있습니다.");
        closeRoom(roomId, "상담원이 상담을 종료했습니다.");
        String assignee = room.getAssignedAdminId() == null ? "없음" : "#" + room.getAssignedAdminId();
        adminAuditLogMapper.insert(actorId, "CHAT_CLOSE", "MEMBER", room.getUserId(), "상담 종료 (담당 " + assignee + ")");
    }

    // [상담 제한]: 욕설 등 → 진행 중이면 종료하고, days 일 동안 새 상담 불가 (0 = 영구). 관리자 · 총관리자 누구나 (11-03)
    // 이유는 운영 로그에만 (회원에게는 기간만 안내)
    @Override
    @Transactional
    public void restrict(Long actorId, Long roomId, int days, String reason) {
        ChatRoomDto room = requireRoom(roomId);
        requireAdminActor(actorId, "관리자만 상담을 제한할 수 있습니다.");
        boolean permanent = days == ChatRestrictRequest.PERMANENT;
        chatMapper.restrict(roomId, days);
        chatMapper.close(roomId); // 이미 종료된 상담이면 0줄 — 그대로 둔다
        ChatRoomDto restricted = chatMapper.findRoomById(roomId);
        String memo = reason == null || reason.isBlank() ? "" : " (" + reason.strip() + ")";
        adminAuditLogMapper.insert(actorId, "CHAT_RESTRICT", "MEMBER", room.getUserId(),
                "상담 제한 " + (permanent ? "영구" : days + "일") + memo);
        system(roomId, "운영 정책 위반으로 상담이 종료되었습니다. " + restrictionText(restricted.getRestrictedUntil()));
        broadcaster.roomChanged(roomId, ChatRoomDto.CLOSED);
    }

    // 회원에게 보이는 제한 안내: 영구(9999년)면 기간 없이, 아니면 "11월 2일 15:00까지"
    private static String restrictionText(LocalDateTime until) {
        return until.getYear() >= ChatRoomDto.PERMANENT_YEAR
                ? "더 이상 새 상담을 시작할 수 없습니다."
                : until.format(UNTIL_FORMAT) + "까지 새 상담을 시작할 수 없습니다.";
    }

    // [경고]: 제한하기 전 단계. 진행 중인 상담에서 관리자 · 총관리자 누구나 (11-03)
    // 회원에게 사유와 횟수를 안내하고(SYSTEM), 횟수는 방에 쌓인다 → 관리자가 제한할지 판단하는 근거
    @Override
    @Transactional
    public void warn(Long actorId, Long roomId, String reason) {
        ChatRoomDto room = requireRoom(roomId);
        if (!ChatRoomDto.ACTIVE.equals(room.getStatus())) {
            throw new ApiException(HttpStatus.CONFLICT, "CHAT_NOT_ACTIVE", "진행 중인 상담에만 경고할 수 있습니다.");
        }
        requireAdminActor(actorId, "관리자만 경고할 수 있습니다.");
        chatMapper.warn(roomId);
        int count = room.getWarningCount() + 1;
        adminAuditLogMapper.insert(actorId, "CHAT_WARN", "MEMBER", room.getUserId(), "상담 경고 " + count + "회 (" + reason.strip() + ")");
        system(roomId, "운영 정책 위반 경고 " + count + "회: " + reason.strip()
                + ". 반복되면 상담이 종료되고 일정 기간 제한될 수 있습니다.");
        broadcaster.roomChanged(roomId, ChatRoomDto.ACTIVE);
    }

    // [제한 풀기]: 잘못 제한했을 때. 관리자 · 총관리자 누구나 (11-03 — 누가 풀었는지는 운영 로그에 남는다)
    @Override
    @Transactional
    public void unrestrict(Long actorId, Long roomId) {
        ChatRoomDto room = requireRoom(roomId);
        requireAdminActor(actorId, "관리자만 상담 제한을 풀 수 있습니다.");
        if (!room.isRestricted()) {
            throw new ApiException(HttpStatus.CONFLICT, "CHAT_NOT_RESTRICTED", "제한 중인 상담이 아닙니다.");
        }
        chatMapper.unrestrict(roomId);
        adminAuditLogMapper.insert(actorId, "CHAT_UNRESTRICT", "MEMBER", room.getUserId(), "상담 제한 풀기");
        system(roomId, UNRESTRICTED_NOTICE);
        broadcaster.roomChanged(roomId, ChatRoomDto.CLOSED);
    }

    // 관리자에서 해제될 때 (AdminMemberServiceImpl.changeRole): 맡던 진행 중 상담을 대기로 → 다른 관리자가 다시 맡는다
    @Override
    @Transactional
    public void releaseRoomsOf(Long adminId) {
        List<Long> roomIds = chatMapper.findActiveRoomIdsByAdmin(adminId);
        if (roomIds.isEmpty()) {
            return;
        }
        chatMapper.releaseByAdmin(adminId);
        for (Long roomId : roomIds) {
            system(roomId, "상담원 연결이 끊겨 다시 대기 중입니다. 곧 다른 상담원이 연결됩니다.");
            broadcaster.roomChanged(roomId, ChatRoomDto.WAITING);
        }
    }

    // 9단계: 총관리자가 계정을 정지할 때 (AdminMemberServiceImpl.suspend) — 대기 · 진행 중 상담을 종료해
    // 상담원이 정지된 회원을 계속 기다리지 않게 한다. 상담이 없거나 이미 종료됐으면 아무것도 안 함
    @Override
    @Transactional
    public void closeForSuspension(Long userId) {
        closeRoomOf(userId, "회원 계정이 이용 정지되어 상담이 종료되었습니다.");
    }

    @Override
    @Transactional
    public void closeForWithdrawal(Long userId) {
        closeRoomOf(userId, "회원이 탈퇴하여 상담이 종료되었습니다.");
    }

    // 11-05 (멘토링): 무응답 상담 정리 — 먼저 경고받고도 조용한 방을 닫고, 그다음 새로 조용해진 방에 경고
    // 자동 종료도 보통 종료처럼 만족도를 받는다 (상담원이 맡았던 상담이니까). 관리자가 한 일이 아니라 운영 로그는 남기지 않는다
    @Override
    @Transactional
    public void handleIdleRooms() {
        for (Long roomId : chatMapper.findIdleRoomIds(ChatMessageDto.SYSTEM, IDLE_WARNING, IDLE_CLOSE_MINUTES)) {
            if (chatMapper.close(roomId) == 1) { // 그 사이 다른 사람이 닫았으면 0줄 → 건너뜀
                system(roomId, "답이 없어 상담이 자동으로 종료되었습니다. 더 궁금한 점이 있으면 [새로 상담하기]를 눌러 주세요.");
                broadcaster.roomChanged(roomId, ChatRoomDto.CLOSED);
            }
        }
        for (Long roomId : chatMapper.findIdleRoomIds(ChatMessageDto.ADMIN, null, IDLE_WARN_MINUTES)) {
            ChatMessageDto warning = system(roomId, IDLE_WARNING);
            broadcaster.roomChanged(roomId, ChatRoomDto.ACTIVE);
            // 화면을 떠난 회원도 알 수 있게 헤더 종에도 (경고 메시지마다 한 번)
            ChatRoomDto room = chatMapper.findRoomById(roomId);
            notificationService.notifyChat(room.getUserId(), SavingsNotificationRequest.Type.CHAT_IDLE_WARNING,
                    "chat-idle:" + roomId + ":" + warning.getId(), "상담이 곧 자동으로 종료돼요",
                    IDLE_CLOSE_MINUTES + "분 안에 답이 없으면 상담이 종료됩니다. 1:1 상담에서 답해 주세요.");
        }
    }

    // 11-05: 상담원 답장 → 회원의 헤더 종 알림. 회원의 마지막 질문 하나에 한 번만 (상담원이 연달아 보내도 알림은 1개)
    private void notifyReply(ChatRoomDto room) {
        Long lastQuestion = chatMapper.findLastMessageId(room.getId(), ChatMessageDto.USER);
        notificationService.notifyChat(room.getUserId(), SavingsNotificationRequest.Type.CHAT_REPLY,
                "chat-reply:" + room.getId() + ":" + (lastQuestion == null ? 0 : lastQuestion),
                "상담원이 답했어요", "1:1 상담에서 답변을 확인해 보세요.");
    }

    // 회원의 대기 · 진행 중 상담을 닫고 안내 문구를 남긴다 (이미 종료됐거나 상담이 없으면 아무것도 안 함)
    private void closeRoomOf(Long userId, String notice) {
        ChatRoomDto room = chatMapper.findRoomByUserId(userId);
        if (room == null || chatMapper.close(room.getId()) == 0) {
            return;
        }
        system(room.getId(), notice);
        broadcaster.roomChanged(room.getId(), ChatRoomDto.CLOSED);
    }

    // ───────────── 도우미 ─────────────

    // 9단계: 정지된 회원은 상담을 시작하거나 메시지를 보낼 수 없다
    // (정지 순간 이미 받은 access token 이 최대 30분 남아도 상담은 바로 막힌다)
    // 보완 15: 탈퇴한 회원(findById 가 null)도 막는다 — 탈퇴 순간 남은 access token 으로 상담을 다시 열지 못하게
    private void requireNotSuspended(Long userId) {
        MemberDto member = memberMapper.findById(userId);
        if (member == null) {
            throw new ApiException(HttpStatus.NOT_FOUND, "MEMBER_NOT_FOUND", "회원 정보를 찾을 수 없습니다.");
        }
        AccountSuspension.requireActive(member);
    }

    private void closeRoom(Long roomId, String notice) {
        if (chatMapper.close(roomId) == 0) {
            throw new ApiException(HttpStatus.CONFLICT, "CHAT_CLOSED", "이미 종료된 상담입니다.");
        }
        system(roomId, notice);
        broadcaster.roomChanged(roomId, ChatRoomDto.CLOSED);
    }

    // 연결 · 넘김 · 종료 안내 → 방에 SYSTEM 메시지로 남기고 실시간으로 보낸다 (회원 화면은 이걸 보고 상태를 다시 읽는다)
    private ChatMessageDto system(Long roomId, String content) {
        return save(roomId, ChatMessageDto.SYSTEM, null, content);
    }

    // 저장 → 마지막 메시지 시각 → 저장된 모양(번호 · 시각)으로 다시 읽어 방 구독자에게 보낸다
    private ChatMessageDto save(Long roomId, String senderType, Long senderId, String content) {
        ChatMessageDto message = new ChatMessageDto();
        message.setRoomId(roomId);
        message.setSenderType(senderType);
        message.setSenderId(senderId);
        message.setContent(content);
        chatMapper.insertMessage(message); // useGeneratedKeys → id 가 채워진다
        chatMapper.touchLastMessage(roomId);
        ChatMessageDto saved = chatMapper.findMessageById(message.getId());
        broadcaster.message(saved);
        return saved;
    }

    // 11-03: 상담 관리(넘기기 · 종료 · 경고 · 제한 · 풀기)는 관리자 · 총관리자 누구나 — 담당이 아니어도 된다
    // (총관리자 전용은 관리자 권한 주기 · 빼기와 상담원 모니터링(만족도 · 신고)만). 지금 DB 의 권한으로 확인
    private void requireAdminActor(Long actorId, String message) {
        if (!isAdmin(actorId)) {
            throw forbidden(message);
        }
    }

    private ChatRoomDto requireRoom(Long roomId) {
        ChatRoomDto room = chatMapper.findRoomById(roomId);
        if (room == null) {
            throw roomNotFound();
        }
        return room;
    }

    private boolean isAdmin(Long userId) {
        return ADMIN_ROLES.contains(currentRoleLookup.currentRole(userId)) && adminScreenAccess.canUse(userId,"CHAT");
    }

    private static ApiException roomNotFound() {
        return new ApiException(HttpStatus.NOT_FOUND, "CHAT_ROOM_NOT_FOUND", "상담을 찾을 수 없습니다.");
    }

    private static ApiException forbidden(String message) {
        return new ApiException(HttpStatus.FORBIDDEN, "CHAT_FORBIDDEN", message);
    }
}

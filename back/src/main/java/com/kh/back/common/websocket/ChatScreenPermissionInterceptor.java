package com.kh.back.common.websocket;

import com.kh.back.common.security.AdminScreenAccess;
import com.kh.back.common.security.CurrentRoleLookup;
import com.kh.back.common.exception.ApiException;
import java.util.concurrent.ConcurrentHashMap;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.*;
import org.springframework.messaging.simp.stomp.*;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

/** Guards existing administrator subscriptions after permission revocation without changing the protocol. */
@Component
@RequiredArgsConstructor
public class ChatScreenPermissionInterceptor implements ChannelInterceptor {
    private final AdminScreenAccess access;
    private final CurrentRoleLookup roles;
    private final ConcurrentHashMap<String,Long> adminSessions=new ConcurrentHashMap<>();
    @Override public Message<?> preSend(Message<?> message,MessageChannel channel) {
        var headers=StompHeaderAccessor.wrap(message);
        String session=headers.getSessionId();
        if (session == null) return message;
        var command=headers.getCommand();
        if (command == StompCommand.DISCONNECT) { adminSessions.remove(session); return message; }
        if (headers.getUser() instanceof Authentication auth && auth.getPrincipal() instanceof Long id
                && (command == StompCommand.CONNECT || command == StompCommand.SUBSCRIBE || command == StompCommand.SEND)) {
            String role=roles.currentRole(id);
            if ("ADMIN".equals(role) || "SUPER_ADMIN".equals(role)) {
                adminSessions.put(session,id);
                if (command != StompCommand.CONNECT && !access.canUse(id,"CHAT"))
                    throw new ApiException(HttpStatus.FORBIDDEN,"CHAT_FORBIDDEN","상담 화면을 사용할 권한이 없습니다.");
            }
        }
        String destination=headers.getDestination();
        Long administrator=adminSessions.get(session);
        if (administrator != null && destination != null && destination.startsWith("/topic/")
                && !access.canUse(administrator,"CHAT")) return null;
        return message;
    }
    @org.springframework.context.event.EventListener
    public void disconnected(org.springframework.web.socket.messaging.SessionDisconnectEvent event) { adminSessions.remove(event.getSessionId()); }
}

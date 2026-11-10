package com.kh.back.common.security;

import com.kh.back.admin.repository.AdminPermissionRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class AdminScreenAccess {
    private final CurrentRoleLookup roles;
    private final AdminPermissionRepository permissions;
    public boolean canUse(Long userId,String screen) {
        if (userId == null) return false;
        String role=roles.currentRole(userId);
        return "SUPER_ADMIN".equals(role) || "ADMIN".equals(role) && permissions.allowedScreens(userId).contains(screen);
    }
    public boolean allowed(Authentication authentication,HttpServletRequest request) {
        if (authentication == null || !(authentication.getPrincipal() instanceof Long id)) return false;
        String role=roles.currentRole(id);
        if ("SUPER_ADMIN".equals(role)) return true;
        if (!"ADMIN".equals(role)) return false;
        String path=request.getRequestURI().substring("/api/v1/admin".length());
        if (path.equals("/access-profile")) return true;
        if (path.startsWith("/permission-")) return false;
        String screen;
        if (path.startsWith("/vehicles") || path.equals("/vehicle-images")) screen="VEHICLES";
        else if (path.startsWith("/members")) screen="MEMBERS";
        else if (path.startsWith("/chatbot-") || path.equals("/chatbot-active-prompt")) screen="CHATBOT";
        else if (path.startsWith("/chat")) screen="CHAT";
        else if (path.equals("/recommendation-candidates")) screen="RECOMMENDATIONS";
        else if (path.startsWith("/model")) screen="MODELS";
        else if (path.startsWith("/audit-logs")) screen="LOGS";
        else if (path.startsWith("/overview") || path.startsWith("/system-status")) screen="OVERVIEW";
        else return false;
        return permissions.allowedScreens(id).contains(screen);
    }
}

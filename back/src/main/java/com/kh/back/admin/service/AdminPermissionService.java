package com.kh.back.admin.service;

import com.kh.back.admin.repository.AdminPermissionRepository;
import com.kh.back.admin.repository.AdminPermissionRepository.Role;
import com.kh.back.admin.mapper.AdminAuditLogMapper;
import com.kh.back.common.exception.ApiException;
import com.kh.back.chat.service.ChatRoomService;
import com.kh.back.common.security.CurrentRoleLookup;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AdminPermissionService {
    private final AdminPermissionRepository repository;
    private final CurrentRoleLookup roles;
    private final AdminMemberService members;
    private final AdminAuditLogMapper audit;
    private final ChatRoomService chatRooms;

    public record Access(String role, boolean superAdmin, List<String> screens) {}
    public Access access(Long userId) {
        String role=roles.currentRole(userId);
        boolean superAdmin="SUPER_ADMIN".equals(role);
        return new Access(role,superAdmin,superAdmin ? repository.screens().stream().map(s -> s.code()).toList()
            : "ADMIN".equals(role) ? repository.allowedScreens(userId) : List.of());
    }
    public void requireSuper(Long actor) {
        if (actor == null || !"SUPER_ADMIN".equals(roles.currentRole(actor)))
            throw new ApiException(HttpStatus.FORBIDDEN,"ACCESS_DENIED","총관리자만 권한을 관리할 수 있습니다.");
    }
    @Transactional(readOnly=true)
    public Object catalog(Long actor) {
        requireSuper(actor);
        return Map.of("roles",repository.roles(),"screens",repository.screens());
    }
    @Transactional(readOnly=true)
    public Object accounts(Long actor) { requireSuper(actor); return repository.accounts(); }

    @Transactional(isolation=org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
    public Role saveRole(Long actor,Long id,long version,String name,String description,List<String> screens) {
        requireSuper(actor); repository.lock();
        Set<String> known=new HashSet<>(repository.screens().stream().map(s -> s.code()).toList());
        if (!known.containsAll(screens) || screens.size()!=new HashSet<>(screens).size()) throw invalid("사용할 화면을 확인해 주세요.");
        Role before=id == null ? null : findRole(id);
        if (before != null && before.systemRole()) throw invalid("기존 관리자 호환 역할은 수정할 수 없습니다. 다른 업무 역할로 교체해 주세요.");
        if (before != null && before.version()!=version) throw conflict();
        if (before != null && before.screens().contains("CHAT") && !screens.contains("CHAT")) {
            chatRooms.requireNoActiveRoomsOf(repository.chatAdminsDependingOnRole(id));
        }
        try {
            if (id == null) id=repository.createRole(name.strip(),description.strip());
            else if (repository.updateRole(id,version,name.strip(),description.strip()) != 1) throw conflict();
        } catch (DuplicateKeyException failure) { throw invalid("이미 사용 중인 역할명입니다."); }
        repository.setScreens(id,screens);
        Role after=findRole(id);
        audit.insert(actor,before == null ? "ADMIN_ROLE_CREATE" : "ADMIN_ROLE_UPDATE","ROLE",id,after.code()+" · "+after.name());
        List<String> previous=before == null ? List.of() : before.screens();
        for (String code:previous) if (!screens.contains(code)) audit.insert(actor,"ADMIN_SCREEN_REVOKE","ROLE",id,after.code()+" · "+code);
        for (String code:screens) if (!previous.contains(code)) audit.insert(actor,"ADMIN_SCREEN_GRANT","ROLE",id,after.code()+" · "+code);
        return after;
    }
    @Transactional(isolation=org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
    public void deleteRole(Long actor,long id,long version) {
        requireSuper(actor); repository.lock(); Role role=findRole(id);
        if (role.systemRole()) throw invalid("기존 관리자 호환 역할은 삭제할 수 없습니다.");
        if (role.version()!=version) throw conflict();
        if (role.accountCount()>0) throw new ApiException(HttpStatus.CONFLICT,"ROLE_IN_USE","관리자에게 배정된 역할은 회수한 뒤 삭제해 주세요.");
        repository.deleteRole(id);
        audit.insert(actor,"ADMIN_ROLE_DELETE","ROLE",null,role.code()+" · "+role.name());
    }
    @Transactional(isolation=org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
    public void assign(Long actor,long userId,List<Long> ids,List<Long> expectedIds) {
        requireSuper(actor); repository.lock();
        if (actor==userId || "SUPER_ADMIN".equals(roles.currentRole(userId))) throw invalid("본인 또는 총관리자의 권한은 변경할 수 없습니다.");
        if (roles.currentRole(userId)==null) throw new ApiException(HttpStatus.NOT_FOUND,"MEMBER_NOT_FOUND","회원을 찾을 수 없습니다.");
        List<Long> before=repository.roleIds(userId);
        if (!new TreeSet<>(before).equals(new TreeSet<>(expectedIds))) throw conflict();
        Set<Long> known=new HashSet<>(repository.roles().stream().map(Role::id).toList());
        if (!known.containsAll(ids) || ids.size()!=new HashSet<>(ids).size()) throw invalid("배정할 역할을 확인해 주세요.");
        Map<Long,Role> definitions=new HashMap<>(); repository.roles().forEach(r -> definitions.put(r.id(),r));
        boolean keepsChat=ids.stream().anyMatch(id -> definitions.get(id).screens().contains("CHAT"));
        if (!keepsChat && repository.allowedScreens(userId).contains("CHAT")) {
            chatRooms.requireNoActiveRoomsOf(List.of(userId));
        }
        for (long id:before) if (!ids.contains(id)) audit.insert(actor,"ADMIN_ROLE_REVOKE","MEMBER",userId,definitions.get(id).code()+" · "+definitions.get(id).name());
        for (long id:ids) if (!before.contains(id)) audit.insert(actor,"ADMIN_ROLE_GRANT","MEMBER",userId,definitions.get(id).code()+" · "+definitions.get(id).name());
        if (ids.isEmpty()) {
            if ("ADMIN".equals(roles.currentRole(userId))) members.changeRole(actor,userId,"USER");
        } else {
            if (!"ADMIN".equals(roles.currentRole(userId))) members.changeRole(actor,userId,"ADMIN");
            repository.setRoles(userId,ids);
        }
    }
    private Role findRole(long id) { return repository.roles().stream().filter(r -> r.id()==id).findFirst()
        .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND,"ROLE_NOT_FOUND","역할을 찾을 수 없습니다.")); }
    private static ApiException invalid(String message) { return new ApiException(HttpStatus.BAD_REQUEST,"INVALID_PERMISSION",message); }
    private static ApiException conflict() { return new ApiException(HttpStatus.CONFLICT,"PERMISSION_CHANGED","다른 작업에서 권한이 변경되었습니다. 다시 조회해 주세요."); }
}

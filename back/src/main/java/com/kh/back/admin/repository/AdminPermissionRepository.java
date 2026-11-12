package com.kh.back.admin.repository;

import java.time.LocalDateTime;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class AdminPermissionRepository {
    private final JdbcTemplate jdbc;
    public record Screen(long id, String code, String name, int displayOrder) {}
    public record Role(long id, String code, String name, String description, boolean systemRole,
                       long version, LocalDateTime createdAt, long accountCount, List<String> screens) {}
    public record Account(long userId, String nickName, String role, LocalDateTime createdAt, List<Long> roleIds) {}

    public List<Screen> screens() {
        return jdbc.query("SELECT * FROM admin_permissions ORDER BY display_order,id", (rs,n) ->
            new Screen(rs.getLong("id"),rs.getString("code"),rs.getString("name"),rs.getInt("display_order")));
    }
    public List<String> allowedScreens(long userId) {
        return jdbc.queryForList("""
            SELECT DISTINCT p.code FROM admin_account_roles a
            JOIN admin_role_permissions r ON r.role_id=a.role_id
            JOIN admin_permissions p ON p.id=r.permission_id WHERE a.user_id=?
            """,String.class,userId);
    }
    // 이 역할의 상담 화면을 제거하면 실제 상담 접근 권한을 잃는 일반 관리자만 찾는다.
    public List<Long> chatAdminsDependingOnRole(long roleId) {
        return jdbc.queryForList("""
            SELECT a.user_id FROM admin_account_roles a
            JOIN admin_accounts account ON account.user_id=a.user_id AND account.role='ADMIN'
            WHERE a.role_id=? AND NOT EXISTS (
                SELECT 1 FROM admin_account_roles other_role
                JOIN admin_role_permissions permission ON permission.role_id=other_role.role_id
                JOIN admin_permissions screen ON screen.id=permission.permission_id AND screen.code='CHAT'
                WHERE other_role.user_id=a.user_id AND other_role.role_id<>a.role_id
            ) ORDER BY a.user_id
            """,Long.class,roleId);
    }
    public List<Role> roles() {
        Map<Long,List<String>> screens = new HashMap<>();
        jdbc.query("SELECT r.role_id,p.code FROM admin_role_permissions r JOIN admin_permissions p ON p.id=r.permission_id ORDER BY p.display_order", rs -> {
            screens.computeIfAbsent(rs.getLong("role_id"), key -> new ArrayList<>()).add(rs.getString("code"));
        });
        return jdbc.query("""
            SELECT r.*,(SELECT COUNT(*) FROM admin_account_roles a WHERE a.role_id=r.id) account_count
            FROM admin_roles r ORDER BY r.id DESC
            """, (rs,n) -> new Role(rs.getLong("id"),rs.getString("code"),rs.getString("name"),rs.getString("description"),
                rs.getBoolean("system_role"),rs.getLong("version"),rs.getTimestamp("created_at").toLocalDateTime(),
                rs.getLong("account_count"),screens.getOrDefault(rs.getLong("id"),List.of())));
    }
    public List<Account> accounts() {
        Map<Long,List<Long>> roles = new HashMap<>();
        jdbc.query("SELECT user_id,role_id FROM admin_account_roles ORDER BY role_id",rs -> {
            roles.computeIfAbsent(rs.getLong("user_id"),key -> new ArrayList<>()).add(rs.getLong("role_id"));
        });
        return jdbc.query("""
            SELECT a.*,u.nick_name FROM admin_accounts a JOIN users u ON u.id=a.user_id
            WHERE u.role <> 'WITHDRAWN' ORDER BY a.created_at DESC,a.user_id DESC
            """,(rs,n) -> new Account(rs.getLong("user_id"),rs.getString("nick_name"),rs.getString("role"),
                rs.getTimestamp("created_at").toLocalDateTime(),roles.getOrDefault(rs.getLong("user_id"),List.of())));
    }
    // Serialize role edits/deletes and account assignment, preventing assignment/delete races.
    public void lock() { jdbc.queryForList("SELECT id FROM admin_roles ORDER BY id FOR UPDATE",Long.class); }
    public long createRole(String name,String description) {
        String code="ROLE_"+UUID.randomUUID().toString().replace("-","");
        jdbc.update("INSERT INTO admin_roles(code,name,description) VALUES(?,?,?)",code,name,description);
        return jdbc.queryForObject("SELECT id FROM admin_roles WHERE code=?",Long.class,code);
    }
    public int updateRole(long id,long version,String name,String description) {
        return jdbc.update("UPDATE admin_roles SET name=?,description=?,version=version+1 WHERE id=? AND version=?",name,description,id,version);
    }
    public void setScreens(long id,List<String> codes) {
        jdbc.update("DELETE FROM admin_role_permissions WHERE role_id=?",id);
        for (String code:codes) jdbc.update("INSERT INTO admin_role_permissions(role_id,permission_id) SELECT ?,id FROM admin_permissions WHERE code=?",id,code);
    }
    public void deleteRole(long id) { jdbc.update("DELETE FROM admin_roles WHERE id=?",id); }
    public List<Long> roleIds(long userId) { return jdbc.queryForList("SELECT role_id FROM admin_account_roles WHERE user_id=? ORDER BY role_id",Long.class,userId); }
    public void setRoles(long userId,List<Long> ids) {
        jdbc.update("DELETE FROM admin_account_roles WHERE user_id=?",userId);
        for (long id:ids) jdbc.update("INSERT INTO admin_account_roles(user_id,role_id) VALUES(?,?)",userId,id);
    }
    public void assignLegacyRole(long userId) {
        jdbc.update("INSERT IGNORE INTO admin_account_roles(user_id,role_id) SELECT ?,id FROM admin_roles WHERE code='LEGACY_ADMIN'",userId);
    }
}

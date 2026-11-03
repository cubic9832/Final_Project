-- 보완 14: admin_accounts.granted_by(관리자로 지정한 총관리자) 칸을 지운다.
-- 저장만 하고 어디서도 읽지 않았고, 같은 정보(누가 · 언제 · 누구를 · 무엇으로)가 운영 로그(admin_audit_logs 의 ROLE_CHANGE)에
-- 해제 기록까지 남는다 → 중복이라 뺀다 (11-03 회의).
-- 외래 키를 먼저 지워야 칸을 지울 수 있다.

ALTER TABLE admin_accounts DROP FOREIGN KEY fk_admin_accounts_granted_by;
ALTER TABLE admin_accounts DROP COLUMN granted_by;

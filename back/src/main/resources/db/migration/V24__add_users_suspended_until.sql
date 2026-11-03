-- 9단계: 계정 정지 (총관리자만). 정지가 끝나는 시각 — NULL 이면 정지 아님, 9999-12-31 이면 영구 정지.
-- 누가 · 왜 정지했는지는 운영 로그(admin_audit_logs 의 MEMBER_SUSPEND · MEMBER_UNSUSPEND)에 남긴다 → 칸 하나만 추가
-- 정지 중에는 로그인 · 구글 로그인 · 로그인 유지(토큰 재발급) · 탈퇴가 막힌다

ALTER TABLE users ADD COLUMN suspended_until DATETIME NULL;

CREATE TABLE admin_roles (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(200) NOT NULL DEFAULT '',
    system_role BOOLEAN NOT NULL DEFAULT FALSE,
    version BIGINT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE admin_permissions (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(50) NOT NULL,
    display_order INT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE admin_role_permissions (
    role_id BIGINT NOT NULL,
    permission_id BIGINT NOT NULL,
    PRIMARY KEY(role_id, permission_id),
    CONSTRAINT fk_role_permission_role FOREIGN KEY(role_id) REFERENCES admin_roles(id) ON DELETE CASCADE,
    CONSTRAINT fk_role_permission_screen FOREIGN KEY(permission_id) REFERENCES admin_permissions(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE admin_account_roles (
    user_id BIGINT NOT NULL,
    role_id BIGINT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(user_id, role_id),
    CONSTRAINT fk_account_role_account FOREIGN KEY(user_id) REFERENCES admin_accounts(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_account_role_role FOREIGN KEY(role_id) REFERENCES admin_roles(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO admin_permissions(code,name,display_order) VALUES
('OVERVIEW','운영 현황',1),('VEHICLES','차량 관리',2),('RECOMMENDATIONS','추천 관리',3),
('MODELS','모델 관리',4),('MEMBERS','회원 관리',5),('CHAT','1:1 상담',6),
('CHATBOT','콤파 대화·평가',7),('LOGS','운영 로그',10);

INSERT INTO admin_roles(code,name,description,system_role) VALUES
('LEGACY_ADMIN','기존 관리자','전환 전 관리자의 화면 접근 범위를 유지하는 역할입니다.',TRUE),
('OPERATOR','운영 담당','회원 상태와 운영 이력을 관리합니다.',FALSE),
('VEHICLE_MANAGER','차량 관리 담당','차량과 추천 후보를 관리합니다.',FALSE),
('SUPPORT_AGENT','상담 담당','1:1 상담을 처리합니다.',FALSE),
('AI_MANAGER','AI 관리 담당','콤파와 추천 모델을 관리합니다.',FALSE);

INSERT INTO admin_role_permissions(role_id,permission_id)
SELECT r.id,p.id FROM admin_roles r CROSS JOIN admin_permissions p WHERE r.code='LEGACY_ADMIN';
INSERT INTO admin_role_permissions(role_id,permission_id)
SELECT r.id,p.id FROM admin_roles r CROSS JOIN admin_permissions p
WHERE (r.code='OPERATOR' AND p.code IN ('OVERVIEW','MEMBERS','LOGS'))
   OR (r.code='VEHICLE_MANAGER' AND p.code IN ('OVERVIEW','VEHICLES','RECOMMENDATIONS'))
   OR (r.code='SUPPORT_AGENT' AND p.code IN ('OVERVIEW','CHAT'))
   OR (r.code='AI_MANAGER' AND p.code IN ('OVERVIEW','CHATBOT','MODELS'));

-- Preserve existing administrators without changing their assigned job responsibilities.
INSERT INTO admin_account_roles(user_id,role_id)
SELECT a.user_id,r.id FROM admin_accounts a CROSS JOIN admin_roles r
WHERE a.role='ADMIN' AND r.code='LEGACY_ADMIN';

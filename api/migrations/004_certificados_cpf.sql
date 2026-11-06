-- YKIRE ERP 004: executar UMA VEZ, APÓS 001/002/003, com backup completo.
-- Não remove informações nem altera custos, produtos ou saldos.
SET NAMES utf8mb4;
ALTER TABLE employees ADD COLUMN cpf CHAR(11) NULL AFTER registration, ADD UNIQUE KEY uq_employees_cpf (cpf);

CREATE TABLE certificate_templates (
    code VARCHAR(32) PRIMARY KEY, title VARCHAR(180) NOT NULL,
    default_hours SMALLINT UNSIGNED NOT NULL, active TINYINT(1) NOT NULL DEFAULT 1,
    sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0
) ENGINE=InnoDB;
INSERT INTO certificate_templates(code,title,default_hours,sort_order) VALUES
    ('nr05','NR-05 — CIPA',20,1),
    ('nr06','NR-06 — Utilização e Conservação de EPI',4,2),
    ('nr12','NR-12 — Segurança em Máquinas e Equipamentos',8,3),
    ('nr18','NR-18 — Segurança na Construção',4,4),
    ('direcao','Direção Defensiva',8,5);

CREATE TABLE training_sessions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    template_code VARCHAR(32) NOT NULL,
    training_date DATE NOT NULL,
    location VARCHAR(120) NOT NULL,
    hours SMALLINT UNSIGNED NOT NULL,
    instructor_name VARCHAR(150) NOT NULL,
    instructor_title VARCHAR(150) NOT NULL DEFAULT '',
    instructor_registration VARCHAR(90) NOT NULL DEFAULT '',
    verification_note TEXT NOT NULL,
    verified_by BIGINT UNSIGNED NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(template_code) REFERENCES certificate_templates(code) ON DELETE RESTRICT,
    FOREIGN KEY(verified_by) REFERENCES app_users(id) ON DELETE RESTRICT
    ) ENGINE=InnoDB;
CREATE TABLE employee_certificates (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    employee_id BIGINT UNSIGNED NOT NULL,
    unit_id BIGINT UNSIGNED NOT NULL,
    training_session_id BIGINT UNSIGNED NOT NULL UNIQUE,
    registration_snapshot VARCHAR(40) NOT NULL,
    full_name_snapshot VARCHAR(180) NOT NULL,
    cpf_snapshot CHAR(11) NOT NULL,
    job_title_snapshot VARCHAR(150) NOT NULL,
    issued_by BIGINT UNSIGNED NOT NULL,
    status ENUM('issued','cancelled') NOT NULL DEFAULT 'issued',
    issued_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_cert_employee (employee_id,issued_at),
    KEY idx_cert_unit (unit_id,issued_at),
    FOREIGN KEY(employee_id) REFERENCES employees(id) ON DELETE RESTRICT,
    FOREIGN KEY(unit_id) REFERENCES units(id) ON DELETE RESTRICT,
    FOREIGN KEY(training_session_id) REFERENCES training_sessions(id) ON DELETE RESTRICT,
    FOREIGN KEY(issued_by) REFERENCES app_users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

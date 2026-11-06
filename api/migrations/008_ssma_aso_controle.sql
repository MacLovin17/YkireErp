-- YKIRE ERP 012 — SSMA: controle administrativo de ASO.
-- PRÉ-REQUISITO: migrações 001 a 007 concluídas.
-- Execute apenas UMA vez, após backup. Nenhuma tabela anterior é alterada.
-- Não é prontuário clínico e não emite ASOs.
SET NAMES utf8mb4;
CREATE TABLE aso_clinics (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(180) NOT NULL,
    cnpj CHAR(14) NULL,
    contact VARCHAR(160) NULL,
    status ENUM('active','inactive') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_aso_clinic_name (name),
    KEY idx_aso_clinic_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE aso_records (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    employee_id BIGINT UNSIGNED NOT NULL,
    unit_id BIGINT UNSIGNED NOT NULL,
    exam_type ENUM('admissional','periodico','retorno','mudanca_riscos','demissional') NOT NULL,
    admin_status ENUM('aguardando_agendamento','agendado','realizado_aguardando_aso','aso_recebido','revisao_necessaria') NOT NULL DEFAULT 'aguardando_agendamento',
    clinic_id BIGINT UNSIGNED NULL,
    scheduled_for DATE NULL,
    performed_on DATE NULL,
    received_on DATE NULL,
    next_evaluation_on DATE NULL,
    administrative_notes VARCHAR(500) NULL,
    stored_pdf_name CHAR(40) NULL,
    original_pdf_name VARCHAR(180) NULL,
    created_by BIGINT UNSIGNED NOT NULL,
    updated_by BIGINT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_aso_employee (employee_id,id),
    KEY idx_aso_due (next_evaluation_on),
    KEY idx_aso_unit (unit_id),
    KEY idx_aso_status (admin_status),
    
  CONSTRAINT fk_aso_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE RESTRICT,
  CONSTRAINT fk_aso_unit FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE RESTRICT,
  CONSTRAINT fk_aso_clinic FOREIGN KEY (clinic_id) REFERENCES aso_clinics(id) ON DELETE RESTRICT,
  CONSTRAINT fk_aso_created FOREIGN KEY (created_by) REFERENCES app_users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_aso_updated FOREIGN KEY (updated_by) REFERENCES app_users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

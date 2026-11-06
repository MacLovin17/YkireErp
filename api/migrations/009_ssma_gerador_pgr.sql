-- YKIRE ERP — Atualização 014: Gerador de PGR
-- Pré-requisito: migrações 001 a 008. Backup antes de executar uma vez.
-- PGR é documento técnico sujeito a validação pelo responsável habilitado.
SET NAMES utf8mb4;

CREATE TABLE pgr_documents (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    hr_company_id BIGINT UNSIGNED NOT NULL,
    unit_id BIGINT UNSIGNED NOT NULL,
    title VARCHAR(180) NOT NULL,
    contract_number VARCHAR(100) NULL,
    start_on DATE NULL,
    end_on DATE NULL,
    status ENUM('draft','review','validated') NOT NULL DEFAULT 'draft',
    revision INT UNSIGNED NOT NULL DEFAULT 1,
    content_json LONGTEXT NOT NULL,
    created_by BIGINT UNSIGNED NOT NULL,
    updated_by BIGINT UNSIGNED NOT NULL,
    validated_by BIGINT UNSIGNED NULL,
    validated_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_pgr_company_unit (hr_company_id,unit_id),
    KEY idx_pgr_status (status),

 CONSTRAINT fk_pgr_company FOREIGN KEY (hr_company_id) REFERENCES hr_companies(id) ON DELETE RESTRICT,
 CONSTRAINT fk_pgr_unit FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE RESTRICT,
 CONSTRAINT fk_pgr_creator FOREIGN KEY (created_by) REFERENCES app_users(id) ON DELETE RESTRICT,
 CONSTRAINT fk_pgr_updater FOREIGN KEY (updated_by) REFERENCES app_users(id) ON DELETE RESTRICT,
 CONSTRAINT fk_pgr_validator FOREIGN KEY (validated_by) REFERENCES app_users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE pgr_document_versions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    document_id BIGINT UNSIGNED NOT NULL,
    revision INT UNSIGNED NOT NULL,
    snapshot_json LONGTEXT NOT NULL,
    status ENUM('draft','review','validated') NOT NULL,
    changed_by BIGINT UNSIGNED NOT NULL,
    changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_pgr_document_revision(document_id, revision),
    
 CONSTRAINT fk_pgr_versions_document FOREIGN KEY(document_id) REFERENCES pgr_documents(id) ON DELETE RESTRICT,
 CONSTRAINT fk_pgr_versions_user FOREIGN KEY(changed_by) REFERENCES app_users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

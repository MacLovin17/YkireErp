-- YKIRE ERP 005 — RH: documentos, endereço, uniformes, CNH e dependentes.
-- Aplicar apenas depois da migração 004, uma única vez, com backup validado.
-- Não modifica saldos, movimentações, EPI, ferramentas nem certificados.
SET NAMES utf8mb4;
ALTER TABLE employees
    ADD COLUMN rg VARCHAR(32) NULL AFTER cpf,
    ADD COLUMN cnh_category VARCHAR(4) NULL AFTER rg,
    ADD COLUMN uniform_size VARCHAR(10) NULL AFTER cnh_category,
    ADD COLUMN boot_size TINYINT UNSIGNED NULL AFTER uniform_size,
    ADD COLUMN address_postal_code CHAR(8) NULL AFTER boot_size,
    ADD COLUMN address_street VARCHAR(180) NULL AFTER address_postal_code,
    ADD COLUMN address_number VARCHAR(20) NULL AFTER address_street,
    ADD COLUMN address_complement VARCHAR(100) NULL AFTER address_number,
    ADD COLUMN address_neighborhood VARCHAR(100) NULL AFTER address_complement,
    ADD COLUMN address_city VARCHAR(100) NULL AFTER address_neighborhood,
    ADD COLUMN address_state CHAR(2) NULL AFTER address_city;

CREATE TABLE employee_dependents (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    employee_id BIGINT UNSIGNED NOT NULL,
    full_name VARCHAR(180) NOT NULL,
    relationship VARCHAR(50) NOT NULL,
    date_of_birth DATE NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_employee_dependents_employee (employee_id),
    CONSTRAINT fk_employee_dependents_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

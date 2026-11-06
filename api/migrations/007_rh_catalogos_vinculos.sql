-- YKIRE ERP 010 — RH padronizado e dados pessoais / trabalhistas
-- PRÉ-REQUISITO: migrações 001-006 já executadas. Execute UMA VEZ após backup.
-- Não altera estoque, saldos, custos, treinamentos nem certificados emitidos.
-- Empresas não são importadas automaticamente: cadastrar os três CNPJs reais pelo RH.
SET NAMES utf8mb4;

CREATE TABLE hr_job_roles (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    status ENUM('active','inactive') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_hr_job_roles_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE hr_departments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    status ENUM('active','inactive') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_hr_departments_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE hr_companies (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    legal_name VARCHAR(180) NOT NULL,
    trade_name VARCHAR(180) NULL,
    cnpj CHAR(14) NOT NULL,
    status ENUM('active','inactive') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_hr_companies_cnpj (cnpj),
    KEY idx_hr_companies_name (legal_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE employees
    ADD COLUMN job_role_id BIGINT UNSIGNED NULL AFTER job_title,
    ADD COLUMN department_id BIGINT UNSIGNED NULL AFTER department,
    ADD COLUMN hr_company_id BIGINT UNSIGNED NULL AFTER unit_id,
    ADD COLUMN birth_date DATE NULL AFTER cpf,
    ADD COLUMN pis CHAR(11) NULL AFTER birth_date,
    ADD COLUMN admission_date DATE NULL AFTER pis,
    ADD COLUMN ctps_number VARCHAR(25) NULL AFTER admission_date,
    ADD COLUMN ctps_series VARCHAR(20) NULL AFTER ctps_number,
    ADD COLUMN birthplace VARCHAR(120) NULL AFTER ctps_series,
    ADD COLUMN employee_category VARCHAR(60) NULL AFTER birthplace,
    ADD COLUMN cbo CHAR(6) NULL AFTER employee_category,
    ADD KEY idx_employees_job_role (job_role_id),
    ADD KEY idx_employees_department (department_id),
    ADD KEY idx_employees_hr_company (hr_company_id),
    ADD UNIQUE KEY uq_employees_pis (pis),
    ADD CONSTRAINT fk_employees_job_role FOREIGN KEY (job_role_id) REFERENCES hr_job_roles(id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_employees_department FOREIGN KEY (department_id) REFERENCES hr_departments(id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_employees_hr_company FOREIGN KEY (hr_company_id) REFERENCES hr_companies(id) ON DELETE RESTRICT;

-- Preserva dados legados e importa termos distintos nos catálogos, sem inferir
-- que abreviações diferentes representam a mesma função ou departamento.
INSERT IGNORE INTO hr_job_roles(name)
SELECT DISTINCT TRIM(job_title) FROM employees
WHERE job_title IS NOT NULL AND TRIM(job_title)<>'';
INSERT IGNORE INTO hr_departments(name)
SELECT DISTINCT TRIM(department) FROM employees
WHERE department IS NOT NULL AND TRIM(department)<>'';
UPDATE employees e JOIN hr_job_roles j ON LOWER(TRIM(e.job_title))=LOWER(j.name)
SET e.job_role_id=j.id WHERE e.job_role_id IS NULL;
UPDATE employees e JOIN hr_departments d ON LOWER(TRIM(e.department))=LOWER(d.name)
SET e.department_id=d.id WHERE e.department_id IS NULL;

-- Revisar duplicatas históricas como "Aux. Adm" vs. "Auxiliar Administrativo".
-- Nenhum CNPJ é atribuído aos funcionários sem confirmação do RH.

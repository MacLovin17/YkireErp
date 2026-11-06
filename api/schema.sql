-- Ykire Estoque 2.0 | MySQL 8+ / MariaDB 10.6+ | utf8mb4
SET NAMES utf8mb4;
CREATE TABLE IF NOT EXISTS units (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 name VARCHAR(180) NOT NULL,
 kind ENUM('sede','obra') NOT NULL,
 status ENUM('active','inactive') NOT NULL DEFAULT 'active',
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 INDEX (kind)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS warehouses (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 unit_id BIGINT UNSIGNED NOT NULL UNIQUE,
 name VARCHAR(180) NOT NULL,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE RESTRICT
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS cost_centers (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 unit_id BIGINT UNSIGNED NOT NULL,
 code VARCHAR(55) NOT NULL,
 name VARCHAR(180) NOT NULL,
 status ENUM('active','inactive') DEFAULT 'active',
 UNIQUE KEY uq_unit_center (unit_id, code),
 FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE RESTRICT
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS app_users (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 username VARCHAR(100) NOT NULL UNIQUE,
 display_name VARCHAR(180) NOT NULL,
 password_hash VARCHAR(255) NOT NULL,
 role ENUM('master','admin','comum') NOT NULL DEFAULT 'comum',
 status ENUM('active','inactive') NOT NULL DEFAULT 'active',
 created_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS user_modules (
 user_id BIGINT UNSIGNED NOT NULL,
 module_key ENUM('rh','estoque','ssma','adm') NOT NULL,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(user_id,module_key),
 FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS user_units (
 user_id BIGINT UNSIGNED NOT NULL,
 unit_id BIGINT UNSIGNED NOT NULL,
 PRIMARY KEY (user_id, unit_id),
 FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE,
 FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS categories (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 name VARCHAR(180) NOT NULL UNIQUE,
 status VARCHAR(20) NOT NULL DEFAULT 'active',
 data JSON NULL,
 created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS suppliers (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 company_name VARCHAR(180) NOT NULL,
 cnpj VARCHAR(25) NULL,
 status VARCHAR(20) NOT NULL DEFAULT 'active',
 data JSON NULL,
 created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS products (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 name VARCHAR(220) NOT NULL,
 description TEXT NULL,
 category_id BIGINT UNSIGNED NULL,
 supplier_id BIGINT UNSIGNED NULL,
 unit VARCHAR(35) NOT NULL DEFAULT 'unidade',
 location VARCHAR(180) NOT NULL DEFAULT '',
 shelf VARCHAR(100) NOT NULL DEFAULT '',
 min_stock DECIMAL(16,3) NOT NULL DEFAULT 0,
 max_stock DECIMAL(16,3) NULL,
 unit_cost DECIMAL(16,2) NOT NULL DEFAULT 0,
 status ENUM('active','inactive') NOT NULL DEFAULT 'active',
 notes TEXT NULL,
 created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 last_movement_date DATETIME NULL,
 FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
 FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL
) ENGINE=InnoDB;
-- The global internal product code is its auto-increment id (never reused).
CREATE TABLE IF NOT EXISTS stocks (
 product_id BIGINT UNSIGNED NOT NULL,
 warehouse_id BIGINT UNSIGNED NOT NULL,
 quantity DECIMAL(16,3) NOT NULL DEFAULT 0,
 stock_value DECIMAL(20,2) NOT NULL DEFAULT 0,
 PRIMARY KEY (product_id, warehouse_id),
 FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
 FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE RESTRICT,
 CHECK (quantity >= 0)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS movements (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 product_id BIGINT UNSIGNED NOT NULL,
 warehouse_id BIGINT UNSIGNED NOT NULL,
 related_warehouse_id BIGINT UNSIGNED NULL,
 transfer_ref VARCHAR(45) NULL,
 type VARCHAR(35) NOT NULL,
 quantity DECIMAL(16,3) NOT NULL,
 previous_balance DECIMAL(16,3) NOT NULL,
 new_balance DECIMAL(16,3) NOT NULL,
 cost_center_id BIGINT UNSIGNED NULL,
 user_id BIGINT UNSIGNED NOT NULL,
 date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 detail JSON NULL,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
 FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE RESTRICT,
 FOREIGN KEY (related_warehouse_id) REFERENCES warehouses(id) ON DELETE RESTRICT,
 FOREIGN KEY (cost_center_id) REFERENCES cost_centers(id) ON DELETE SET NULL,
 FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE RESTRICT,
 INDEX idx_movement_warehouse (warehouse_id,date),
 INDEX idx_movement_product (product_id,date),
 INDEX idx_movement_transfer (transfer_ref)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS inventories (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 warehouse_id BIGINT UNSIGNED NOT NULL,
 code VARCHAR(65) NOT NULL,
 status VARCHAR(30) NOT NULL DEFAULT 'em_contagem',
 items JSON NOT NULL,
 notes TEXT NULL,
 justification TEXT NULL,
 counted_by VARCHAR(180) NULL,
 created_by_name VARCHAR(180) NULL,
 approved_by VARCHAR(180) NULL,
 created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE RESTRICT,
 UNIQUE KEY uq_inventory_code_warehouse (code,warehouse_id)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS audit_logs (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 user_id BIGINT UNSIGNED NULL,
 action VARCHAR(60) NOT NULL,
 entity VARCHAR(70) NOT NULL,
 entity_id VARCHAR(70) NULL,
 warehouse_id BIGINT UNSIGNED NULL,
 details JSON NULL,
 ip VARCHAR(45) NULL,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 INDEX idx_audit_when (created_at),
 INDEX idx_audit_warehouse (warehouse_id,created_at)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS login_attempts (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 fingerprint CHAR(64) NOT NULL,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 INDEX idx_login_attempts (fingerprint,created_at)
) ENGINE=InnoDB;

-- Newly installed instances can create the employee management module too.
-- For existing HostGator databases, apply migrations/002_funcionarios_epi_ferramentas.sql exactly once.
CREATE TABLE employees (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  registration VARCHAR(40) NOT NULL,
  full_name VARCHAR(180) NOT NULL,
  job_title VARCHAR(150) NOT NULL DEFAULT '',
  department VARCHAR(150) NOT NULL DEFAULT '',
  unit_id BIGINT UNSIGNED NOT NULL,
  cost_center_id BIGINT UNSIGNED NULL,
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_employees_registration (registration),
  KEY idx_employees_unit (unit_id, status),
  FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE RESTRICT,
  FOREIGN KEY (cost_center_id) REFERENCES cost_centers(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

ALTER TABLE movements
 ADD COLUMN employee_id BIGINT UNSIGNED NULL AFTER user_id,
 ADD KEY idx_movements_employee (employee_id, date),
 ADD CONSTRAINT fk_movements_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE RESTRICT;

CREATE TABLE tool_assignments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  employee_id BIGINT UNSIGNED NOT NULL,
  movement_id BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NOT NULL,
  warehouse_id BIGINT UNSIGNED NOT NULL,
  issued_quantity DECIMAL(16,3) NOT NULL,
  settled_quantity DECIMAL(16,3) NOT NULL DEFAULT 0,
  issued_value DECIMAL(20,2) NOT NULL,
  status ENUM('open','closed') NOT NULL DEFAULT 'open',
  issued_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_tool_issue_movement (movement_id),
  KEY idx_tools_employee_status (employee_id,status),
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE RESTRICT,
  FOREIGN KEY (movement_id) REFERENCES movements(id) ON DELETE RESTRICT,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE RESTRICT,
  CHECK (issued_quantity > 0),
  CHECK (settled_quantity >= 0),
  CHECK (settled_quantity <= issued_quantity)
) ENGINE=InnoDB;

CREATE TABLE tool_returns (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  assignment_id BIGINT UNSIGNED NOT NULL,
  movement_id BIGINT UNSIGNED NULL,
  quantity DECIMAL(16,3) NOT NULL,
  disposition ENUM('good','damaged','lost') NOT NULL,
  notes TEXT NULL,
  returned_by_user_id BIGINT UNSIGNED NOT NULL,
  occurred_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_tool_returns_assignment (assignment_id, occurred_at),
  FOREIGN KEY (assignment_id) REFERENCES tool_assignments(id) ON DELETE RESTRICT,
  FOREIGN KEY (movement_id) REFERENCES movements(id) ON DELETE RESTRICT,
  FOREIGN KEY (returned_by_user_id) REFERENCES app_users(id) ON DELETE RESTRICT,
  CHECK (quantity > 0)
) ENGINE=InnoDB;

CREATE TABLE epi_deliveries (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  employee_id BIGINT UNSIGNED NOT NULL,
  movement_id BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NOT NULL,
  warehouse_id BIGINT UNSIGNED NOT NULL,
  quantity DECIMAL(16,3) NOT NULL,
  delivery_value DECIMAL(20,2) NOT NULL,
  ca_number VARCHAR(55) NOT NULL DEFAULT '',
  replacement_reason VARCHAR(180) NOT NULL DEFAULT '',
  delivered_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_epi_issue_movement (movement_id),
  KEY idx_epi_employee_date (employee_id,delivered_at),
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE RESTRICT,
  FOREIGN KEY (movement_id) REFERENCES movements(id) ON DELETE RESTRICT,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE RESTRICT,
  CHECK (quantity > 0)
) ENGINE=InnoDB;

-- 004 Certificados/CPF (novas instalações):
-- YKIRE ERP 004: executar UMA VEZ, APÓS 001/002/003, com backup completo.
-- Não remove informações nem altera custos, produtos ou saldos.

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


-- RH cadastro complementar (nova instalação; bancos existentes: aplicar migration 005 em vez de schema.sql).
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
CREATE TABLE employee_dependents (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,employee_id BIGINT UNSIGNED NOT NULL,full_name VARCHAR(180) NOT NULL,relationship VARCHAR(50) NOT NULL,date_of_birth DATE NULL,created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,KEY idx_employee_dependents_employee(employee_id),CONSTRAINT fk_employee_dependents_employee FOREIGN KEY(employee_id) REFERENCES employees(id) ON DELETE RESTRICT) ENGINE=InnoDB;

-- New installs: migration 006 training companies, added to keep base schema complete.
CREATE TABLE training_companies (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  legal_name VARCHAR(180) NOT NULL,
  trade_name VARCHAR(180) NULL,
  cnpj VARCHAR(14) NULL,
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_training_company_cnpj (cnpj),
  KEY idx_training_company_name (legal_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE training_sessions
  ADD COLUMN training_company_id BIGINT UNSIGNED NULL AFTER template_code,
  ADD COLUMN training_company_name_snapshot VARCHAR(180) NULL AFTER training_company_id,
  ADD COLUMN training_company_cnpj_snapshot VARCHAR(14) NULL AFTER training_company_name_snapshot,
  ADD KEY idx_training_session_company (training_company_id),
  ADD CONSTRAINT fk_training_session_company FOREIGN KEY (training_company_id)
    REFERENCES training_companies(id) ON DELETE RESTRICT;

-- New installations: standardized HR catalogs and employee employment details.
-- Existing installations: run migrations/007_rh_catalogos_vinculos.sql exactly once.
CREATE TABLE hr_job_roles (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,name VARCHAR(150) NOT NULL,status ENUM('active','inactive') NOT NULL DEFAULT 'active',created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,UNIQUE KEY uq_hr_job_roles_name(name)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE hr_departments (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,name VARCHAR(150) NOT NULL,status ENUM('active','inactive') NOT NULL DEFAULT 'active',created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,UNIQUE KEY uq_hr_departments_name(name)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE hr_companies (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,legal_name VARCHAR(180) NOT NULL,trade_name VARCHAR(180) NULL,cnpj CHAR(14) NOT NULL,status ENUM('active','inactive') NOT NULL DEFAULT 'active',created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,UNIQUE KEY uq_hr_companies_cnpj(cnpj),KEY idx_hr_companies_name(legal_name)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
ALTER TABLE employees ADD COLUMN job_role_id BIGINT UNSIGNED NULL AFTER job_title,ADD COLUMN department_id BIGINT UNSIGNED NULL AFTER department,ADD COLUMN hr_company_id BIGINT UNSIGNED NULL AFTER unit_id,ADD COLUMN birth_date DATE NULL AFTER cpf,ADD COLUMN pis CHAR(11) NULL AFTER birth_date,ADD COLUMN admission_date DATE NULL AFTER pis,ADD COLUMN ctps_number VARCHAR(25) NULL AFTER admission_date,ADD COLUMN ctps_series VARCHAR(20) NULL AFTER ctps_number,ADD COLUMN birthplace VARCHAR(120) NULL AFTER ctps_series,ADD COLUMN employee_category VARCHAR(60) NULL AFTER birthplace,ADD COLUMN cbo CHAR(6) NULL AFTER employee_category,ADD KEY idx_employees_job_role(job_role_id),ADD KEY idx_employees_department(department_id),ADD KEY idx_employees_hr_company(hr_company_id),ADD UNIQUE KEY uq_employees_pis(pis),ADD CONSTRAINT fk_employees_job_role FOREIGN KEY(job_role_id) REFERENCES hr_job_roles(id) ON DELETE RESTRICT,ADD CONSTRAINT fk_employees_department FOREIGN KEY(department_id) REFERENCES hr_departments(id) ON DELETE RESTRICT,ADD CONSTRAINT fk_employees_hr_company FOREIGN KEY(hr_company_id) REFERENCES hr_companies(id) ON DELETE RESTRICT;

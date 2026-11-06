-- Ykire Estoque 2.0 — Migration 002 (run ONCE, after 001_estoque_custo_medio.sql)
-- Backup the database and suspend movements while applying. Never drop existing tables.
SET NAMES utf8mb4;

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

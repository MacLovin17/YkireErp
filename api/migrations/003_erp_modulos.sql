-- YKIRE ERP: módulos de acesso por usuário.
-- EXECUTAR UMA ÚNICA VEZ após backup, no banco de produção.
-- Não remove nem altera dados de estoque, EPI, ferramentas ou colaboradores.
CREATE TABLE IF NOT EXISTS user_modules (
    user_id BIGINT UNSIGNED NOT NULL,
    module_key ENUM('rh','estoque','ssma','adm') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id,module_key),
    CONSTRAINT fk_user_modules_user FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE
) ENGINE=InnoDB;
-- Permissões iniciais para usuários já existentes; Master tem acesso universal pela API.
INSERT IGNORE INTO user_modules (user_id,module_key)
SELECT id,'estoque' FROM app_users WHERE role IN ('admin','comum');
INSERT IGNORE INTO user_modules (user_id,module_key)
SELECT id,'rh' FROM app_users WHERE role='admin';
INSERT IGNORE INTO user_modules (user_id,module_key)
SELECT id,'ssma' FROM app_users WHERE role='admin';
INSERT IGNORE INTO user_modules (user_id,module_key)
SELECT id,'adm' FROM app_users WHERE role='admin';

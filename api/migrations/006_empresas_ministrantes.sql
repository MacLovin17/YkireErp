-- YKIRE ERP 006: Cadastro de empresas ministrantes (atualização funcional 009).
-- Requer migrações 001 a 005. Execute UMA VEZ após backup e sem usuários emitindo certificados.
-- Não reescreve certificados emitidos nem altera produtos, saldos ou custo médio.
SET NAMES utf8mb4;

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

-- Certificados anteriores: os campos NULL sinalizam uma emissão legada;
-- o visualizador mantém a redação da empresa definida no modelo antigo.
-- Certificados emitidos após esta atualização terão empresa obrigatória e snapshot histórico.

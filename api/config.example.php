<?php
// Renomeie para config.php, preencha os dados do banco e nunca envie para terceiros.
return [
    'dsn' => 'mysql:host=localhost;port=3306;dbname=SEU_BANCO;charset=utf8mb4',
    'username' => 'SEU_USUARIO_MYSQL',
    'password' => 'SENHA_MYSQL',
    // Senha aleatória longa utilizada apenas na instalação inicial.
    'setup_key' => 'SUBSTITUA_POR_UMA_CHAVE_ALEATORIA_DE_40_CARACTERES',
    'session_name' => 'ykire_session',
];

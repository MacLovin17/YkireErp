# YKIRE ERP — Atualização 009: Empresas ministrantes no SSMA

Esta atualização é incremental, baseada no código-fonte completo da versão 008 (Relatórios de Estoque em PDF). **Não reinstale o sistema ou o banco.**

## O que muda

- Novo menu **SSMA → Empresas ministrantes** (visível para Master e administradores com acesso ao SSMA).
- Cadastro de razão social, nome fantasia (opcional), CNPJ (opcional) e situação ativa/inativa.
- A emissão de certificados passa a exigir seleção da empresa que ministrou o treinamento.
- O PDF emprega a razão social escolhida na frase `ministrado pela Empresa ...`, preservando o texto normativo de cada modelo. Em Direção Defensiva, o nome da empresa é acrescentado como frase sobre a ministrante.
- A empresa e o CNPJ ficam registrados no treinamento **como cópia histórica**; alterações futuras no cadastro não alteram as emissões anteriores.
- Certificados emitidos **antes** desta migração continuam sendo recuperados e usam a empresa padrão de seu modelo (compatibilidade legada).
- A assinatura institucional da Proseg nas duas primeiras páginas dos modelos não é alterada automaticamente: ela é diferente da empresa ministrante. O conteúdo e as assinaturas devem ser validados pelo SSMA.

## Instalação — mantenha a ordem

1. Faça backup completo do banco MySQL `prosegco_dev` e do diretório `public_html/Ykire/`; suspenda novas emissões durante a atualização.
2. Confira se as migrações 001–005 já foram aplicadas. No **phpMyAdmin**, escolha o banco do ERP e importe `api/migrations/006_empresas_ministrantes.sql` **uma única vez**. É uma migração de estrutura; não importa dados de exemplo. Não rode `schema.sql` novamente.
3. Copie **somente** `api/index.php` deste pacote para `public_html/Ykire/api/index.php` no cPanel, após fazer uma cópia do arquivo antigo. NÃO substitua `api/config.php`, `.htaccess` ou qualquer outro arquivo da API.
4. No **projeto-fonte React no computador**, aplique os arquivos alterados conservando as pastas:
   - `src/App.jsx`
   - `src/components/Layout.jsx`
   - `src/Pages/Certificados.jsx`
   - `src/Pages/EmpresasMinistrantes.jsx` (novo)
   - `src/lib/certificatePdf.js`
5. Na raiz do projeto no VS Code, execute `npm install` (apenas se faltar dependência) e `npm run build`.
6. Envie **o conteúdo da pasta `dist`** para `public_html/Ykire/` no cPanel. Substitua `index.html` e atualize a pasta `assets`. Preserve `api/` e os dois `.htaccess`. Os modelos em `public/certificate-templates/` são preservados.
7. No navegador, recarregue com Ctrl+F5. Vá a `SSMA → Empresas ministrantes` e cadastre as empresas reais (por exemplo, sua empresa e prestadoras que de fato ministram cursos). Em `SSMA → Certificados → Nova emissão`, escolha uma empresa ativa.
8. Gere uma emissão de teste **somente para um treinamento que tenha sido efetivamente realizado**, e confira nome, CNPJ e assinaturas necessários no PDF. A emissão grava dados permanentes, portanto não use colaboradores reais para testes fictícios.

## Migração e segurança

- Tabela `training_companies`: cadastros de empresas ministrantes.
- Campos opcionais em `training_sessions`: `training_company_id`, `training_company_name_snapshot`, `training_company_cnpj_snapshot`.
- Os campos de treinamentos antigos ficam NULL de propósito, para manter compatibilidade; **não preencha artificialmente**.
- Novas emissões exigem uma empresa ativa. Apenas Master e Administradores autorizados no módulo SSMA podem cadastrar, editar ou inativar empresas.
- Não exclua empresas por SQL: inative no cadastro para manter históricos e referências.
- O CNPJ é validado quando informado. Uma empresa pode ser cadastrada sem ele e complementada depois.

## Testes realizados / pendentes

- PHP: verificação de sintaxe (`php -l`) aprovada.
- JavaScript/JSX: todos os arquivos analisados pelo parser TypeScript sem erro sintático.
- Texto de PDF: testado com empresa selecionada, fallback histórico e Direção Defensiva.
- **Ainda pendentes:** executar `npm run build` com dependências instaladas e testar API PHP e migração em um MySQL da HostGator. Faça backup antes de aplicar.

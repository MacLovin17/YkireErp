# YKIRE ERP — Atualização 012: SSMA / Saúde Ocupacional / ASO

## Objetivo
Controle administrativo dos ASOs **emitidos por médicos**, sem gerar ASO, parecer de aptidão, prontuário ou resultados de exames. A data da próxima avaliação é cadastrada manualmente de acordo com o PCMSO/orientação responsável; não é uma validade universal definida pelo ERP.

## O que foi incluído
- **SSMA → Saúde Ocupacional / ASO** (acesso Master ou Admin com módulo SSMA e unidade autorizada).
- Painel por prazo **ultrapassado**, **0–7 dias vermelho**, **8–15 dias amarelo**, **16–30 dias verde**, **mais de 30 dias**, **sem data/sem registro**.
- Filtros por unidade, empresa empregadora, nome/matrícula, prazo.
- Criação/edição de acompanhamentos: admissional, periódico, retorno ao trabalho, mudança de riscos ocupacionais, demissional.
- Situações administrativas: aguardando agendamento; agendado; realizado aguardando ASO; ASO recebido; revisão necessária.
- Cadastro de clínicas, histórico por matrícula, data agendada, data do exame, recebimento e próxima avaliação.
- Anexo opcional de PDF oficial (até 8 MB) e download com autenticação/autorização e auditoria.
- Relatórios XLSX e PDF resumidos, **sem cópias dos ASOs nem dados clínicos**.

## Arquivos alterados
- `api/index.php` (novas rotas, permissões, upload privado).
- `api/migrations/008_ssma_aso_controle.sql` (nova migração).
- `src/api/http.js` (upload autenticado).
- `src/App.jsx` (rota ASO).
- `src/components/Layout.jsx` (menu SSMA).
- `src/lib/modules.js` (atalho do módulo).
- `src/Pages/ModuleOverview.jsx` (oculta atalho ASO de usuário comum).
- `src/Pages/AsoControle.jsx` (nova tela).
- `src/lib/asoReport.js` (geradores PDF/Excel).

## Instalação segura na HostGator
1. **Antes de tudo:** exporte um backup completo do MySQL `prosegco_dev` (ou o banco real da instalação) e faça backup do arquivo `public_html/Ykire/api/index.php` e do seu projeto React.
2. Execute no phpMyAdmin, no banco correto, o conteúdo de `api/migrations/008_ssma_aso_controle.sql` **UMA ÚNICA VEZ**. Deve criar `aso_clinics` e `aso_records`. Não rode novamente o `schema.sql`.
3. Coloque a aplicação em manutenção durante a atualização da API, se ela estiver sendo usada. Substitua somente `public_html/Ykire/api/index.php` pelo novo arquivo. Não altere `config.php`, `.htaccess` nem a estrutura anterior.
4. Atualize o código React **da mesma versão** com os arquivos do pacote, execute `npm install` se necessário e `npm run build` no VS Code.
5. Envie da pasta `dist/` o novo `index.html` e a pasta `assets/` à raiz `public_html/Ykire/`, preservando a pasta `api` e os modelos de certificado.
6. Confirme se a conta cPanel tem permissão para criar pasta **fora de `public_html`**. No primeiro upload de ASO o PHP tenta criar `ykire_private_aso_documents` na home da hospedagem (ex.: `/home1/usuario/ykire_private_aso_documents`). **Não mova essa pasta para dentro de `public_html`.** Caso a conta não tenha permissão, solicite ao administrador da hospedagem configurar o caminho privado.
7. Em login Master ou Admin com permissão SSMA, acesse `https://prosegconsultoria.com/Ykire/ssma/aso` e teste as etapas abaixo. Acesso ao ASO deve estar negado ao usuário comum.

## Teste guiado
- Cadastre clínica de teste sem dados sensíveis.
- Cadastre registro de um funcionário existente (matrícula RH), tipo `Periódico`, situação `Agendado` e data agendada.
- Confirme que aparece como **sem próxima data definida** até que a data seja informada; essa separação é proposital.
- Edite o registro: situação `ASO recebido`, datas do exame e recebimento e próxima avaliação definida por quem gerencia o PCMSO.
- Confira alertas: data passada = ultrapassado; hoje a +7 = vermelho; +8 a +15 = amarelo; +16 a +30 = verde; +31 ou mais = normal.
- Adicione PDF oficial de **teste** (sem informações clínicas reais, se estiver em ambiente não homologado). Confirme que o download só funciona para perfil e obra autorizados.
- Gere PDF e Excel de acompanhamento e verifique que não incluem anexos, resultados de exames ou diagnósticos.
- Verifique se o histórico preserva registros antigos, e se o auditor vê eventos de download de ASO.

## Limites e precauções
- Não testamos a migração no MySQL da HostGator, a compilação de produção do React nem a permissão de escrita na home da conta. **A atualização precisa ser homologada antes de uso real.**
- O sistema não envia notificações externas automaticamente; os avisos estão no dashboard e se atualizam ao abrir/atualizar a tela.
- Os documentos são armazenados fora da raiz pública, mas devem estar cobertos por política de retenção, backup seguro, controles de privacidade/LGPD e, conforme o risco, criptografia em repouso.
- O controle documental não substitui os processos e exigências do PCMSO, da NR-7 e dos profissionais de saúde responsáveis.

# YKIRE ERP — RH CPF + SSMA Certificados (atualização 004)

Compatível com o projeto YKIRE ERP modular (RH, ESTOQUE, SSMA, ADM) e migrações **001, 002, 003** previamente aplicadas.

## O que muda
- RH > Funcionários: campo CPF com verificação dos dígitos, permitindo CPF vazio quando não houver certificado.
- SSMA > Certificados: busca de funcionário por matrícula **ou nome**, visualização de CPF mascarado, escolha de um dos 5 modelos, data/local, carga horária, instrutor e observação da conferência.
- Emissão exige que o responsável (Master/Admin com acesso ao SSMA e à obra) confirme a conclusão do treinamento.
- Histórico de emissão com número identificador, snapshot do nome, CPF, matrícula e função, modelo, data, local, instrutor, usuário emissor e data/hora.
- PDF de duas páginas gerado **no navegador** a partir de fundos preparados dos cinco Word originais, sem o CPF/nome das pessoas dos modelos de exemplo. O conteúdo programático do verso é preservado.
- O PDF não inclui assinatura eletrônica/assinaturas verdadeiras, não prova participação por si só, e **deve ser validado e assinado pelo responsável competente**, conforme exigências aplicáveis. A validação do conteúdo normativo e de carga horária cabe ao SSMA.

## Instalação — NÃO pule etapas

1. Faça backup do banco inteiro no phpMyAdmin e do diretório atual `/public_html/Ykire/`. Se possível, deixe as operações em pausa durante a troca.
2. Confirme que a migração **003** (módulos) já foi aplicada. Abra `prosegco_dev` (ou seu banco real) no phpMyAdmin, clique em Importar e selecione **`api/migrations/004_certificados_cpf.sql`**. Execute **somente uma vez**. Isso acrescenta `employees.cpf` e três novas tabelas; não altera saldo, produtos ou custo médio.
3. No cPanel, faça backup de `public_html/Ykire/api/index.php` e substitua **somente esse arquivo** pela versão do pacote. NÃO substitua `api/config.php` nem os `.htaccess` existentes.
4. No computador, atualize os arquivos React indicados abaixo (ou utilize o ZIP de fonte completa) e execute no CMD do VS Code na raiz do projeto:

   ```cmd
   npm install
   npm run build
   ```

5. No cPanel, abra `public_html/Ykire/` e atualize com o **conteúdo de `dist`**:

   - `dist/index.html` → `public_html/Ykire/index.html`
   - `dist/assets/` → `public_html/Ykire/assets/`
   - **`dist/certificate-templates/` → `public_html/Ykire/certificate-templates/`** (NOVO, fundamental para gerar o PDF)

   NÃO envie `src`, `node_modules` nem o `config.php` do seu computador para a pasta pública.
6. Limpe o cache com Ctrl+F5 e acesse `https://prosegconsultoria.com/Ykire/`.

## Atualizar apenas o código-fonte existente

Copie do pacote de atualização estes arquivos preservando os caminhos:

- `src/App.jsx`
- `src/components/Layout.jsx`
- `src/lib/modules.js`
- `src/Pages/Funcionarios.jsx`
- `src/Pages/Certificados.jsx` (novo)
- `src/lib/certificatePdf.js` (novo)
- `public/certificate-templates/*.jpg` (10 fundos dos 5 modelos, duas páginas cada)

No servidor, atualize `api/index.php` e importe `api/migrations/004_certificados_cpf.sql`.

## Testes recomendados
1. RH > Funcionários: editar colaborador de teste, preencher CPF válido e salvar.
2. SSMA > Certificados: pesquisar pelo nome ou matrícula e selecionar o colaborador.
3. Escolher NR-06, completar dados **reais** do treinamento e confirmar a verificação.
4. Emitir PDF, conferir o nome e CPF, data, município, carga horária, instrutor, conteúdo programático e as duas páginas.
5. Voltar ao histórico e baixar novamente o mesmo registro.
6. Testar acesso de operador sem SSMA (deve receber 403) e operador SSMA comum tentando emitir (deve receber 403).
7. Conferir que Estoque, CMP, EPI, Ferramentas e ADM continuam funcionando.

## Proteção e privacidade
- CPF é armazenado com 11 dígitos no MySQL; acesso completo restrito às rotas autorizadas do RH e emissão do SSMA. A busca exibe CPF mascarado.
- O arquivo PDF baixado contém CPF integral; mantenha-o em local seguro e compartilhe somente com pessoas autorizadas.
- Não cole credenciais em chats, prints ou arquivos do front-end.
- Imagens estáticas dos modelos publicadas em `certificate-templates` **não contêm nomes/CPFs das pessoas usadas nos exemplos**.
- Sem assinatura digital e sem verificador público. Para prova legal, mantenha lista de presença, evidências do curso e assinaturas apropriadas.

## Validação desta entrega
- API PHP: sintaxe validada com `php -l`.
- Templates: os 5 modelos Word foram usados para criar fundos sem dados de exemplo; visuais inspecionados.
- Build/integração de React e testes no MySQL da HostGator: **ainda pendentes**; o npm do ambiente de criação não concluiu instalação. Execute `npm run build` no VS Code antes da publicação.

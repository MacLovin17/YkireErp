# YKIRE ERP — Atualização 008: PDF profissional do Estoque

## Objetivo
Trocar o uso de `window.print()` no módulo Estoque > Relatórios por um PDF de relatório de verdade, sem imprimir menus, botões e URL do navegador. O novo PDF reúne título, unidade, referência temporal, emitente, totais, tabela paginada e rodapé com página X de Y.

## Arquivos alterados

- `src/Pages/Relatorios.jsx`: substitui o botão Imprimir/PDF por Gerar PDF, resolve o nome do almoxarifado selecionado e fornece o relatório filtrado ao gerador.
- `src/lib/stockReportPdf.js`: novo gerador usando jsPDF, biblioteca que JÁ consta do `package.json` do YKIRE ERP 007.

## Instalação

1. Faça uma cópia do seu projeto React atual e dos arquivos já publicados na HostGator.
2. Extraia o ZIP e copie os arquivos para as mesmas subpastas de seu projeto; escolha substituir `src/Pages/Relatorios.jsx`. **Não copie arquivos de configuração sobre os seus.**
3. No VS Code, abra a pasta principal que contém `package.json` e execute:

   npm install
   npm run build

   Caso as dependências já estejam instaladas, basta `npm run build`.
4. Confira se `dist/index.html` aponta para `/Ykire/assets/...` (o `vite.config.js` do seu projeto deve ter `base: '/Ykire/'`).
5. No cPanel, em `public_html/Ykire/`, atualize SOMENTE o `index.html` e os arquivos novos de `dist/assets/`.
6. **Preserve** as pastas `api/`, `certificate-templates/` e os arquivos `.htaccess` existentes.
7. Acesse o YKIRE ERP, faça Ctrl+F5 e abra Estoque > Relatórios. Escolha um relatório com dados e clique em **Gerar PDF**.

## Testes sugeridos

- Produtos abaixo do mínimo: deve listar `saldo < mínimo`, inclusive saldo zerado; um produto com saldo igual ao mínimo não aparece.
- Estoque atual ou Valor estimado: custo e valor devem estar no formato monetário brasileiro.
- Entradas por período: aplicar data e emitir PDF, verificando o período no cabeçalho.
- Relatório com mais de 100 linhas: o PDF deve incluir TODAS as linhas carregadas, não apenas as 100 exibidas na tela.
- Relatório com 6 ou mais colunas: documento A4 paisagem; até 5 colunas: A4 retrato.
- Verifique página X de Y e cabeçalho repetido quando a tabela ocupar mais de uma página.
- Confira também a exportação CSV existente, que permanece inalterada.

## Limites importantes da versão existente

- O relatório usa os dados retornados pela API à tela. Atualmente a tela solicita até 2.000 produtos, 3.000 movimentações e 500 inventários. Portanto o PDF inclui todos os registros **carregados**, não necessariamente toda a base histórica. Consultas maiores poderão requerer paginação na API em atualização futura.
- Não é necessário executar migração SQL, nem alterar PHP, MySQL ou senhas nesta atualização.
- Foram feitos testes de sintaxe e um teste de paginação com um simulador da API do jsPDF. O build do React completo e a impressão no navegador/HostGator ainda precisam ser validados no seu ambiente.

## Voltar à versão anterior
Restituir o `src/Pages/Relatorios.jsx` antigo no projeto e republicar a compilação anterior (`index.html` e arquivos `assets`). Banco e API não são afetados.

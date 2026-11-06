# Ykire Estoque 2.0 — Ficha Individual do Funcionário

## O que foi implementado
- Na aba **Funcionários**, cada matrícula possui botão **Ficha**.
- A ficha mostra cadastro atual, unidade, setor, centro de custo, status e indicadores.
- Quatro abas: **EPIs**, **Ferramentas**, **Devoluções / baixas** e **Linha do tempo**.
- A lista de ferramentas mostra entrega, encerramento e **quantidade em posse**.
- A linha do tempo consolida as entregas de EPI, ferramentas e retornos/baixas.
- Botão **Baixar ficha em PDF**: PDF A4 de múltiplas páginas, criado no navegador com `jspdf` (já incluído no package.json). Traz todos os registros retornados, notas e data de emissão.
- A API PHP usa matrícula única e filtra consultas pelos privilégios de sede/obras. Master vê histórico de todas as unidades; Administrador só consulta ficha de colaborador de unidade autorizada e movimentações de obras autorizadas.
- A ficha PDF é administrativa. **Não equivale a recibo de entrega assinado de EPI.**

## NÃO é necessária nova migração SQL
Esta melhoria usa somente tabelas da atualização anterior: `employees`, `epi_deliveries`, `tool_assignments`, `tool_returns`, `movements`, `warehouses`, `units` e `app_users`.
Você **não precisa** importar `schema.sql`, nem reexecutar `MIGRACAO_MYSQL_001.sql` / `MIGRACAO_MYSQL_002.sql`.

## Como instalar — siga nesta ordem

1. Faça backup do arquivo `public_html/Ykire/api/index.php` no cPanel e faça backup da pasta fonte no computador. (Nenhuma tabela será alterada.)
2. No cPanel, substitua **apenas** `public_html/Ykire/api/index.php` pelo novo `api/index.php` do pacote. **Não apague nem substitua** `api/config.php`, `api/.htaccess` ou o `.htaccess` da raiz.
3. No computador, abra o projeto React original que está usando. Do pacote de atualização, copie para a pasta correspondente, substituindo somente:
   - `src/App.jsx`
   - `src/Pages/Funcionarios.jsx`
   - `src/Pages/FichaFuncionario.jsx` (novo)
   - `src/lib/employeePdf.js` (novo)
4. Se ainda não houver dependências na pasta fonte, no CMD dentro do projeto: `npm install`.
5. Execute `npm run build`. A compilação deve terminar sem erros antes do envio.
6. No cPanel, abra `public_html/Ykire/`: envie o **novo `index.html` e a pasta `assets/` gerados dentro de `dist/`**. Mantenha a pasta `api` e os dois `.htaccess`.
7. Abra `https://prosegconsultoria.com/Ykire/`, atualize com Ctrl+F5, entre como Master/Administrador, abra **Funcionários → Ficha** e teste o PDF.

**Cuidado**: o arquivo `src/components/Layout.jsx` com o botão **Sair** fixo não é substituído pelo pacote incremental, então a sua última correção continuará no projeto. O pacote de fonte completo já inclui essa melhoria.

## Teste recomendado
1. Abra uma ficha de funcionário **sem entregas**: deve mostrar as seções vazias e gerar PDF válido.
2. Registre entrega de EPI e ferramenta na aba Saída com matrícula.
3. Consulte a ficha e confirme ambas as entregas.
4. Faça devolução parcial de ferramenta em Ferramentas; verifique a quantidade em posse, o histórico e a linha do tempo.
5. Baixe o PDF e confira as três seções em todas as páginas.
6. Teste com um administrador sem acesso a determinada obra: a API deve negar a ficha dessa unidade.

## Nota técnica e limites
A consulta consolidada retorna até 2.000 registros de cada categoria (EPIs, entregas de ferramentas e devoluções) por ficha; quando esse limite é ultrapassado, a API exige implementação de exportação paginada, sem entregar um PDF incompleto silenciosamente.

Sintaxe PHP e JS/JSX validada; build Vite e integração com HostGator **precisam ser testados no seu ambiente**.

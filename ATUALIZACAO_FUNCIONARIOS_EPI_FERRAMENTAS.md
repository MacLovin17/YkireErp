# Ykire Estoque 2.0 — Funcionários, EPI e Ferramentas

Esta atualização parte do **fonte com a correção anterior do custo médio ponderado (CMP)**.
Não recrie o banco, não importe `api/schema.sql` no banco em uso e não execute novamente a migração 001.

## Regras implementadas

- Cadastro de funcionário com matrícula **única em toda a empresa**, preservando zeros à esquerda; nome, função, departamento, unidade, centro de custo opcional e situação.
- Somente Master e Administrador podem listar e cadastrar funcionários. Usuário Comum pode localizar uma matrícula exata da unidade para registrar saída.
- Ao registrar saída, busque matrícula. O PHP valida funcionário ativo da mesma unidade do almoxarifado e preenche nome, setor e função **a partir do banco**. O centro de custo é sugerido quando cadastrado.
- `Motivo de Saída = EPI`: gera uma saída no estoque e uma linha em `epi_deliveries`, na mesma transação, com produto, quantidade, custo original, data, CA opcional e motivo de substituição.
- `Motivo de Saída = Ferramenta`: gera uma saída de estoque e uma conta em `tool_assignments`, na mesma transação, incluindo quantidade ainda em posse e custo da entrega.
- Devolução parcial/total em boas condições: registra movimento `devolucao_ferramenta` e adiciona o saldo e valor correspondente ao almoxarifado de origem.
- Baixa por dano/extravio: exige administrador e justificativa; resolve pendência sem devolver quantidade ao estoque disponível.
- O histórico por matrícula pode ser consultado nas abas **Ferramentas** e **EPI**; cada retorno está em `tool_returns`.
- Não foram incluídos QR Codes nem códigos de barras. O custo médio em `stocks.stock_value` permanece preservado.

## Atualizar HostGator existente (seguir nesta ordem)

1. **Agende janela sem movimentações e faça backup** do MySQL e do arquivo `public_html/Ykire/api/index.php`.
2. Em **phpMyAdmin**, selecione o banco `prosegco_dev` e execute **uma vez** o arquivo `MIGRACAO_MYSQL_002.sql` (do ZIP de atualização). Ele adiciona 4 tabelas e a coluna `movements.employee_id` sem apagar linhas antigas.
3. Confira a criação das tabelas `employees`, `tool_assignments`, `tool_returns`, `epi_deliveries` e da coluna `employee_id` em `movements`.
4. No cPanel, **substitua apenas** `public_html/Ykire/api/index.php` pelo arquivo `api/index.php` do ZIP de atualização. **Não toque em `config.php` nem `.htaccess`.**
5. Para habilitar as abas, use o **fonte React atualizado** do ZIP completo no computador. Na raiz do projeto: `npm install` (se ainda necessário), `npm run build`. Envie o **conteúdo** de `dist/` para `public_html/Ykire/`, substituindo `index.html` e os arquivos compilados `assets/` conforme o build. Preserve a pasta `api/` do servidor e o `.htaccess` da raiz.
6. Entre no sistema, selecione o almoxarifado **físico** desejado (não use "Todas as unidades" para registrar movimentos), cadastre funcionário e teste.

## Testes manuais propostos antes de liberar aos usuários

1. Cadastre uma matrícula com zero inicial, por exemplo `000123`, e confirme que a busca por essa matrícula encontra o mesmo funcionário.
2. Tente cadastrar a mesma matrícula de novo; deve ser recusada.
3. Faça uma entrada de 5 ferramentas a R$ 100. Saída com motivo Ferramenta, matrícula e quantidade 2. Confirme saldo 3 e pendência 2.
4. Devolva 1 em boas condições. Confirme saldo 4, pendência 1 e custo de devolução original.
5. Tente devolver 2 quando resta pendência 1; a API deve bloquear.
6. Teste baixa de 1 extraviada pelo Admin com justificativa. A conta deve encerrar; o estoque deve continuar 4.
7. Faça uma entrada de EPIs, depois saída EPI com matrícula, quantidade, CA e substituição. Confirme baixa única no estoque e novo registro na ficha EPI.
8. Troque a função ou setor do funcionário: novos registros devem usar dados atualizados, e relatórios históricos devem preservar o setor original das movimentações.
9. Faça os testes nas unidades corretas; a API deve recusar um funcionário alocado em outra obra para uma saída local.
10. Revise privilégios, backups, relatórios e a ficha de EPI com o responsável de SST antes de uso real. O histórico administrativo **não substitui** recibo assinado ou exigências normativas de SST.

## Observações

- **Não execute `api/schema.sql` novamente** na produção; ele é apenas para instalação nova e já inclui a estrutura atualizada.
- Matrícula é imutável após cadastro para preservar referências. É possível inativar funcionários sem excluir históricos.
- `tool_returns` é a quarta tabela adicional porque a devolução pode ser parcial e ocorrências individuais precisam ser auditadas.
- Se a migração falhar, **não** reexecute às cegas: ela usa DDL com commits implícitos e pode ter aplicado parte do script. Leia a mensagem de erro e confira as tabelas antes de tentar novamente.
- Esta atualização ainda precisa de **teste integrado com seu MySQL e no navegador**; verificação sintática local não comprova funcionamento em produção.

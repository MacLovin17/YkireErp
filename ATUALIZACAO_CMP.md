# Correção de custo médio ponderado - Ykire Estoque 2.0

## Não publicar sem backup! Atualização em servidor existente

1. Faça backup completo do banco `prosegco_dev` pelo phpMyAdmin e guarde-o fora do servidor.
2. Suspenda temporariamente novas movimentações no Ykire.
3. No phpMyAdmin, selecione APENAS o banco `prosegco_dev` e importe **uma única vez** `api/migrations/001_estoque_custo_medio.sql`.
4. Em `public_html/Ykire/api/`, faça backup de `index.php` e substitua por `api/index.php` deste pacote.
5. Não substitua o `config.php` atual, nem seu `.htaccess`.
6. Volte a usar o sistema e teste com valores fictícios em um produto de testes.

### Resultado esperado
10 unidades a R$50 + 5 a R$40 = 15 unidades, R$700 no estoque, CMP exibido ~R$46,67.
O preço aplicado a cada entrada fica gravado no histórico; saídas e transferências usam o CMP do almoxarifado de origem.

### Registro preexistente
A migração recupera automaticamente o valor original apenas para produtos/almoxarifados com histórico **exclusivamente de entradas**, completo e reconciliado com o saldo. Para produtos com saída, ajuste, inventário ou transferência anterior à migração, o valor inicial é **estimado** com base no preço atual do cadastro. Revisar e conciliar esses estoques com os registros de histórico; não editar valores diretamente sem backup e autorização contábil.

### React
A API corrigida devolve `unit_cost` como CMP (sem arredondar prematuramente) e `inventory_value` como valor monetário exato. O React já publicado consegue usar a nova média sem novo build na maior parte das telas. O código React desta entrega inclui as melhorias de exibição exata e o campo de custo de cadastro não editável após criação. Para aplicar essas melhorias visuais será necessário executar `npm install`, `npm run build` e substituir apenas os arquivos estáticos compilados, preservando a API.

### Nota
Esta correção não foi validada com a HostGator nem com dados reais; testar com ambiente de homologação, conferir backups e verificar relatórios antes de produção.

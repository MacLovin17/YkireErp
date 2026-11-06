-- Ykire Estoque - MIGRAÇÃO ÚNICA, EXECUTAR APÓS BACKUP DO MYSQL.
-- Não repita: ADD COLUMN causará erro na segunda execução.
-- Recomenda-se pausar as movimentações até atualizar o index.php.
ALTER TABLE stocks ADD COLUMN stock_value DECIMAL(20,2) NOT NULL DEFAULT 0 AFTER quantity;

-- Estoques já existentes: preserva um valor inicial estimado pelo preço do cadastro.
UPDATE stocks s JOIN products p ON p.id = s.product_id
SET s.stock_value = ROUND(s.quantity * p.unit_cost, 2);

-- Correção automática SEGURA dos estoques cujo histórico contém SOMENTE
-- entradas com custo registrado e cuja quantidade confere com o saldo atual.
-- Para outros estoques, é necessária conciliação do histórico (não inventamos valores).
UPDATE stocks s
JOIN (
       SELECT product_id, warehouse_id,
              SUM(quantity) total_quantity,
              ROUND(SUM(quantity * CAST(JSON_UNQUOTE(JSON_EXTRACT(detail, '$.unit_cost')) AS DECIMAL(18,4))), 2) total_value,
              COUNT(*) events,
              SUM(CASE WHEN type = 'entrada' AND JSON_EXTRACT(detail, '$.unit_cost') IS NOT NULL THEN 1 ELSE 0 END) priced_entries
       FROM movements
       GROUP BY product_id, warehouse_id
) historico ON historico.product_id = s.product_id AND historico.warehouse_id = s.warehouse_id
SET s.stock_value = historico.total_value
WHERE historico.events = historico.priced_entries
       AND s.quantity = historico.total_quantity;

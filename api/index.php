<?php
declare(strict_types=1);
// Single same-origin JSON API; no Base44 dependency.
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');
date_default_timezone_set('America/Sao_Paulo');
$configFile = __DIR__ . '/config.php';
if (!is_file($configFile)) {
  http_response_code(503);
  echo json_encode(['error' => 'API não configurada: crie api/config.php']);
  exit;
}
$config = require $configFile;
session_name($config['session_name'] ?? 'ykire_session');
session_set_cookie_params(['lifetime' => 0, 'path' => '/', 'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off', 'httponly' => true, 'samesite' => 'Lax']);
ini_set('session.use_strict_mode', '1');
session_start();
function respond(mixed $value, int $status = 200): never
{
  http_response_code($status);
  echo json_encode($value, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
  exit;
}
function fail(string $message, int $status = 400): never
{
  respond(['error' => $message], $status);
}
set_exception_handler(function (Throwable $e): void {
  error_log('Ykire API: ' . $e->getMessage());
  if ($e instanceof DomainException)
    fail($e->getMessage(), 422);
  if ($e instanceof PDOException && $e->getCode() === '23000')
    fail('Registro relacionado ou valor duplicado.', 409);
  fail('Falha ao processar solicitação no servidor.', 500);
});
try {
  $db = new PDO($config['dsn'], $config['username'], $config['password'], [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC, PDO::ATTR_EMULATE_PREPARES => false, PDO::ATTR_STRINGIFY_FETCHES => true]);
} catch (Throwable $e) {
  error_log('Ykire DB: ' . $e->getMessage());
  fail('Não foi possível conectar ao MySQL. Confira api/config.php.', 503);
}
function q(string $sql, array $params = []): PDOStatement
{
  global $db;
  $s = $db->prepare($sql);
  $s->execute($params);
  return $s;
}
function one(string $sql, array $params = []): ?array
{
  $r = q($sql, $params)->fetch();
  return $r ?: null;
}
function all(string $sql, array $params = []): array
{
  return q($sql, $params)->fetchAll();
}
function input(): array
{
  $data = json_decode(file_get_contents('php://input'), true);
  if (!is_array($data))
    fail('JSON inválido');
  return $data;
}
function logged(): array
{
  $id = $_SESSION['user_id'] ?? null;
  if (!$id)
    fail('Faça login para continuar.', 401);
  $u = one('SELECT id,username,display_name,role,status,created_date FROM app_users WHERE id=?', [$id]);
  if (!$u || $u['status'] !== 'active') {
    session_destroy();
    fail('Sessão inválida.', 401);
  }
  return $u;
}
function master(array $u): void
{
  if ($u['role'] !== 'master')
    fail('Acesso reservado ao Master.', 403);
}
function admin(array $u): void
{
  if (!in_array($u['role'], ['master', 'admin'], true))
    fail('Permissão de administrador necessária.', 403);
}
function csrf(): string
{
  if (empty($_SESSION['csrf']))
    $_SESSION['csrf'] = bin2hex(random_bytes(32));
  return $_SESSION['csrf'];
}
function secureWrite(string $route): void
{
  if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'GET')
    return;
  $origin = $_SERVER['HTTP_ORIGIN'] ?? null;
  if ($origin) {
    $originHost = parse_url($origin, PHP_URL_HOST);
    $host = explode(':', $_SERVER['HTTP_HOST'] ?? '')[0];
    if (!$originHost || !hash_equals(strtolower($host), strtolower($originHost)))
      fail('Origem não autorizada.', 403);
  }
  if (!in_array($route, ['auth/login', 'setup'], true)) {
    $provided = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    if (!hash_equals(csrf(), $provided))
      fail('Sessão expirada. Atualize a página.', 419);
  }
}
function audit(array $u, string $action, string $entity, string|int|null $id = null, ?int $wh = null, array $details = []): void
{
  q('INSERT INTO audit_logs(user_id,action,entity,entity_id,warehouse_id,details,ip) VALUES(?,?,?,?,?,?,?)', [$u['id'], $action, $entity, (string) $id, $wh, json_encode($details, JSON_UNESCAPED_UNICODE), substr($_SERVER['REMOTE_ADDR'] ?? '', 0, 45)]);
}
function normalize(array $r): array
{
  foreach (['id', 'category_id', 'supplier_id', 'product_id', 'warehouse_id', 'unit_id', 'cost_center_id', 'user_id', 'related_warehouse_id'] as $k) {
    if (isset($r[$k]))
      $r[$k] = (string) $r[$k];
  }
  foreach (['quantity', 'previous_balance', 'new_balance', 'current_balance', 'inventory_value', 'reference_cost', 'unit_cost', 'min_stock', 'max_stock'] as $k) {
    if (isset($r[$k]))
      $r[$k] = (float) $r[$k];
  }
  foreach (['items', 'data', 'detail', 'details'] as $k) {
    if (isset($r[$k]) && is_string($r[$k]))
      $r[$k] = json_decode($r[$k], true) ?? [];
  }
  return $r;
}
function id(mixed $val): int
{
  if (!preg_match('/^[1-9][0-9]*$/', (string) $val))
    fail('Identificador inválido.');
  return (int) $val;
}
function wh(array $u, bool $allowAll = false): ?int
{
  $raw = $_GET['warehouse_id'] ?? ($_POST['warehouse_id'] ?? null);
  if ($raw === 'all' && $allowAll && $u['role'] === 'master')
    return null;
  if ($raw === null || $raw === '') {
    $sql = $u['role'] === 'master' ? 'SELECT w.id FROM warehouses w JOIN units u ON u.id=w.unit_id WHERE u.status="active" ORDER BY (u.kind="sede") DESC,w.id LIMIT 1' : 'SELECT w.id FROM warehouses w JOIN user_units a ON a.unit_id=w.unit_id JOIN units u ON u.id=w.unit_id WHERE a.user_id=? AND u.status="active" ORDER BY w.id LIMIT 1';
    $row = one($sql, $u['role'] === 'master' ? [] : [$u['id']]);
    if (!$row)
      fail('Nenhum almoxarifado autorizado. Cadastre uma unidade ou solicite acesso.', 403);
    return (int) $row['id'];
  }
  $whid = id($raw);
  $row = one('SELECT w.id,u.status,u.id unit_id FROM warehouses w JOIN units u ON u.id=w.unit_id WHERE w.id=?', [$whid]);
  if (!$row || $row['status'] !== 'active')
    fail('Almoxarifado indisponível.', 404);
  if ($u['role'] !== 'master' && !one('SELECT 1 FROM user_units WHERE user_id=? AND unit_id=?', [$u['id'], $row['unit_id']]))
    fail('Você não tem permissão nessa unidade.', 403);
  return $whid;
}
function whAccess(array $u, int $warehouseId): int
{
  $original = $_GET['warehouse_id'] ?? null;
  $_GET['warehouse_id'] = (string) $warehouseId;
  try {
    $found = wh($u);
    return $found;
  } finally {
    if ($original === null)
      unset($_GET['warehouse_id']);
    else
      $_GET['warehouse_id'] = $original;
  }
}
function unitAllowed(array $u, int $unitId): void
{
  if ($u['role'] !== 'master' && !one('SELECT 1 FROM user_units WHERE user_id=? AND unit_id=?', [$u['id'], $unitId]))
    fail('Unidade sem permissão.', 403);
}
// CPF é dado pessoal. Persistir somente dígitos e validar antes de emitir certificados.
function normalizedCpf(mixed $value): ?string
{
  $cpf = preg_replace('/\D+/', '', trim((string) ($value ?? '')));
  if ($cpf === '')
    return null;
  if (strlen($cpf) !== 11 || preg_match('/^(\d)\1{10}$/', $cpf))
    fail('CPF inválido: informe 11 dígitos válidos.', 422);
  for ($t = 9; $t < 11; $t++) {
    $sum = 0;
    for ($i = 0; $i < $t; $i++)
      $sum += (int) $cpf[$i] * ($t + 1 - $i);
    $d = ($sum * 10) % 11;
    if ($d === 10)
      $d = 0;
    if ($d !== (int) $cpf[$t])
      fail('CPF inválido: verifique os dígitos.', 422);
  }
  return $cpf;
}
function maskCpf(?string $cpf): string
{
  return $cpf ? substr($cpf, 0, 3) . '.***.***-' . substr($cpf, -2) : 'Não informado';
}
// Empresa que ministra treinamento: CPF do colaborador nunca é enviado a esta listagem.
function cnpjEmpresa(mixed $value): ?string
{
  $digits = preg_replace('/\D+/', '', trim((string) ($value ?? '')));
  if ($digits === '')
    return null;
  if (strlen($digits) !== 14 || preg_match('/^(\d)\1{13}$/', $digits))
    fail('CNPJ inválido.', 422);
  $weights = [[5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2], [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]];
  foreach ($weights as $i => $w) {
    $sum = 0;
    foreach ($w as $pos => $weight)
      $sum += (int) $digits[$pos] * $weight;
    $mod = $sum % 11;
    $digit = $mod < 2 ? 0 : 11 - $mod;
    if ((int) $digits[12 + $i] !== $digit)
      fail('CNPJ inválido: confira os dígitos verificadores.', 422);
  }
  return $digits;
}
function dadosEmpresaTreinamento(array $data): array
{
  $name = trim((string) ($data['legal_name'] ?? ''));
  $trade = trim((string) ($data['trade_name'] ?? ''));
  if (mb_strlen($name) < 3 || mb_strlen($name) > 180)
    fail('Informe a razão social (3 a 180 caracteres).', 422);
  if (mb_strlen($trade) > 180)
    fail('Nome fantasia muito longo.', 422);
  return ['legal_name' => $name, 'trade_name' => $trade !== '' ? $trade : null, 'cnpj' => cnpjEmpresa($data['cnpj'] ?? null)];
}

function employeeExtras(array $data, ?array $old = null): array
{
  // Extra fields are optional; PATCH-like preservation for older React builds.
  $limits = ['rg' => 32, 'uniform_size' => 10, 'address_street' => 180, 'address_number' => 20, 'address_complement' => 100, 'address_neighborhood' => 100, 'address_city' => 100];
  $out = [];
  foreach ($limits as $key => $limit) {
    $v = trim((string) ($data[$key] ?? ($old[$key] ?? '')));
    if (mb_strlen($v) > $limit)
      fail('Campo ' . $key . ' excede o limite permitido.', 422);
    $out[$key] = $v !== '' ? $v : null;
  }
  $cnh = strtoupper(trim((string) ($data['cnh_category'] ?? ($old['cnh_category'] ?? ''))));
  if ($cnh !== '' && !in_array($cnh, ['A', 'B', 'C', 'D', 'E', 'AB', 'AC', 'AD', 'AE'], true))
    fail('Categoria de CNH inválida.', 422);
  $out['cnh_category'] = $cnh !== '' ? $cnh : null;
  $uniform = strtoupper((string) ($out['uniform_size'] ?? ''));
  if ($uniform !== '' && !in_array($uniform, ['PP', 'P', 'M', 'G', 'GG', 'XG', 'XXG', 'EXG'], true))
    fail('Tamanho de uniforme inválido.', 422);
  $out['uniform_size'] = $uniform !== '' ? $uniform : null;
  $boot = array_key_exists('boot_size', $data) ? $data['boot_size'] : ($old['boot_size'] ?? null);
  if ($boot !== null && $boot !== '') {
    if (!preg_match('/^\d{2}$/', (string) $boot) || (int) $boot < 30 || (int) $boot > 50)
      fail('Numeração da bota deve estar entre 30 e 50.', 422);
    $out['boot_size'] = (int) $boot;
  } else
    $out['boot_size'] = null;
  $cep = preg_replace('/\D+/', '', (string) ($data['address_postal_code'] ?? ($old['address_postal_code'] ?? '')));
  if ($cep !== '' && strlen($cep) !== 8)
    fail('CEP deve conter 8 dígitos.', 422);
  $out['address_postal_code'] = $cep !== '' ? $cep : null;
  $state = strtoupper(trim((string) ($data['address_state'] ?? ($old['address_state'] ?? ''))));
  if ($state !== '' && !preg_match('/^[A-Z]{2}$/', $state))
    fail('UF inválida.', 422);
  $out['address_state'] = $state !== '' ? $state : null;
  return $out;
}
// Dados pessoais e contratuais mantidos apenas no detalhe autorizado do RH.
function employeeEmploymentExtras(array $data, ?array $old = null): array
{
  $out = [];
  foreach (['birth_date', 'admission_date'] as $key) {
    $value = trim((string) ($data[$key] ?? ($old[$key] ?? '')));
    if ($value !== '') {
      $date = DateTimeImmutable::createFromFormat('!Y-m-d', $value);
      if (!$date || $date->format('Y-m-d') !== $value)
        fail('Data inválida: ' . $key, 422);
      if ($key === 'birth_date' && $value > date('Y-m-d'))
        fail('Nascimento não pode ser no futuro.', 422);
    }
    $out[$key] = $value ?: null;
  }
  $pis = preg_replace('/\D+/', '', (string) ($data['pis'] ?? ($old['pis'] ?? '')));
  if ($pis !== '' && strlen($pis) !== 11)
    fail('PIS/PASEP deve conter 11 dígitos.', 422);
  $out['pis'] = $pis ?: null;
  foreach (['ctps_number' => 25, 'ctps_series' => 20, 'birthplace' => 120, 'employee_category' => 60] as $key => $max) {
    $val = trim((string) ($data[$key] ?? ($old[$key] ?? '')));
    if (mb_strlen($val) > $max)
      fail('Campo ' . $key . ' excede o tamanho permitido.', 422);
    $out[$key] = $val !== '' ? $val : null;
  }
  $cbo = preg_replace('/\D+/', '', (string) ($data['cbo'] ?? ($old['cbo'] ?? '')));
  if ($cbo !== '' && strlen($cbo) !== 6)
    fail('CBO deve conter 6 dígitos.', 422);
  $out['cbo'] = $cbo ?: null;
  return $out;
}
function hrCatalogSelection(array $d, string $field, string $table): array
{
  $id = id($d[$field] ?? null);
  $record = one('SELECT id,name FROM ' . $table . ' WHERE id=? AND status="active"', [$id]);
  if (!$record)
    fail('Escolha um cadastro ativo e válido para ' . $field . '.', 422);
  return $record;
}
function employeeDependents(mixed $data): array
{
  if (!is_array($data) || count($data) > 20)
    fail('Informe no máximo 20 dependentes.', 422);
  $items = [];
  foreach ($data as $entry) {
    if (!is_array($entry))
      fail('Dependente inválido.', 422);
    $name = trim((string) ($entry['full_name'] ?? ''));
    $relation = trim((string) ($entry['relationship'] ?? ''));
    if ($name === '' || mb_strlen($name) > 180 || $relation === '' || mb_strlen($relation) > 50)
      fail('Informe nome e vínculo de cada dependente.', 422);
    $dob = trim((string) ($entry['date_of_birth'] ?? ''));
    if ($dob !== '') {
      $dt = DateTimeImmutable::createFromFormat('!Y-m-d', $dob);
      if (!$dt || $dt->format('Y-m-d') !== $dob || $dob > date('Y-m-d'))
        fail('Data de nascimento do dependente inválida.', 422);
    }
    $items[] = [$name, $relation, $dob !== '' ? $dob : null];
  }
  return $items;
}
function saveEmployeeDependents(int $id, array $rows): void
{
  // Executado sempre na transação do cadastro do funcionário.
  q('DELETE FROM employee_dependents WHERE employee_id=?', [$id]);
  foreach ($rows as $row)
    q('INSERT INTO employee_dependents(employee_id,full_name,relationship,date_of_birth) VALUES(?,?,?,?)', [$id, ...$row]);
}

function qty(mixed $number, bool $positive = true): float
{
  if (!is_numeric($number))
    fail('Quantidade inválida.');
  $n = (float) $number;
  if (!is_finite($n) || ($positive && $n <= 0) || $n < 0 || round($n, 3) != $n)
    fail('Quantidade inválida (até 3 casas decimais).');
  return $n;
}
// A autorização de módulos acontece no backend em todas as rotas protegidas.
const ERP_MODULES = ['rh', 'estoque', 'ssma', 'adm'];
function modulesFor(array $u): array
{
  if ($u['role'] === 'master')
    return ERP_MODULES;
  $keys = array_column(all('SELECT module_key FROM user_modules WHERE user_id=? ORDER BY module_key', [$u['id']]), 'module_key');
  return $u['role'] === 'comum' ? array_values(array_diff($keys, ['adm'])) : $keys;
}
function requireModule(array $u, string $key): void
{
  if (!in_array($key, ERP_MODULES, true))
    fail('Módulo inválido.', 403);
  if ($key === 'adm')
    admin($u);
  if ($u['role'] !== 'master' && !one('SELECT 1 FROM user_modules WHERE user_id=? AND module_key=?', [$u['id'], $key]))
    fail('Sem acesso ao módulo solicitado.', 403);
}
function requireOneModule(array $u, array $keys): void
{
  if ($u['role'] === 'master')
    return;
  foreach ($keys as $key) {
    if (one('SELECT 1 FROM user_modules WHERE user_id=? AND module_key=?', [$u['id'], $key]))
      return;
  }
  fail('Sem acesso ao módulo solicitado.', 403);
}
function userInfo(array $u): array
{
  if ($u['role'] !== 'master')
    $u['unit_ids'] = array_column(all('SELECT unit_id FROM user_units WHERE user_id=?', [$u['id']]), 'unit_id');
  else
    $u['unit_ids'] = [];
  $u['module_keys'] = modulesFor($u);
  return normalize($u);
}
// Quantidade e valor monetário do saldo são sempre alterados juntos, sob lock InnoDB.
// O valor armazenado, não a multiplicação de um CMP arredondado, é a fonte da verdade.
function stockRow(int $pid, int $wid): array
{
  q('INSERT IGNORE INTO stocks(product_id,warehouse_id,quantity,stock_value) VALUES(?,?,0,0)', [$pid, $wid]);
  return one('SELECT quantity,stock_value FROM stocks WHERE product_id=? AND warehouse_id=? FOR UPDATE', [$pid, $wid]);
}
function stockChange(int $pid, int $wid, float $delta, ?float $incomingCost = null, ?float $incomingValue = null): array
{
  if (abs($delta) < 0.0000001)
    fail('Movimentação de valor zero não permitida.');
  $row = stockRow($pid, $wid);
  $old = (float) $row['quantity'];
  $oldValue = (float) $row['stock_value'];
  $new = round($old + $delta, 3);
  if ($new < 0)
    fail('Saldo insuficiente no almoxarifado selecionado.', 409);
  if ($delta > 0) {
    if ($incomingValue === null) {
      if ($incomingCost === null)
        fail('Custo da entrada não informado.');
      if (!is_finite($incomingCost) || $incomingCost < 0)
        fail('Custo inválido.');
      $changeValue = round($delta * $incomingCost, 2);
    } else {
      if (!is_finite($incomingValue) || $incomingValue < 0)
        fail('Valor transferido inválido.');
      $changeValue = round($incomingValue, 2);
    }
    $newValue = round($oldValue + $changeValue, 2);
  } else {
    // Custo médio móvel da origem. Para saldo zerado, descarrega todo o valor residual.
    $changeValue = $new === 0 ? round($oldValue, 2) : round($oldValue * abs($delta) / $old, 2);
    $newValue = $new === 0 ? 0 : round($oldValue - $changeValue, 2);
  }
  q('UPDATE stocks SET quantity=?,stock_value=? WHERE product_id=? AND warehouse_id=?', [$new, $newValue, $pid, $wid]);
  $unitCost = round($changeValue / abs($delta), 8);
  return [$old, $new, $oldValue, $newValue, $changeValue, $unitCost];
}
function movementRow(array $u, array $p, int $wid, string $type, float $amount, float $old, float $new, array $data = [], ?int $related = null, ?string $ref = null, ?int $cc = null, ?int $employeeId = null): array
{
  $detail = $data;
  unset($detail['user'], $detail['password']);
  $detail['unit_cost'] = isset($data['_cost_applied']) ? (float) $data['_cost_applied'] : (isset($data['unit_cost']) && $data['unit_cost'] !== null && $data['unit_cost'] !== '' ? (float) $data['unit_cost'] : (float) $p['unit_cost']);
  if (isset($data['_value_moved']))
    $detail['total_cost'] = (float) $data['_value_moved'];
  if (isset($data['_value_before']))
    $detail['stock_value_before'] = (float) $data['_value_before'];
  if (isset($data['_value_after']))
    $detail['stock_value_after'] = (float) $data['_value_after'];
  unset($detail['_cost_applied'], $detail['_value_moved'], $detail['_value_before'], $detail['_value_after']);
  $date = isset($data['date']) && strtotime((string) $data['date']) !== false ? date('Y-m-d H:i:s', strtotime((string) $data['date'])) : date('Y-m-d H:i:s');
  q('INSERT INTO movements(product_id,warehouse_id,related_warehouse_id,transfer_ref,type,quantity,previous_balance,new_balance,cost_center_id,user_id,employee_id,date,detail) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)', [$p['id'], $wid, $related, $ref, $type, $amount, $old, $new, $cc, $u['id'], $employeeId, $date, json_encode($detail, JSON_UNESCAPED_UNICODE)]);
  $mid = (int) $GLOBALS['db']->lastInsertId();
  q('UPDATE products SET last_movement_date=NOW() WHERE id=?', [$p['id']]);
  audit($u, $type, 'Movement', $mid, $wid, ['product_id' => $p['id'], 'quantity' => $amount, 'from' => $old, 'to' => $new, 'related_warehouse_id' => $related]);
  return ['id' => (string) $mid, 'new_balance' => $new, 'previous_balance' => $old];
}
function product(int $pid): array
{
  $p = one('SELECT * FROM products WHERE id=?', [$pid]);
  if (!$p)
    fail('Produto não encontrado.', 404);
  return $p;
}
function employeeForIssue(array $u, array $data, int $wid, bool $required): ?array
{
  $registration = trim((string) ($data['employee_registration'] ?? ''));
  if ($registration === '') {
    if ($required)
      fail('Informe a matrícula do funcionário para a entrega de EPI ou ferramenta.');
    return null;
  }
  $employee = one('SELECT e.* FROM employees e WHERE e.registration=?', [$registration]);
  if (!$employee || $employee['status'] !== 'active')
    fail('Matrícula inexistente ou funcionário inativo.', 422);
  $unit = one('SELECT unit_id FROM warehouses WHERE id=?', [$wid]);
  if ((int) $employee['unit_id'] !== (int) $unit['unit_id'])
    fail('Funcionário não está vinculado à unidade deste almoxarifado.', 422);
  unitAllowed($u, (int) $employee['unit_id']);
  return $employee;
}
function movementOp(array $u, string $type, array $data): array
{
  global $db;
  $wid = wh($u);
  $pid = id($data['product_id'] ?? '');
  $amount = qty($data['quantity'] ?? null);
  $db->beginTransaction();
  try {
    $p = product($pid);
    if ($p['status'] !== 'active')
      fail('Produto inativo.');
    $cc = empty($data['cost_center_id']) ? null : id($data['cost_center_id']);
    $reason = (string) ($data['exit_reason'] ?? 'consumo_interno');
    $employee = null;
    if ($type === 'saida') {
      if (!in_array($reason, ['consumo_interno', 'requisicao', 'devolucao', 'outros', 'epi', 'ferramenta'], true))
        fail('Motivo de saída inválido.');
      $tracked = in_array($reason, ['epi', 'ferramenta'], true);
      $employee = employeeForIssue($u, $data, $wid, $tracked);
      $destination = $data['destination_type'] ?? 'centro_custo';
      if (!in_array($destination, ['centro_custo', 'empresa'], true))
        fail('Destino de saída inválido.');
      if ($tracked && $destination === 'empresa')
        fail('Entrega de EPI ou ferramenta precisa estar vinculada ao funcionário, não a uma empresa externa.');
      if ($destination === 'centro_custo' && !$cc && !$tracked)
        fail('Informe o centro de custo que consumiu o material.');
      if ($destination === 'empresa' && !trim((string) ($data['company_name'] ?? '')))
        fail('Informe o nome da empresa atendida.');
      if ($destination === 'empresa')
        $cc = null;
      if ($employee) {
        // Never trust employee name, department or function sent from the browser.
        $data['employee'] = $employee['full_name'];
        $data['employee_registration'] = $employee['registration'];
        $data['employee_function'] = $employee['job_title'];
        $data['department'] = $employee['department'];
        if (!$cc && $employee['cost_center_id'] && $destination === 'centro_custo')
          $cc = (int) $employee['cost_center_id'];
      } else {
        unset($data['employee_registration'], $data['employee'], $data['employee_function'], $data['department']);
      }
    }
    if ($cc) {
      $unit = one('SELECT unit_id FROM warehouses WHERE id=?', [$wid]);
      if (!one('SELECT id FROM cost_centers WHERE id=? AND unit_id=? AND status="active"', [$cc, $unit['unit_id']]))
        fail('Centro de custo inválido para a unidade.', 422);
    }
    $cost = null;
    if ($type === 'entrada') {
      // Sem preço informado: mantém o custo médio do local (ou a referência no primeiro recebimento).
      $existing = stockRow($pid, $wid);
      $fallback = (float) $existing['quantity'] > 0 ? (float) $existing['stock_value'] / (float) $existing['quantity'] : (float) $p['unit_cost'];
      $cost = ($data['unit_cost'] ?? null) !== null && $data['unit_cost'] !== '' ? $data['unit_cost'] : $fallback;
      if (!is_numeric($cost) || !is_finite((float) $cost) || (float) $cost < 0)
        fail('Custo inválido.');
      $cost = (float) $cost;
    }
    [$old, $new, $before, $after, $value, $appliedCost] = stockChange($pid, $wid, $type === 'entrada' ? $amount : -$amount, $cost);
    $data['_cost_applied'] = $appliedCost;
    $data['_value_moved'] = $value;
    $data['_value_before'] = $before;
    $data['_value_after'] = $after;
    $m = movementRow($u, $p, $wid, $type, $amount, $old, $new, $data, null, null, $cc, $employee ? (int) $employee['id'] : null);
    if ($type === 'saida' && $employee && $reason === 'ferramenta') {
      q('INSERT INTO tool_assignments(employee_id,movement_id,product_id,warehouse_id,issued_quantity,issued_value,issued_at) VALUES(?,?,?,?,?,?,(SELECT date FROM movements WHERE id=?))', [
        $employee['id'],
        $m['id'],
        $pid,
        $wid,
        $amount,
        $value,
        $m['id']
      ]);
      audit($u, 'issue', 'ToolAssignment', $db->lastInsertId(), $wid, ['employee_registration' => $employee['registration'], 'movement_id' => $m['id']]);
    }
    if ($type === 'saida' && $employee && $reason === 'epi') {
      $ca = trim((string) ($data['ca_number'] ?? ''));
      $replace = trim((string) ($data['replacement_reason'] ?? ''));
      if (strlen($ca) > 55 || strlen($replace) > 180)
        fail('CA ou motivo de substituição muito longo.');
      q('INSERT INTO epi_deliveries(employee_id,movement_id,product_id,warehouse_id,quantity,delivery_value,ca_number,replacement_reason,delivered_at) VALUES(?,?,?,?,?,?,?,?,(SELECT date FROM movements WHERE id=?))', [
        $employee['id'],
        $m['id'],
        $pid,
        $wid,
        $amount,
        $value,
        $ca,
        $replace,
        $m['id']
      ]);
      audit($u, 'deliver', 'EpiDelivery', $db->lastInsertId(), $wid, ['employee_registration' => $employee['registration'], 'movement_id' => $m['id']]);
    }
    $db->commit();
    return $m;
  } catch (Throwable $e) {
    if ($db->inTransaction())
      $db->rollBack();
    throw $e;
  }
}
function transfer(array $u, array $data): array
{
  global $db;
  $from = wh($u);
  $to = id($data['destination_warehouse_id'] ?? '');
  whAccess($u, $to);
  if ($from === $to)
    fail('Origem e destino devem ser diferentes.');
  $pid = id($data['product_id'] ?? '');
  $amount = qty($data['quantity'] ?? null);
  $db->beginTransaction();
  try {
    $p = product($pid);
    if ($p['status'] !== 'active')
      fail('Produto inativo.');
    // Avoid lock inversion: both balances acquired in warehouse-id order.
    $sorted = [$from, $to];
    sort($sorted, SORT_NUMERIC);
    foreach ($sorted as $w)
      stockRow($pid, $w);
    [$a, $b, $sourceBefore, $sourceAfter, $movedValue, $sourceCost] = stockChange($pid, $from, -$amount);
    [$c, $d, $destBefore, $destAfter, $receivedValue, $destCost] = stockChange($pid, $to, $amount, null, $movedValue);
    $ref = bin2hex(random_bytes(12));
    $out = movementRow($u, $p, $from, 'transferencia_saida', $amount, $a, $b, array_merge($data, ['_cost_applied' => $sourceCost, '_value_moved' => $movedValue, '_value_before' => $sourceBefore, '_value_after' => $sourceAfter]), $to, $ref);
    $in = movementRow($u, $p, $to, 'transferencia_entrada', $amount, $c, $d, array_merge($data, ['_cost_applied' => $destCost, '_value_moved' => $receivedValue, '_value_before' => $destBefore, '_value_after' => $destAfter]), $from, $ref);
    $db->commit();
    return ['out' => $out, 'in' => $in, 'transfer_ref' => $ref];
  } catch (Throwable $e) {
    if ($db->inTransaction())
      $db->rollBack();
    throw $e;
  }
}
$route = trim((string) ($_GET['route'] ?? ''), '/');
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
secureWrite($route);
if ($route === 'setup') {
  if ($method !== 'POST')
    fail('Método inválido', 405);
  $data = input();
  $key = $config['setup_key'] ?? '';
  if (strlen($key) < 32 || str_contains($key, 'SUBSTITUA_') || !hash_equals($key, (string) ($data['setup_key'] ?? '')))
    fail('Chave de instalação inválida.', 403);
  if (one('SELECT 1 FROM app_users LIMIT 1'))
    fail('Instalação já efetuada. Desative a chave de instalação.', 409);
  $password = (string) ($data['password'] ?? '');
  if (strlen($password) < 12)
    fail('A senha Master deve ter pelo menos 12 caracteres.');
  $db->beginTransaction();
  try {
    q('INSERT INTO units(name,kind) VALUES(?,"sede")', [(string) ($data['sede_name'] ?? 'Sede Administrativa')]);
    $uid = (int) $db->lastInsertId();
    q('INSERT INTO warehouses(unit_id,name) VALUES(?,?)', [$uid, 'Almoxarifado da Sede']);
    q('INSERT INTO app_users(username,display_name,password_hash,role) VALUES(?,?,?,"master")', [(string) ($data['username'] ?? 'Master'), 'Administrador Master', password_hash($password, PASSWORD_DEFAULT)]);
    $db->commit();
    respond(['message' => 'Sede, almoxarifado e Master criados. Remova a chave de instalação de api/config.php.']);
  } catch (Throwable $e) {
    $db->rollBack();
    throw $e;
  }
}
if ($route === 'auth/login') {
  if ($method !== 'POST')
    fail('Método inválido', 405);
  $d = input();
  $username = trim((string) ($d['username'] ?? ''));
  $password = (string) ($d['password'] ?? '');
  // account + IP rolling failure window
  q('DELETE FROM login_attempts WHERE created_at < NOW() - INTERVAL 15 MINUTE');
  $fingerprint = hash('sha256', strtolower($username) . '|' . ($_SERVER['REMOTE_ADDR'] ?? ''));
  $tries = one('SELECT COUNT(*) n FROM login_attempts WHERE fingerprint=?', [$fingerprint]);
  if ((int) $tries['n'] >= 5)
    fail('Muitas tentativas. Tente novamente em 15 minutos.', 429);
  $record = one('SELECT * FROM app_users WHERE LOWER(username)=LOWER(?) AND status="active"', [$username]);
  if (!$record || !password_verify($password, $record['password_hash'])) {
    q('INSERT INTO login_attempts(fingerprint) VALUES(?)', [$fingerprint]);
    fail('Usuário ou senha inválidos.', 401);
  }
  q('DELETE FROM login_attempts WHERE fingerprint=?', [$fingerprint]);
  session_regenerate_id(true);
  $_SESSION['user_id'] = $record['id'];
  $_SESSION['csrf'] = bin2hex(random_bytes(32));
  unset($record['password_hash']);
  respond(['user' => userInfo($record), 'csrf' => csrf()]);
}
if ($route === 'auth/me') {
  $u = logged();
  respond(['user' => userInfo($u), 'csrf' => csrf()]);
}
if ($route === 'auth/logout') {
  logged();
  $_SESSION = [];
  session_destroy();
  respond(['ok' => true]);
}
$u = logged();
// SSMA/PGR — conteúdo técnico cadastrado e aprovado por pessoa habilitada; não cria laudo automaticamente.
if (str_starts_with($route, 'pgr/')) {
  requireModule($u, 'ssma');
  // Homologacao 015: leitura privada do modelo Fagundes, inclusive por TST com acesso ao SSMA.
  // Arquivos fisicos ficam fora de public_html; NUNCA publicar os documentos em dist/assets.
  if ($route === 'pgr/homologacao/info' || $route === 'pgr/homologacao/file') {
    if ($method !== 'GET')
      fail('Método inválido.', 405);
    $sampleDir = dirname(__DIR__, 3) . '/ykire_pgr_homologacao_015';
    $sampleFiles = [
      'amostra_pdf' => ['filename' => 'PGR_FAGUNDES_AMOSTRA_FIEL_EDITAVEL_015.pdf', 'type' => 'application/pdf', 'label' => 'Amostra de 4 páginas em PDF'],
      'amostra_word' => ['filename' => 'PGR_FAGUNDES_AMOSTRA_FIEL_EDITAVEL_015.docx', 'type' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'label' => 'Amostra editável em Word'],
      'comparativo_pdf' => ['filename' => 'PGR_FAGUNDES_COMPARATIVO_VISUAL_015.pdf', 'type' => 'application/pdf', 'label' => 'Comparativo original x amostra'],
      'referencia_pdf' => ['filename' => 'PGR_FAGUNDES_ORIGINAL_119_PAGINAS.pdf', 'type' => 'application/pdf', 'label' => 'PGR original de 119 páginas'],
    ];
    if ($route === 'pgr/homologacao/info') {
      $available = [];
      foreach ($sampleFiles as $key => $meta) {
        $file = $sampleDir . '/' . $meta['filename'];
        $available[$key] = ['label' => $meta['label'], 'available' => is_file($file), 'size' => is_file($file) ? filesize($file) : 0];
      }
      respond(['version' => '015', 'status' => 'em_homologacao', 'sample_pages' => 4, 'reference_pages' => 119, 'files' => $available]);
    }
    $key = (string) ($_GET['key'] ?? '');
    if (!array_key_exists($key, $sampleFiles))
      fail('Arquivo de homologação inválido.', 404);
    $meta = $sampleFiles[$key];
    $file = $sampleDir . '/' . $meta['filename'];
    if (!is_file($file) || !is_readable($file))
      fail('Arquivo de homologação não instalado na pasta privada. Consulte as instruções da atualização 016.', 404);
    // Conteudo binario: sobrescrever cabeçalho JSON padrao da API.
    audit($u, 'view', 'PGRHomologacao015', $key, null, ['filename' => $meta['filename']]);
    header_remove('Content-Type');
    header('Content-Type: ' . $meta['type']);
    header('Content-Length: ' . filesize($file));
    header('Content-Disposition: ' . ($key === 'amostra_word' ? 'attachment' : 'inline') . '; filename="' . $meta['filename'] . '"');
    header('X-Content-Type-Options: nosniff');
    header('Cache-Control: no-store, private');
    header("Content-Security-Policy: frame-ancestors 'self'");
    readfile($file);
    exit;
  }
  admin($u);
  if ($route === 'pgr/options') {
    if ($method !== 'GET')
      fail('Método inválido.', 405);
    $companies = all('SELECT id,legal_name,trade_name,cnpj FROM hr_companies WHERE status="active" ORDER BY legal_name');
    $units = all('SELECT u.id,u.name,u.kind FROM units u ' . ($u['role'] === 'master' ? '' : 'JOIN user_units uu ON uu.unit_id=u.id AND uu.user_id=' . (int) $u['id']) . ' WHERE u.status="active" ORDER BY u.kind DESC,u.name');
    $roles = all('SELECT id,name FROM hr_job_roles WHERE status="active" ORDER BY name');
    respond(['companies' => $companies, 'units' => $units, 'roles' => $roles]);
  }
  if ($route === 'pgr/list') {
    if ($method !== 'GET')
      fail('Método inválido.', 405);
    $sql = 'SELECT p.id,p.title,p.contract_number,p.status,p.revision,p.start_on,p.end_on,p.updated_at,c.legal_name company_name,u.name unit_name FROM pgr_documents p JOIN hr_companies c ON c.id=p.hr_company_id JOIN units u ON u.id=p.unit_id ';
    $params = [];
    if ($u['role'] !== 'master') {
      $sql .= ' JOIN user_units au ON au.unit_id=p.unit_id AND au.user_id=? ';
      $params[] = $u['id'];
    }
    $sql .= ' ORDER BY p.updated_at DESC,p.id DESC LIMIT 300';
    respond(all($sql, $params));
  }
  if ($route === 'pgr/document') {
    if ($method === 'GET') {
      $doc = one('SELECT * FROM pgr_documents WHERE id=?', [id($_GET['id'] ?? null)]);
      if (!$doc)
        fail('PGR não encontrado.', 404);
      unitAllowed($u, (int) $doc['unit_id']);
      $doc['content'] = json_decode($doc['content_json'], true) ?: [];
      unset($doc['content_json']);
      respond($doc);
    }
    if (!in_array($method, ['POST', 'PUT'], true))
      fail('Método inválido.', 405);
    $d = input();
    $c = $d['content'] ?? null;
    if (!is_array($c))
      fail('Conteúdo inválido.', 422);
    $encoded = json_encode($c, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    if ($encoded === false || strlen($encoded) > 300000)
      fail('Documento muito extenso (máximo 300 KB de texto).', 422);
    $companyId = id($d['hr_company_id'] ?? null);
    $unitId = id($d['unit_id'] ?? null);
    unitAllowed($u, $unitId);
    if (!one('SELECT id FROM hr_companies WHERE id=? AND status="active"', [$companyId]))
      fail('Empresa não cadastrada ou inativa.', 422);
    $title = trim((string) ($d['title'] ?? ''));
    if (mb_strlen($title) < 3 || mb_strlen($title) > 180)
      fail('Título de 3 a 180 caracteres obrigatório.', 422);
    $contract = trim((string) ($d['contract_number'] ?? ''));
    if (mb_strlen($contract) > 100)
      fail('Número do contrato muito longo.', 422);
    $start = asoDate($d['start_on'] ?? null, 'Início da vigência');
    $end = asoDate($d['end_on'] ?? null, 'Fim da vigência');
    if ($start && $end && $end < $start)
      fail('Fim da vigência anterior ao início.', 422);
    $status = (string) ($d['status'] ?? 'draft');
    if (!in_array($status, ['draft', 'review', 'validated'], true))
      fail('Situação de PGR inválida.', 422);
    // Não é permitido classificar como validado apenas clicando em um botão sem conteúdo técnico e confirmação.
    if ($status === 'validated') {
      if (empty($d['technical_review_confirmed']))
        fail('Confirme a avaliação técnica antes de marcar como validado.', 422);
      if (empty(trim((string) ($c['technician_name'] ?? ''))) || empty(trim((string) ($c['technician_registration'] ?? ''))) || empty($c['risks']) || !is_array($c['risks']) || empty(trim((string) ($c['methodology'] ?? ''))))
        fail('Informe responsável, registro profissional, metodologia e inventário de riscos antes da validação.', 422);
    }
    $db->beginTransaction();
    try {
      if ($method === 'POST') {
        q('INSERT INTO pgr_documents(hr_company_id,unit_id,title,contract_number,start_on,end_on,status,revision,content_json,created_by,updated_by,validated_by,validated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)', [$companyId, $unitId, $title, $contract ?: null, $start, $end, $status, 1, $encoded, $u['id'], $u['id'], $status === 'validated' ? $u['id'] : null, $status === 'validated' ? date('Y-m-d H:i:s') : null]);
        $pid = (int) $db->lastInsertId();
        $rev = 1;
      } else {
        $pid = id($d['id'] ?? null);
        $old = one('SELECT id,unit_id,status,revision FROM pgr_documents WHERE id=? FOR UPDATE', [$pid]);
        if (!$old)
          fail('PGR não encontrado.', 404);
        unitAllowed($u, (int) $old['unit_id']);
        if ($old['status'] === 'validated')
          fail('Documento validado é imutável. Crie uma nova versão por duplicação.', 409);
        if ((int) ($d['revision'] ?? 0) !== (int) $old['revision'])
          fail('O documento mudou desde a última edição. Atualize a página antes de salvar.', 409);
        $rev = (int) $old['revision'] + 1;
        q('UPDATE pgr_documents SET hr_company_id=?,unit_id=?,title=?,contract_number=?,start_on=?,end_on=?,status=?,revision=?,content_json=?,updated_by=?,validated_by=?,validated_at=? WHERE id=?', [$companyId, $unitId, $title, $contract ?: null, $start, $end, $status, $rev, $encoded, $u['id'], $status === 'validated' ? $u['id'] : null, $status === 'validated' ? date('Y-m-d H:i:s') : null, $pid]);
      }
      q('INSERT INTO pgr_document_versions(document_id,revision,snapshot_json,status,changed_by) VALUES(?,?,?,?,?)', [$pid, $rev, json_encode(['title' => $title, 'hr_company_id' => $companyId, 'unit_id' => $unitId, 'contract_number' => $contract, 'start_on' => $start, 'end_on' => $end, 'content' => $c], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE), $status, $u['id']]);
      audit($u, $method === 'POST' ? 'create' : 'update', 'PGRDocument', $pid, null, ['status' => $status, 'revision' => $rev]);
      $db->commit();
      respond(['id' => (string) $pid, 'revision' => $rev, 'status' => $status], $method === 'POST' ? 201 : 200);
    } catch (Throwable $e) {
      if ($db->inTransaction())
        $db->rollBack();
      throw $e;
    }
  }
  fail('Rota PGR não encontrada.', 404);
}
if ($route === 'org/units') {
  if ($method === 'GET') {
    $units = all('SELECT u.*,w.id warehouse_id,w.name warehouse_name FROM units u JOIN warehouses w ON w.unit_id=u.id ' . ($u['role'] === 'master' ? '' : 'JOIN user_units a ON a.unit_id=u.id AND a.user_id=' . (int) $u['id']) . ' ORDER BY (u.kind="sede") DESC,u.name');
    respond(array_map('normalize', $units));
  }
  requireModule($u, 'adm');
  master($u);
  $d = input();
  $name = trim((string) ($d['name'] ?? ''));
  if (!$name)
    fail('Nome da obra obrigatório.');
  if ($method === 'POST') {
    $db->beginTransaction();
    try {
      q('INSERT INTO units(name,kind) VALUES(?,"obra")', [$name]);
      $id = (int) $db->lastInsertId();
      q('INSERT INTO warehouses(unit_id,name) VALUES(?,?)', [$id, 'Almoxarifado — ' . $name]);
      audit($u, 'create', 'Unit', $id);
      $db->commit();
      respond(['id' => (string) $id], 201);
    } catch (Throwable $e) {
      $db->rollBack();
      throw $e;
    }
  }
  if ($method === 'PUT') {
    $id = id($d['id'] ?? null);
    if (!one('SELECT 1 FROM units WHERE id=?', [$id]))
      fail('Unidade não encontrada.', 404);
    $status = in_array($d['status'] ?? 'active', ['active', 'inactive'], true) ? $d['status'] : 'active';
    q('UPDATE units SET name=?,status=? WHERE id=?', [$name, $status, $id]);
    audit($u, 'update', 'Unit', $id);
    respond(['ok' => true]);
  }
  fail('Método inválido', 405);
}
if ($route === 'org/centers') {
  if ($method === 'GET') {
    $centers = all('SELECT c.* FROM cost_centers c ' . ($u['role'] === 'master' ? '' : 'JOIN user_units a ON a.unit_id=c.unit_id AND a.user_id=' . (int) $u['id']) . ' ORDER BY c.code,c.name');
    respond(array_map('normalize', $centers));
  }
  requireModule($u, 'adm');
  admin($u);
  $d = input();
  $unit = id($d['unit_id'] ?? null);
  unitAllowed($u, $unit);
  $code = trim((string) ($d['code'] ?? ''));
  $name = trim((string) ($d['name'] ?? ''));
  if (!$code || !$name)
    fail('Informe código e nome do centro de custo.');
  if ($method === 'POST') {
    q('INSERT INTO cost_centers(unit_id,code,name) VALUES(?,?,?)', [$unit, $code, $name]);
    $id = $db->lastInsertId();
    audit($u, 'create', 'CostCenter', $id);
    respond(['id' => (string) $id], 201);
  }
  if ($method === 'PUT') {
    $id = id($d['id'] ?? null);
    if (!one('SELECT 1 FROM cost_centers WHERE id=? AND unit_id=?', [$id, $unit]))
      fail('Centro de custo inválido.', 404);
    $status = in_array(($d['status'] ?? 'active'), ['active', 'inactive'], true) ? $d['status'] : 'active';
    q('UPDATE cost_centers SET code=?,name=?,status=? WHERE id=?', [$code, $name, $status, $id]);
    audit($u, 'update', 'CostCenter', $id);
    respond(['ok' => true]);
  }
  fail('Método inválido', 405);
}
if ($route === 'audit') {
  requireModule($u, 'adm');
  admin($u);
  $wid = wh($u, true);
  $rows = all('SELECT a.*,us.display_name user_name FROM audit_logs a LEFT JOIN app_users us ON us.id=a.user_id ' . ($wid ? 'WHERE a.warehouse_id=?' : '') . ' ORDER BY a.id DESC LIMIT 500', $wid ? [$wid] : []);
  respond(array_map('normalize', $rows));
}
// Consulta minimizada para seleção de participantes no SSMA (nome ou matrícula).
// SSMA / ASO: acompanhamento administrativo; não emitir documentos médicos nem coletar resultados clínicos.
function asoDate(mixed $value, string $label): ?string
{
  $text = trim((string) ($value ?? ''));
  if ($text === '')
    return null;
  $date = DateTimeImmutable::createFromFormat('!Y-m-d', $text);
  if (!$date || $date->format('Y-m-d') !== $text)
    fail('Data inválida: ' . $label, 422);
  return $text;
}
function asoAdmin(array $user): void
{
  requireModule($user, 'ssma');
  admin($user);
}
function asoAllowedEmployee(array $user, int $employeeId): array
{
  $employee = one('SELECT id,unit_id,registration,full_name,status FROM employees WHERE id=?', [$employeeId]);
  if (!$employee)
    fail('Colaborador não encontrado.', 404);
  unitAllowed($user, (int) $employee['unit_id']);
  return $employee;
}
function asoRecord(array $user, int $recordId): array
{
  $row = one('SELECT a.*,e.unit_id current_unit_id FROM aso_records a JOIN employees e ON e.id=a.employee_id WHERE a.id=?', [$recordId]);
  if (!$row)
    fail('Registro ASO não encontrado.', 404);
  // Permissão de unidade atual do colaborador (também para leitura de documentos antigos).
  unitAllowed($user, (int) $row['current_unit_id']);
  return $row;
}
function asoStorageDir(): string
{
  // Em hospedagem cPanel padrão, sai de public_html/Ykire/api até a pasta HOME da conta.
  $home = dirname(__DIR__, 3);
  $storage = $home . '/ykire_private_aso_documents';
  if (!is_dir($storage) && !@mkdir($storage, 0700, true) && !is_dir($storage))
    fail('Não foi possível criar armazenamento privado fora de public_html.', 503);
  if (!is_writable($storage))
    fail('Armazenamento privado sem permissão de escrita.', 503);
  return $storage;
}
if (str_starts_with($route, 'aso/')) {
  asoAdmin($u);
  if ($route === 'aso/clinics') {
    if ($method === 'GET')
      respond(array_map('normalize', all('SELECT id,name,cnpj,contact,status FROM aso_clinics ORDER BY name')));
    if (!in_array($method, ['POST', 'PUT'], true))
      fail('Método inválido.', 405);
    $d = input();
    $name = trim((string) ($d['name'] ?? ''));
    $contact = trim((string) ($d['contact'] ?? ''));
    $status = (string) ($d['status'] ?? 'active');
    if (mb_strlen($name) < 3 || mb_strlen($name) > 180 || mb_strlen($contact) > 160 || !in_array($status, ['active', 'inactive'], true))
      fail('Dados da clínica inválidos.', 422);
    $cnpj = cnpjEmpresa($d['cnpj'] ?? null);
    if ($method === 'POST') {
      q('INSERT INTO aso_clinics(name,cnpj,contact,status) VALUES(?,?,?,?)', [$name, $cnpj, $contact ?: null, $status]);
      $rid = (int) $db->lastInsertId();
      audit($u, 'create', 'AsoClinic', $rid);
      respond(['id' => (string) $rid], 201);
    }
    $rid = id($d['id'] ?? null);
    if (!one('SELECT id FROM aso_clinics WHERE id=?', [$rid]))
      fail('Clínica não encontrada.', 404);
    q('UPDATE aso_clinics SET name=?,cnpj=?,contact=?,status=? WHERE id=?', [$name, $cnpj, $contact ?: null, $status, $rid]);
    audit($u, 'update', 'AsoClinic', $rid);
    respond(['ok' => true]);
  }
  if ($route === 'aso/filters') {
    if ($method !== 'GET')
      fail('Método inválido.', 405);
    $units = all('SELECT id,name,kind FROM units WHERE status="active"' . ($u['role'] === 'master' ? '' : ' AND id IN (SELECT unit_id FROM user_units WHERE user_id=?)') . ' ORDER BY (kind="sede") DESC,name', $u['role'] === 'master' ? [] : [$u['id']]);
    $companies = all('SELECT DISTINCT h.id,h.legal_name name FROM hr_companies h JOIN employees e ON e.hr_company_id=h.id WHERE e.status="active"' . ($u['role'] === 'master' ? '' : ' AND e.unit_id IN (SELECT unit_id FROM user_units WHERE user_id=?)') . ' ORDER BY h.legal_name', $u['role'] === 'master' ? [] : [$u['id']]);
    respond(['units' => array_map('normalize', $units), 'companies' => array_map('normalize', $companies)]);
  }
  if ($route === 'aso/overview') {
    if ($method !== 'GET')
      fail('Método inválido.', 405);
    $unitRaw = trim((string) ($_GET['unit_id'] ?? ''));
    $companyRaw = trim((string) ($_GET['company_id'] ?? ''));
    $conditions = ['e.status="active"'];
    $args = [];
    if ($u['role'] !== 'master') {
      $conditions[] = 'e.unit_id IN (SELECT unit_id FROM user_units WHERE user_id=?)';
      $args[] = $u['id'];
    }
    if ($unitRaw !== '' && $unitRaw !== 'all') {
      $uid = id($unitRaw);
      unitAllowed($u, $uid);
      $conditions[] = 'e.unit_id=?';
      $args[] = $uid;
    }
    if ($companyRaw !== '' && $companyRaw !== 'all') {
      $cid = id($companyRaw);
      $conditions[] = 'e.hr_company_id=?';
      $args[] = $cid;
    }
    $sql = 'SELECT e.id employee_id,e.registration,e.full_name,e.job_title,e.department,e.unit_id,e.hr_company_id,un.name unit_name,hc.legal_name company_name,
    a.id aso_id,a.exam_type,a.admin_status,a.clinic_id,a.scheduled_for,a.performed_on,a.received_on,a.next_evaluation_on,a.original_pdf_name,a.administrative_notes,
    cl.name clinic_name
    FROM employees e JOIN units un ON un.id=e.unit_id
    LEFT JOIN hr_companies hc ON hc.id=e.hr_company_id
    LEFT JOIN aso_records a ON a.id=(SELECT a2.id FROM aso_records a2 WHERE a2.employee_id=e.id ORDER BY a2.id DESC LIMIT 1)
    LEFT JOIN aso_clinics cl ON cl.id=a.clinic_id
    WHERE ' . implode(' AND ', $conditions) . ' ORDER BY e.full_name LIMIT 2501';
    $rows = all($sql, $args);
    if (count($rows) > 2500)
      fail('Consulta muito ampla. Filtre por empresa ou unidade.', 409);
    respond(array_map('normalize', $rows));
  }
  if ($route === 'aso/history') {
    if ($method !== 'GET')
      fail('Método inválido.', 405);
    $employee = asoAllowedEmployee($u, id($_GET['employee_id'] ?? null));
    $rows = all('SELECT a.id,a.exam_type,a.admin_status,a.scheduled_for,a.performed_on,a.received_on,a.next_evaluation_on,a.original_pdf_name,a.administrative_notes,c.name clinic_name,a.clinic_id,a.created_at FROM aso_records a LEFT JOIN aso_clinics c ON c.id=a.clinic_id WHERE a.employee_id=? ORDER BY a.id DESC LIMIT 200', [$employee['id']]);
    respond(array_map('normalize', $rows));
  }
  if ($route === 'aso/records') {
    if (!in_array($method, ['POST', 'PUT'], true))
      fail('Método inválido.', 405);
    $d = input();
    $employee = asoAllowedEmployee($u, id($d['employee_id'] ?? null));
    $types = ['admissional', 'periodico', 'retorno', 'mudanca_riscos', 'demissional'];
    $states = ['aguardando_agendamento', 'agendado', 'realizado_aguardando_aso', 'aso_recebido', 'revisao_necessaria'];
    $type = (string) ($d['exam_type'] ?? '');
    $status = (string) ($d['admin_status'] ?? '');
    if (!in_array($type, $types, true) || !in_array($status, $states, true))
      fail('Tipo ou situação de ASO inválidos.', 422);
    $clinic = null;
    if (!empty($d['clinic_id'])) {
      $clinic = id($d['clinic_id']);
      if (!one('SELECT id FROM aso_clinics WHERE id=? AND status="active"', [$clinic]))
        fail('Clínica inválida ou inativa.', 422);
    }
    // Campos agendamento/recebimento foram retirados do formulário; registros antigos permanecem preservados.
    $performed = asoDate($d['performed_on'] ?? null, 'realização');
    $next = asoDate($d['next_evaluation_on'] ?? null, 'próxima avaliação');
    $notes = trim((string) ($d['administrative_notes'] ?? ''));
    if (mb_strlen($notes) > 500)
      fail('Observações muito extensas.', 422);
    if ($status === 'aso_recebido' && !$performed)
      fail('Informe a data do exame para marcar o ASO como recebido.', 422);
    if ($method === 'POST') {
      q('INSERT INTO aso_records(employee_id,unit_id,exam_type,admin_status,clinic_id,performed_on,next_evaluation_on,administrative_notes,created_by) VALUES(?,?,?,?,?,?,?,?,?)', [(int) $employee['id'], (int) $employee['unit_id'], $type, $status, $clinic, $performed, $next, $notes ?: null, $u['id']]);
      $rid = (int) $db->lastInsertId();
      audit($u, 'create', 'AsoRecord', $rid, null, ['employee_id' => (int) $employee['id'], 'type' => $type, 'status' => $status]);
      respond(['id' => (string) $rid], 201);
    }
    $rid = id($d['id'] ?? null);
    $old = asoRecord($u, $rid);
    if ((int) $old['employee_id'] !== (int) $employee['id'])
      fail('Não é permitido alterar o funcionário vinculado ao ASO.', 409);
    q('UPDATE aso_records SET exam_type=?,admin_status=?,clinic_id=?,performed_on=?,next_evaluation_on=?,administrative_notes=?,updated_by=? WHERE id=?', [$type, $status, $clinic, $performed, $next, $notes ?: null, $u['id'], $rid]);
    audit($u, 'update', 'AsoRecord', $rid, null, ['employee_id' => (int) $employee['id'], 'status_before' => $old['admin_status'], 'status_after' => $status, 'next_before' => $old['next_evaluation_on'], 'next_after' => $next]);
    respond(['ok' => true]);
  }
  if ($route === 'aso/upload') {
    if ($method !== 'POST')
      fail('Método inválido.', 405);
    $record = asoRecord($u, id($_POST['record_id'] ?? null));
    $file = $_FILES['document'] ?? null;
    if (!$file || is_array($file['error']) || $file['error'] !== UPLOAD_ERR_OK)
      fail('Selecione um arquivo PDF válido (máx. 8 MB).', 422);
    if ((int) $file['size'] <= 0 || (int) $file['size'] > 8 * 1024 * 1024)
      fail('O arquivo precisa ter até 8 MB.', 422);
    if (!is_uploaded_file($file['tmp_name']))
      fail('Upload não reconhecido.', 422);
    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime = $finfo->file($file['tmp_name']);
    $handle = fopen($file['tmp_name'], 'rb');
    $signature = $handle ? fread($handle, 5) : '';
    if ($handle)
      fclose($handle);
    if ($mime !== 'application/pdf' || $signature !== '%PDF-')
      fail('Envie somente o ASO em formato PDF.', 422);
    $directory = asoStorageDir();
    $token = bin2hex(random_bytes(20));
    $destination = $directory . '/' . $token . '.pdf';
    if (!move_uploaded_file($file['tmp_name'], $destination))
      fail('Falha ao armazenar o PDF.', 503);
    @chmod($destination, 0600);
    $original = mb_substr(preg_replace('/[^\pL\pN._ -]/u', '_', basename((string) $file['name'])) ?: 'aso.pdf', 0, 180);
    try {
      q('UPDATE aso_records SET stored_pdf_name=?,original_pdf_name=?,updated_by=? WHERE id=?', [$token, $original, $u['id'], $record['id']]);
      audit($u, 'upload', 'AsoDocument', $record['id'], null, ['employee_id' => $record['employee_id']]);
    } catch (Throwable $exception) {
      @unlink($destination);
      throw $exception;
    }
    if (!empty($record['stored_pdf_name']) && preg_match('/^[a-f0-9]{40}$/', (string) $record['stored_pdf_name'])) {
      @unlink($directory . '/' . $record['stored_pdf_name'] . '.pdf');
    }
    // Reanexação substitui arquivo anterior; registros de ASOs distintos preservam o próprio histórico.
    respond(['ok' => true]);
  }
  if ($route === 'aso/document') {
    if ($method !== 'GET')
      fail('Método inválido.', 405);
    $record = asoRecord($u, id($_GET['id'] ?? null));
    $token = (string) ($record['stored_pdf_name'] ?? '');
    if (!preg_match('/^[a-f0-9]{40}$/', $token))
      fail('Documento ainda não anexado.', 404);
    $directory = asoStorageDir();
    $full = $directory . '/' . $token . '.pdf';
    if (!is_file($full))
      fail('Arquivo não localizado.', 404);
    audit($u, 'download', 'AsoDocument', $record['id'], null, ['employee_id' => $record['employee_id']]);
    header('Content-Type: application/pdf');
    header('Content-Disposition: attachment; filename="ASO-' . $record['id'] . '.pdf"');
    header('Content-Length: ' . filesize($full));
    header('X-Content-Type-Options: nosniff');
    header('Cache-Control: private,no-store');
    readfile($full);
    exit;
  }
  fail('Rota ASO não encontrada.', 404);
}

if ($route === 'certificates/employees') {
  requireModule($u, 'ssma');
  if ($method !== 'GET')
    fail('Método inválido.', 405);
  $term = trim((string) ($_GET['q'] ?? ''));
  if (strlen($term) < 2)
    respond([]);
  if (strlen($term) > 80)
    fail('Pesquisa muito longa.');
  $args = ['%' . $term . '%', '%' . $term . '%'];
  $scope = '';
  if ($u['role'] !== 'master') {
    $scope = ' AND e.unit_id IN (SELECT unit_id FROM user_units WHERE user_id=?)';
    $args[] = $u['id'];
  }
  $rows = all('SELECT e.id,e.registration,e.full_name,e.job_title,e.department,e.unit_id,e.status,e.cpf,u.name unit_name FROM employees e JOIN units u ON u.id=e.unit_id WHERE (e.registration LIKE ? OR e.full_name LIKE ?)' . $scope . ' ORDER BY e.full_name LIMIT 30', $args);
  foreach ($rows as &$row) {
    $row['cpf_masked'] = maskCpf($row['cpf']);
    $row['cpf_registered'] = !empty($row['cpf']);
    unset($row['cpf']);
  }
  unset($row);
  respond(array_map('normalize', $rows));
}
// Gerenciamento global das empresas ministrantes: cadastro não depende de obra.
if ($route === 'certificates/companies') {
  requireModule($u, 'ssma');
  if ($method === 'GET') {
    $includeInactive = ($_GET['include_inactive'] ?? '') === '1' && in_array($u['role'], ['master', 'admin'], true);
    $where = $includeInactive ? '' : ' WHERE status="active"';
    respond(array_map('normalize', all('SELECT id,legal_name,trade_name,cnpj,status,created_at,updated_at FROM training_companies' . $where . ' ORDER BY legal_name')));
  }
  admin($u);
  $d = input();
  $payload = dadosEmpresaTreinamento($d);
  if ($method === 'POST') {
    q('INSERT INTO training_companies(legal_name,trade_name,cnpj) VALUES(?,?,?)', array_values($payload));
    $newId = (int) $db->lastInsertId();
    audit($u, 'create', 'TrainingCompany', $newId, null, ['legal_name' => $payload['legal_name']]);
    respond(['id' => (string) $newId, 'message' => 'Empresa ministrante cadastrada.'], 201);
  }
  if ($method === 'PUT') {
    $companyId = id($d['id'] ?? null);
    if (!one('SELECT id FROM training_companies WHERE id=?', [$companyId]))
      fail('Empresa não encontrada.', 404);
    $status = (string) ($d['status'] ?? 'active');
    if (!in_array($status, ['active', 'inactive'], true))
      fail('Situação inválida.', 422);
    q('UPDATE training_companies SET legal_name=?,trade_name=?,cnpj=?,status=? WHERE id=?', [
      $payload['legal_name'],
      $payload['trade_name'],
      $payload['cnpj'],
      $status,
      $companyId
    ]);
    audit($u, 'update', 'TrainingCompany', $companyId, null, ['legal_name' => $payload['legal_name'], 'status' => $status]);
    respond(['id' => (string) $companyId, 'message' => 'Empresa atualizada. Os certificados anteriores permanecem inalterados.']);
  }
  fail('Método inválido.', 405);
}
if ($route === 'certificates/templates') {
  requireModule($u, 'ssma');
  if ($method !== 'GET')
    fail('Método inválido.', 405);
  respond(array_map('normalize', all('SELECT code,title,default_hours,active FROM certificate_templates WHERE active=1 ORDER BY sort_order')));
}
// Consulta consolidada SSMA: apenas após aplicar filtro por treinamento ou colaborador.
// Não inclui CPF nem arquivo do certificado; o PDF individual continua em certificates/detail.
if ($route === 'certificates/report') {
  requireModule($u, 'ssma');
  if ($method !== 'GET')
    fail('Método inválido.', 405);
  $mode = (string) ($_GET['mode'] ?? '');
  if (!in_array($mode, ['training', 'employee'], true))
    fail('Modo de consulta inválido.', 422);
  $where = ['ec.status="issued"'];
  $args = [];
  if ($u['role'] !== 'master') {
    $where[] = 'ec.unit_id IN (SELECT unit_id FROM user_units WHERE user_id=?)';
    $args[] = $u['id'];
  }
  $unitRaw = trim((string) ($_GET['unit_id'] ?? ''));
  if ($unitRaw !== '') {
    $uid = id($unitRaw);
    unitAllowed($u, $uid);
    $where[] = 'ec.unit_id=?';
    $args[] = $uid;
  }
  if ($mode === 'training') {
    $template = trim((string) ($_GET['template_code'] ?? ''));
    if ($template === '' || !one('SELECT 1 FROM certificate_templates WHERE code=?', [$template]))
      fail('Escolha um treinamento válido.', 422);
    $where[] = 'ts.template_code=?';
    $args[] = $template;
  } else {
    $term = trim((string) ($_GET['q'] ?? ''));
    if (mb_strlen($term) < 2 || mb_strlen($term) > 100)
      fail('Pesquise o funcionário por pelo menos 2 caracteres do nome ou matrícula.', 422);
    // Escape os curingas de LIKE: a pesquisa deve ser literal, não uma expressão SQL.
    $term = str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $term);
    $where[] = '(ec.registration_snapshot LIKE ? OR ec.full_name_snapshot LIKE ?)';
    $args[] = '%' . $term . '%';
    $args[] = '%' . $term . '%';
  }
  // Uma linha por colaborador + treinamento, selecionando sua última emissão válida.
  // Consulta somente emissões de unidades autorizadas, inclusive no agrupamento.
  $whereSql = implode(' AND ', $where);
  $sql = 'SELECT ec.id,ec.employee_id,ec.registration_snapshot,ec.full_name_snapshot,ec.unit_id,un.name unit_name,ts.template_code,ct.title template_title,ts.training_date,ts.location,ts.hours,h.issuance_count
       FROM (SELECT MAX(ec.id) latest_id,COUNT(*) issuance_count
             FROM employee_certificates ec JOIN training_sessions ts ON ts.id=ec.training_session_id
             WHERE ' . $whereSql . ' GROUP BY ec.employee_id,ts.template_code) h
       JOIN employee_certificates ec ON ec.id=h.latest_id
       JOIN training_sessions ts ON ts.id=ec.training_session_id
       JOIN certificate_templates ct ON ct.code=ts.template_code
       JOIN units un ON un.id=ec.unit_id
       ORDER BY ec.full_name_snapshot,ec.registration_snapshot,ct.title LIMIT 2001';
  $rows = all($sql, $args);
  if (count($rows) > 2000)
    fail('A consulta ultrapassou 2.000 linhas. Refine a matrícula, nome ou unidade para exportar um resultado completo.', 422);
  respond(array_map('normalize', $rows));
}
if ($route === 'certificates/detail') {
  requireModule($u, 'ssma');
  if ($method !== 'GET')
    fail('Método inválido.', 405);
  $cid = id($_GET['id'] ?? null);
  $record = one('SELECT ec.*,ts.template_code,ts.training_date,ts.location,ts.hours,ts.instructor_name,ts.instructor_title,ts.instructor_registration,ts.verification_note,ts.training_company_id,ts.training_company_name_snapshot,ts.training_company_cnpj_snapshot,ct.title template_title,u.name unit_name,usr.display_name issued_by_name FROM employee_certificates ec JOIN training_sessions ts ON ts.id=ec.training_session_id JOIN certificate_templates ct ON ct.code=ts.template_code JOIN units u ON u.id=ec.unit_id JOIN app_users usr ON usr.id=ec.issued_by WHERE ec.id=?', [$cid]);
  if (!$record)
    fail('Certificado não encontrado.', 404);
  unitAllowed($u, (int) $record['unit_id']);
  // CPF em texto integral apenas no detalhe autenticado do módulo SSMA, para gerar o PDF.
  audit($u, 'view', 'Certificate', $cid, null, ['reason' => 'visualização para emissão de PDF']);
  respond(normalize($record));
}
if ($route === 'certificates') {
  requireModule($u, 'ssma');
  if ($method === 'GET') {
    $args = [];
    $scope = '';
    $term = trim((string) ($_GET['q'] ?? ''));
    if ($u['role'] !== 'master') {
      $scope .= ' AND ec.unit_id IN (SELECT unit_id FROM user_units WHERE user_id=?)';
      $args[] = $u['id'];
    }
    if ($term !== '') {
      $scope .= ' AND (ec.registration_snapshot LIKE ? OR ec.full_name_snapshot LIKE ?)';
      $args[] = '%' . $term . '%';
      $args[] = '%' . $term . '%';
    }
    $rows = all('SELECT ec.id,ec.registration_snapshot,ec.full_name_snapshot,ec.status,ec.issued_at,ts.template_code,ts.training_date,ts.location,ts.hours,ct.title template_title,u.name unit_name,usr.display_name issued_by_name FROM employee_certificates ec JOIN training_sessions ts ON ts.id=ec.training_session_id JOIN certificate_templates ct ON ct.code=ts.template_code JOIN units u ON u.id=ec.unit_id JOIN app_users usr ON usr.id=ec.issued_by WHERE 1=1' . $scope . ' ORDER BY ec.id DESC LIMIT 250', $args);
    respond(array_map('normalize', $rows));
  }
  if ($method !== 'POST')
    fail('Método inválido.', 405);
  admin($u);
  $d = input();
  if (($d['confirmed_completion'] ?? false) !== true)
    fail('Confirme a conclusão real do treinamento antes de emitir.', 422);
  $empId = id($d['employee_id'] ?? null);
  $emp = one('SELECT e.* FROM employees e WHERE e.id=?', [$empId]);
  if (!$emp || $emp['status'] !== 'active')
    fail('Colaborador não encontrado ou inativo.', 422);
  unitAllowed($u, (int) $emp['unit_id']);
  if (empty($emp['cpf']))
    fail('Cadastre e valide o CPF do colaborador no RH antes de emitir.', 422);
  $tpl = one('SELECT * FROM certificate_templates WHERE code=? AND active=1', [$d['template_code'] ?? '']);
  if (!$tpl)
    fail('Modelo de certificado inválido ou desativado.', 422);
  $companyId = id($d['training_company_id'] ?? null);
  $company = one('SELECT id,legal_name,cnpj FROM training_companies WHERE id=? AND status="active"', [$companyId]);
  if (!$company)
    fail('Selecione uma empresa ministrante ativa cadastrada no SSMA.', 422);

  $date = (string) ($d['training_date'] ?? '');
  $dt = DateTimeImmutable::createFromFormat('!Y-m-d', $date);
  if (!$dt || $dt->format('Y-m-d') !== $date || $date > date('Y-m-d'))
    fail('Data de conclusão inválida ou futura.', 422);
  $location = trim((string) ($d['location'] ?? ''));
  $instructor = trim((string) ($d['instructor_name'] ?? ''));
  $instructorTitle = trim((string) ($d['instructor_title'] ?? ''));
  $instructorReg = trim((string) ($d['instructor_registration'] ?? ''));
  $notes = trim((string) ($d['verification_note'] ?? ''));
  $hours = (int) ($d['hours'] ?? $tpl['default_hours']);
  if (strlen($location) < 3 || strlen($location) > 120)
    fail('Informe cidade/UF do treinamento.', 422);
  if (strlen($instructor) < 3 || strlen($instructor) > 150)
    fail('Informe o instrutor responsável.', 422);
  if (strlen($instructorTitle) > 150 || strlen($instructorReg) > 90 || strlen($notes) < 8 || strlen($notes) > 1000)
    fail('Informe a comprovação da conclusão (mínimo 8 caracteres) e revise o instrutor.', 422);
  if ($hours < 1 || $hours > 500)
    fail('Carga horária inválida.', 422);
  $db->beginTransaction();
  try {
    q('INSERT INTO training_sessions(template_code,training_company_id,training_company_name_snapshot,training_company_cnpj_snapshot,training_date,location,hours,instructor_name,instructor_title,instructor_registration,verification_note,verified_by) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)', [$tpl['code'], $companyId, $company['legal_name'], $company['cnpj'], $date, $location, $hours, $instructor, $instructorTitle, $instructorReg, $notes, $u['id']]);
    $tid = (int) $db->lastInsertId();
    q('INSERT INTO employee_certificates(employee_id,unit_id,training_session_id,registration_snapshot,full_name_snapshot,cpf_snapshot,job_title_snapshot,issued_by) VALUES(?,?,?,?,?,?,?,?)', [$empId, $emp['unit_id'], $tid, $emp['registration'], $emp['full_name'], $emp['cpf'], $emp['job_title'], $u['id']]);
    $cid = (int) $db->lastInsertId();
    audit($u, 'issue', 'Certificate', $cid, null, ['template' => $tpl['code'], 'employee_id' => $empId, 'unit_id' => $emp['unit_id'], 'training_company_id' => $companyId, 'training_company_name' => $company['legal_name']]);
    $db->commit();
    respond(['id' => (string) $cid, 'message' => 'Certificado registrado. Faça o download do PDF.'], 201);
  } catch (Throwable $e) {
    if ($db->inTransaction())
      $db->rollBack();
    throw $e;
  }
}
// Catálogos globais do RH. O ID sequencial funciona como código único do cadastro.
if ($route === 'hr/catalog') {
  requireModule($u, 'rh');
  $type = trim((string) ($_GET['type'] ?? ''));
  $tables = ['jobs' => 'hr_job_roles', 'departments' => 'hr_departments', 'companies' => 'hr_companies'];
  if (!isset($tables[$type]))
    fail('Tipo de cadastro inválido.', 422);
  $table = $tables[$type];
  if ($method === 'GET') {
    $rows = all($type === 'companies'
      ? 'SELECT id,legal_name AS name,trade_name,cnpj,status FROM hr_companies ORDER BY legal_name,id'
      : 'SELECT id,name,status FROM ' . $table . ' ORDER BY name,id');
    respond(array_map('normalize', $rows));
  }
  admin($u);
  if (!in_array($method, ['POST', 'PUT'], true))
    fail('Método inválido.', 405);
  $d = input();
  $name = trim((string) ($d['name'] ?? ''));
  if (mb_strlen($name) < 2 || mb_strlen($name) > ($type === 'companies' ? 180 : 150))
    fail('Informe um nome válido para o cadastro (mínimo 2 caracteres).', 422);
  $status = trim((string) ($d['status'] ?? 'active'));
  if (!in_array($status, ['active', 'inactive'], true))
    fail('Situação inválida.', 422);
  $trade = null;
  $cnpj = null;
  if ($type === 'companies') {
    $trade = trim((string) ($d['trade_name'] ?? ''));
    if (mb_strlen($trade) > 180)
      fail('Nome fantasia muito longo.', 422);
    $trade = $trade ?: null;
    $cnpj = cnpjEmpresa($d['cnpj'] ?? '');
    if (!$cnpj)
      fail('CNPJ é obrigatório para empresas empregadoras.', 422);
  }
  $db->beginTransaction();
  try {
    if ($method === 'POST') {
      if ($type === 'companies')
        q('INSERT INTO hr_companies(legal_name,trade_name,cnpj) VALUES(?,?,?)', [$name, $trade, $cnpj]);
      else
        q('INSERT INTO ' . $table . '(name) VALUES(?)', [$name]);
      $catalogId = (int) $db->lastInsertId();
      audit($u, 'create', 'RH_' . $type, $catalogId, null, ['name' => $name]);
      $db->commit();
      respond(['id' => (string) $catalogId], 201);
    }
    $catalogId = id($d['id'] ?? null);
    $old = one('SELECT id FROM ' . $table . ' WHERE id=?', [$catalogId]);
    if (!$old)
      fail('Registro não encontrado.', 404);
    if ($type === 'companies')
      q('UPDATE hr_companies SET legal_name=?,trade_name=?,cnpj=?,status=? WHERE id=?', [$name, $trade, $cnpj, $status, $catalogId]);
    else {
      q('UPDATE ' . $table . ' SET name=?,status=? WHERE id=?', [$name, $status, $catalogId]);
      // Mantém compatibilidade com os módulos que leem os rótulos de função/setor.
      if ($type === 'jobs')
        q('UPDATE employees SET job_title=? WHERE job_role_id=?', [$name, $catalogId]);
      if ($type === 'departments')
        q('UPDATE employees SET department=? WHERE department_id=?', [$name, $catalogId]);
    }
    audit($u, 'update', 'RH_' . $type, $catalogId, null, ['name' => $name, 'status' => $status]);
    $db->commit();
    respond(['ok' => true]);
  } catch (Throwable $e) {
    if ($db->inTransaction())
      $db->rollBack();
    throw $e;
  }
}
if ($route === 'employees/detail') {
  requireModule($u, 'rh');
  admin($u);
  if ($method !== 'GET')
    fail('Método inválido.', 405);
  $employeeId = id($_GET['id'] ?? null);
  $row = one('SELECT e.*,un.name unit_name,cc.name cost_center_name,hc.legal_name hr_company_name,hc.cnpj hr_company_cnpj FROM employees e JOIN units un ON un.id=e.unit_id LEFT JOIN cost_centers cc ON cc.id=e.cost_center_id LEFT JOIN hr_companies hc ON hc.id=e.hr_company_id WHERE e.id=?', [$employeeId]);
  if (!$row)
    fail('Funcionário não encontrado.', 404);
  unitAllowed($u, (int) $row['unit_id']);
  $row['dependents'] = all('SELECT id,full_name,relationship,date_of_birth FROM employee_dependents WHERE employee_id=? ORDER BY id', [$employeeId]);
  respond(normalize($row));
}
if ($route === 'employees') {
  if ($method === 'GET') {
    $wid = wh($u, true);
    $reg = trim((string) ($_GET['registration'] ?? ''));
    $clauses = [];
    $params = [];
    if ($reg === '')
      requireModule($u, 'rh');
    else
      requireOneModule($u, ['rh', 'estoque', 'ssma']);
    if ($wid !== null) {
      $unit = one('SELECT unit_id FROM warehouses WHERE id=?', [$wid]);
      $clauses[] = 'e.unit_id=?';
      $params[] = $unit['unit_id'];
    } elseif ($u['role'] !== 'master') {
      $clauses[] = 'e.unit_id IN (SELECT unit_id FROM user_units WHERE user_id=?)';
      $params[] = $u['id'];
    }
    if ($reg !== '') {
      $clauses[] = 'e.registration=?';
      $params[] = $reg;
    }
    // Nunca expor documentos, endereços ou dependentes em listagens/buscas do Estoque e SSMA.
    $rows = all('SELECT e.id,e.registration,e.full_name,e.job_title,e.department,e.job_role_id,e.department_id,e.hr_company_id,hc.legal_name hr_company_name,e.unit_id,e.cost_center_id,e.status,u.name unit_name,cc.code cost_center_code,cc.name cost_center_name FROM employees e JOIN units u ON u.id=e.unit_id LEFT JOIN cost_centers cc ON cc.id=e.cost_center_id LEFT JOIN hr_companies hc ON hc.id=e.hr_company_id' . ($clauses ? ' WHERE ' . implode(' AND ', $clauses) : '') . ' ORDER BY e.full_name ASC LIMIT 2000', $params);
    if ($reg !== '') {
      if (!$rows)
        fail('Matrícula não encontrada nesta unidade.', 404);
      respond(normalize($rows[0]));
    }
    respond(array_map('normalize', $rows));
  }
  requireModule($u, 'rh');
  admin($u);
  if (!in_array($method, ['POST', 'PUT'], true))
    fail('Método inválido.', 405);
  $d = input();
  $reg = trim((string) ($d['registration'] ?? ''));
  if ($method === 'POST' && !preg_match('/^[A-Za-z0-9._\/-]{1,40}$/', $reg))
    fail('Matrícula inválida. Use até 40 letras, números, ponto, hífen ou barra.');
  $old = null;
  $employeeId = null;
  if ($method === 'PUT') {
    $employeeId = id($d['id'] ?? null);
    $old = one('SELECT * FROM employees WHERE id=?', [$employeeId]);
    if (!$old)
      fail('Funcionário não encontrado.', 404);
    unitAllowed($u, (int) $old['unit_id']);
    if ($reg !== '' && $reg !== $old['registration'])
      fail('Matrícula não pode ser alterada após o cadastro.');
  }
  $name = trim((string) ($d['full_name'] ?? ''));
  if (!$name || mb_strlen($name) > 180)
    fail('Informe o nome completo (até 180 caracteres).');
  // Função e departamento SOMENTE por vínculo a catálogos; não confiar em texto enviado pelo navegador.
  $jobRecord = hrCatalogSelection($d, 'job_role_id', 'hr_job_roles');
  $departmentRecord = hrCatalogSelection($d, 'department_id', 'hr_departments');
  $function = $jobRecord['name'];
  $department = $departmentRecord['name'];
  $jobId = (int) $jobRecord['id'];
  $departmentId = (int) $departmentRecord['id'];
  $companyId = id($d['hr_company_id'] ?? null);
  if (!one('SELECT 1 FROM hr_companies WHERE id=? AND status="active"', [$companyId]))
    fail('Selecione uma empresa empregadora ativa.', 422);
  $unitId = id($d['unit_id'] ?? null);
  unitAllowed($u, $unitId);
  if (!one('SELECT 1 FROM units WHERE id=? AND status="active"', [$unitId]))
    fail('Unidade inativa ou inexistente.', 422);
  $center = !empty($d['cost_center_id']) ? id($d['cost_center_id']) : null;
  if ($center && !one('SELECT 1 FROM cost_centers WHERE id=? AND unit_id=? AND status="active"', [$center, $unitId]))
    fail('Centro de custo não pertence à unidade.', 422);
  $cpf = normalizedCpf($d['cpf'] ?? ($old['cpf'] ?? null));
  $status = $d['status'] ?? 'active';
  if (!in_array($status, ['active', 'inactive'], true))
    fail('Status inválido.');
  $extras = array_merge(employeeExtras($d, $old), employeeEmploymentExtras($d, $old));
  $dependents = array_key_exists('dependents', $d) ? employeeDependents($d['dependents']) : null;
  $keys = array_keys($extras);
  $args = array_values($extras);
  $db->beginTransaction();
  try {
    if ($method === 'POST') {
      $cols = array_merge(['registration', 'full_name', 'job_title', 'job_role_id', 'department', 'department_id', 'unit_id', 'hr_company_id', 'cost_center_id', 'status', 'cpf'], $keys);
      $vals = array_merge([$reg, $name, $function, $jobId, $department, $departmentId, $unitId, $companyId, $center, $status, $cpf], $args);
      q('INSERT INTO employees(' . implode(',', $cols) . ') VALUES(' . implode(',', array_fill(0, count($cols), '?')) . ')', $vals);
      $employeeId = (int) $db->lastInsertId();
      if ($dependents !== null)
        saveEmployeeDependents($employeeId, $dependents);
      audit($u, 'create', 'Employee', $employeeId, null, ['registration' => $reg, 'unit_id' => $unitId, 'dependents_count' => $dependents === null ? 0 : count($dependents)]);
      $db->commit();
      respond(['id' => (string) $employeeId], 201);
    }
    $set = array_merge(['full_name=?', 'job_title=?', 'job_role_id=?', 'department=?', 'department_id=?', 'unit_id=?', 'hr_company_id=?', 'cost_center_id=?', 'status=?', 'cpf=?'], array_map(fn($k) => $k . '=?', $keys));
    q('UPDATE employees SET ' . implode(',', $set) . ' WHERE id=?', array_merge([$name, $function, $jobId, $department, $departmentId, $unitId, $companyId, $center, $status, $cpf], $args, [$employeeId]));
    if ($dependents !== null)
      saveEmployeeDependents($employeeId, $dependents);
    audit($u, 'update', 'Employee', $employeeId, null, ['old_unit_id' => $old['unit_id'], 'new_unit_id' => $unitId, 'registration' => $old['registration'], 'dependents_updated' => $dependents !== null]);
    $db->commit();
    respond(['ok' => true]);
  } catch (Throwable $e) {
    if ($db->inTransaction())
      $db->rollBack();
    throw $e;
  }
}
// Ficha consolidada por matrícula. Escopo de acesso validado no servidor, nunca no navegador.
if ($route === 'employees/profile') {
  requireModule($u, 'rh');
  if ($method !== 'GET')
    fail('Método inválido.', 405);
  $reg = trim((string) ($_GET['registration'] ?? ''));
  if ($reg === '' || strlen($reg) > 40)
    fail('Informe uma matrícula válida.');
  $employee = one('SELECT e.id,e.registration,e.full_name,e.job_title,e.department,e.unit_id,e.cost_center_id,e.status,hc.legal_name hr_company_name,un.name unit_name,cc.code cost_center_code,cc.name cost_center_name FROM employees e JOIN units un ON un.id=e.unit_id LEFT JOIN cost_centers cc ON cc.id=e.cost_center_id LEFT JOIN hr_companies hc ON hc.id=e.hr_company_id WHERE e.registration=?', [$reg]);
  if (!$employee)
    fail('Funcionário não encontrado.', 404);
  // A ficha de cadastro pertence à unidade atual; registros antigos em outras obras
  // só podem ser vistos por quem também tem permissão nessas obras.
  unitAllowed($u, (int) $employee['unit_id']);
  $eid = (int) $employee['id'];
  $toolsSql = "SELECT t.*,p.name product_name,p.unit product_unit,w.name warehouse_name,un.name issue_unit_name,issuer.display_name issued_by,CAST((t.issued_quantity-t.settled_quantity) AS DECIMAL(16,3)) outstanding_quantity FROM tool_assignments t JOIN movements mv ON mv.id=t.movement_id LEFT JOIN app_users issuer ON issuer.id=mv.user_id JOIN products p ON p.id=t.product_id JOIN warehouses w ON w.id=t.warehouse_id JOIN units un ON un.id=w.unit_id WHERE t.employee_id=?";
  $epiSql = "SELECT e.*,p.name product_name,p.unit product_unit,w.name warehouse_name,un.name issue_unit_name,issuer.display_name delivered_by FROM epi_deliveries e JOIN movements mv ON mv.id=e.movement_id LEFT JOIN app_users issuer ON issuer.id=mv.user_id JOIN products p ON p.id=e.product_id JOIN warehouses w ON w.id=e.warehouse_id JOIN units un ON un.id=w.unit_id WHERE e.employee_id=?";
  $returnsSql = "SELECT r.*,t.product_id,p.name product_name,p.unit product_unit,w.name warehouse_name,un.name issue_unit_name,usr.display_name received_by FROM tool_returns r JOIN tool_assignments t ON t.id=r.assignment_id JOIN products p ON p.id=t.product_id JOIN warehouses w ON w.id=t.warehouse_id JOIN units un ON un.id=w.unit_id JOIN app_users usr ON usr.id=r.returned_by_user_id WHERE t.employee_id=?";
  $args = [$eid];
  if ($u['role'] !== 'master') {
    $filter = ' AND %s.warehouse_id IN (SELECT w2.id FROM warehouses w2 JOIN user_units uu ON uu.unit_id=w2.unit_id WHERE uu.user_id=?)';
    $toolsSql .= sprintf($filter, 't');
    $epiSql .= sprintf($filter, 'e');
    $returnsSql .= sprintf($filter, 't');
    $args[] = $u['id'];
  }
  $canTools = $u['role'] === 'master' || in_array('estoque', modulesFor($u), true);
  $canEpi = $u['role'] === 'master' || in_array('ssma', modulesFor($u), true);
  $tools = $canTools ? all($toolsSql . ' ORDER BY t.issued_at DESC,t.id DESC LIMIT 2001', $args) : [];
  $epis = $canEpi ? all($epiSql . ' ORDER BY e.delivered_at DESC,e.id DESC LIMIT 2001', $args) : [];
  $returns = $canTools ? all($returnsSql . ' ORDER BY r.occurred_at DESC,r.id DESC LIMIT 2001', $args) : [];
  if (count($tools) > 2000 || count($epis) > 2000 || count($returns) > 2000)
    fail('Ficha muito extensa para emissão completa. Solicite exportação paginada ao administrador.', 409);
  respond(['employee' => normalize($employee), 'tools' => array_map('normalize', $tools), 'epis' => array_map('normalize', $epis), 'returns' => array_map('normalize', $returns)]);
}
if ($route === 'tools/assignments' || $route === 'epi/deliveries') {
  if ($method !== 'GET')
    fail('Método inválido.', 405);
  admin($u);
  $wid = wh($u, true);
  $reg = trim((string) ($_GET['registration'] ?? ''));
  $eid = 0;
  if ($reg !== '') {
    $emp = one('SELECT id,unit_id FROM employees WHERE registration=?', [$reg]);
    if (!$emp)
      fail('Funcionário não encontrado.', 404);
    // Access is scoped by the warehouse of the historical issue, not the employee's current unit.
    $eid = (int) $emp['id'];
  }
  $params = [];
  $clauses = [];
  $table = $route === 'tools/assignments' ? 'tool_assignments' : 'epi_deliveries';
  $alias = $table === 'tool_assignments' ? 't' : 'e';
  if ($wid !== null) {
    $clauses[] = "$alias.warehouse_id=?";
    $params[] = $wid;
  } elseif ($u['role'] !== 'master') {
    $clauses[] = "$alias.warehouse_id IN (SELECT w.id FROM warehouses w JOIN user_units uu ON uu.unit_id=w.unit_id WHERE uu.user_id=?)";
    $params[] = $u['id'];
  }
  if ($eid) {
    $clauses[] = "$alias.employee_id=?";
    $params[] = $eid;
  }
  if ($table === 'tool_assignments') {
    $sql = "SELECT t.*,em.registration,COALESCE(JSON_UNQUOTE(JSON_EXTRACT(m.detail, '$.employee')),em.full_name) full_name,COALESCE(JSON_UNQUOTE(JSON_EXTRACT(m.detail, '$.department')),em.department) department,p.name product_name,p.unit product_unit,w.name warehouse_name,CAST((t.issued_quantity-t.settled_quantity) AS DECIMAL(16,3)) outstanding_quantity FROM tool_assignments t JOIN employees em ON em.id=t.employee_id JOIN movements m ON m.id=t.movement_id JOIN products p ON p.id=t.product_id JOIN warehouses w ON w.id=t.warehouse_id";
    $order = 't.issued_at DESC,t.id DESC';
  } else {
    $sql = "SELECT e.*,em.registration,COALESCE(JSON_UNQUOTE(JSON_EXTRACT(m.detail, '$.employee')),em.full_name) full_name,COALESCE(JSON_UNQUOTE(JSON_EXTRACT(m.detail, '$.department')),em.department) department,p.name product_name,p.unit product_unit,w.name warehouse_name FROM epi_deliveries e JOIN employees em ON em.id=e.employee_id JOIN movements m ON m.id=e.movement_id JOIN products p ON p.id=e.product_id JOIN warehouses w ON w.id=e.warehouse_id";
    $order = 'e.delivered_at DESC,e.id DESC';
  }
  $rows = all($sql . ($clauses ? ' WHERE ' . implode(' AND ', $clauses) : '') . ' ORDER BY ' . $order . ' LIMIT 2000', $params);
  respond(array_map('normalize', $rows));
}
if ($route === 'tools/returns') {
  requireModule($u, 'estoque');
  if ($method !== 'GET')
    fail('Método inválido.', 405);
  admin($u);
  $aid = id($_GET['assignment_id'] ?? null);
  $assignment = one('SELECT warehouse_id FROM tool_assignments WHERE id=?', [$aid]);
  if (!$assignment)
    fail('Entrega não encontrada.', 404);
  whAccess($u, (int) $assignment['warehouse_id']);
  $rows = all('SELECT r.*,m.date movement_date,usr.display_name received_by FROM tool_returns r LEFT JOIN movements m ON m.id=r.movement_id JOIN app_users usr ON usr.id=r.returned_by_user_id WHERE r.assignment_id=? ORDER BY r.id DESC', [$aid]);
  respond(array_map('normalize', $rows));
}
if ($route === 'tools/return') {
  requireModule($u, 'estoque');
  if ($method !== 'POST')
    fail('Método inválido.', 405);
  admin($u);
  $d = input();
  $aid = id($d['assignment_id'] ?? null);
  $quantity = qty($d['quantity'] ?? null);
  $disposition = (string) ($d['disposition'] ?? 'good');
  if (!in_array($disposition, ['good', 'damaged', 'lost'], true))
    fail('Condição de devolução inválida.');
  if ($disposition !== 'good')
    admin($u);
  $notes = trim((string) ($d['notes'] ?? ''));
  if ($disposition !== 'good' && !$notes)
    fail('Justificativa obrigatória para ferramenta danificada ou extraviada.');
  $db->beginTransaction();
  try {
    $assignment = one('SELECT t.*,em.registration,em.full_name FROM tool_assignments t JOIN employees em ON em.id=t.employee_id WHERE t.id=? FOR UPDATE', [$aid]);
    if (!$assignment)
      fail('Entrega de ferramenta não encontrada.', 404);
    $wid = (int) $assignment['warehouse_id'];
    whAccess($u, $wid);
    $remaining = round((float) $assignment['issued_quantity'] - (float) $assignment['settled_quantity'], 3);
    if ($assignment['status'] !== 'open' || $quantity > $remaining + 0.00001)
      fail('Quantidade maior que a pendência ou conta já encerrada.', 409);
    $mid = null;
    if ($disposition === 'good') {
      $pid = (int) $assignment['product_id'];
      $p = product($pid);
      // Cumulative rounding ensures partial returns reconcile to the original issue value.
      $unitTotal = (float) $assignment['issued_value'];
      $issued = (float) $assignment['issued_quantity'];
      $previousSettled = (float) $assignment['settled_quantity'];
      $value = round($unitTotal * ($previousSettled + $quantity) / $issued, 2) - round($unitTotal * $previousSettled / $issued, 2);
      [$old, $new, $before, $after, $changeValue, $applied] = stockChange($pid, $wid, $quantity, null, $value);
      $move = movementRow($u, $p, $wid, 'devolucao_ferramenta', $quantity, $old, $new, ['reason' => 'Devolução de ferramenta', 'assignment_id' => $aid, 'employee_registration' => $assignment['registration'], 'employee' => $assignment['full_name'], 'notes' => $notes, '_cost_applied' => $applied, '_value_moved' => $changeValue, '_value_before' => $before, '_value_after' => $after], null, null, null, (int) $assignment['employee_id']);
      $mid = (int) $move['id'];
    }
    q('INSERT INTO tool_returns(assignment_id,movement_id,quantity,disposition,notes,returned_by_user_id) VALUES(?,?,?,?,?,?)', [$aid, $mid, $quantity, $disposition, $notes, $u['id']]);
    $newSettled = round((float) $assignment['settled_quantity'] + $quantity, 3);
    $newStatus = $newSettled >= (float) $assignment['issued_quantity'] - 0.00001 ? 'closed' : 'open';
    q('UPDATE tool_assignments SET settled_quantity=?,status=? WHERE id=?', [$newSettled, $newStatus, $aid]);
    audit($u, $disposition === 'good' ? 'return' : 'writeoff', 'ToolAssignment', $aid, $wid, ['quantity' => $quantity, 'condition' => $disposition, 'notes' => $notes]);
    $db->commit();
    respond(['status' => $newStatus, 'outstanding_quantity' => round((float) $assignment['issued_quantity'] - $newSettled, 3), 'stock_replenished' => $disposition === 'good']);
  } catch (Throwable $e) {
    if ($db->inTransaction())
      $db->rollBack();
    throw $e;
  }
}
// SSMA: entrega de EPI independente da interface do almoxarifado.
// Sempre registra uma única saída, com custo médio, ficha de EPI e auditoria na mesma transação.
if ($route === 'ssma/products') {
  requireModule($u, 'ssma');
  if ($method !== 'GET')
    fail('Método inválido', 405);
  $wid = wh($u);
  $rows = all('SELECT p.id,CAST(p.id AS CHAR) code,p.name,p.unit,CAST(st.quantity AS DECIMAL(16,3)) current_balance FROM products p JOIN stocks st ON st.product_id=p.id AND st.warehouse_id=? WHERE p.status="active" AND st.quantity>0 ORDER BY p.name LIMIT 1500', [$wid]);
  respond(array_map('normalize', $rows));
}
if ($route === 'ssma/deliver') {
  requireModule($u, 'ssma');
  if ($method !== 'POST')
    fail('Método inválido', 405);
  $d = input();
  $d['exit_reason'] = 'epi';
  $d['destination_type'] = 'centro_custo';
  unset($d['company_name']);
  respond(movementOp($u, 'saida', $d), 201);
}
if ($route === 'stock/move') {
  requireModule($u, 'estoque');
  if ($method !== 'POST')
    fail('Método inválido', 405);
  $d = input();
  $type = $d['type'] ?? '';
  if (!in_array($type, ['entrada', 'saida'], true))
    fail('Movimentação inválida');
  respond(movementOp($u, $type, $d), 201);
}
if ($route === 'stock/transfer') {
  requireModule($u, 'estoque');
  if ($method !== 'POST')
    fail('Método inválido', 405);
  admin($u);
  respond(transfer($u, input()), 201);
}
if ($route === 'stock/adjust') {
  requireModule($u, 'estoque');
  if ($method !== 'POST')
    fail('Método inválido', 405);
  admin($u);
  $d = input();
  if (!trim((string) ($d['reason'] ?? '')))
    fail('Justificativa obrigatória.');
  $wid = wh($u);
  $pid = id($d['product_id'] ?? null);
  $db->beginTransaction();
  try {
    $p = product($pid);
    $old = (float) stockRow($pid, $wid)['quantity'];
    $direction = $d['direction'] ?? '';
    if ($direction === 'correcao') {
      $new = qty($d['new_balance'] ?? null, false);
      $diff = $new - $old;
    } elseif ($direction === 'positivo') {
      $diff = qty($d['quantity'] ?? null);
      $new = $old + $diff;
    } elseif ($direction === 'negativo') {
      $diff = -qty($d['quantity'] ?? null);
      $new = $old + $diff;
    } else
      fail('Direção inválida.');
    if ($new < 0)
      fail('Saldo não pode ficar negativo.', 409);
    if (abs($diff) < 0.0001) {
      $db->commit();
      respond(['new_balance' => $old, 'no_change' => true]);
    }
    $currentStock = stockRow($pid, $wid);
    $adjustCost = (float) $currentStock['quantity'] > 0 ? (float) $currentStock['stock_value'] / (float) $currentStock['quantity'] : (float) $p['unit_cost'];
    [$old, $new, $before, $after, $value, $appliedCost] = stockChange($pid, $wid, $diff, $diff > 0 ? $adjustCost : null);
    $row = movementRow($u, $p, $wid, $diff > 0 ? 'ajuste_positivo' : 'ajuste_negativo', abs($diff), $old, $new, array_merge($d, ['_cost_applied' => $appliedCost, '_value_moved' => $value, '_value_before' => $before, '_value_after' => $after]));
    $db->commit();
    respond($row, 201);
  } catch (Throwable $e) {
    if ($db->inTransaction())
      $db->rollBack();
    throw $e;
  }
}
if ($route === 'stock/inventory/approve') {
  requireModule($u, 'estoque');
  if ($method !== 'POST')
    fail('Método inválido', 405);
  admin($u);
  $d = input();
  $iid = id($d['inventory_id'] ?? null);
  $wid = wh($u);
  $db->beginTransaction();
  try {
    $inventory = one('SELECT * FROM inventories WHERE id=? AND warehouse_id=? FOR UPDATE', [$iid, $wid]);
    if (!$inventory || $inventory['status'] !== 'aguardando_aprovacao')
      fail('Inventário não está aguardando aprovação.', 409);
    if (!trim((string) $inventory['justification']))
      fail('Justificativa é obrigatória.');
    $items = json_decode($inventory['items'], true) ?? [];
    $adjustments = [];
    usort($items, fn($a, $b) => (int) $a['product_id'] <=> (int) $b['product_id']);
    foreach ($items as $item) {
      $pid = id($item['product_id']);
      $p = product($pid);
      $old = (float) stockRow($pid, $wid)['quantity'];
      $counted = qty($item['counted'] ?? null, false);
      if (abs($old - (float) $item['expected']) > 0.0001)
        fail('Saldo alterado desde a criação do inventário. Revise a contagem do produto ' . $p['name'] . '.', 409);
      $diff = $counted - $old;
      if (abs($diff) < 0.0001)
        continue;
      $currentStock = stockRow($pid, $wid);
      $adjustCost = (float) $currentStock['quantity'] > 0 ? (float) $currentStock['stock_value'] / (float) $currentStock['quantity'] : (float) $p['unit_cost'];
      [$old, $new, $before, $after, $value, $appliedCost] = stockChange($pid, $wid, $diff, $diff > 0 ? $adjustCost : null);
      $adjustments[] = movementRow($u, $p, $wid, $diff > 0 ? 'ajuste_positivo' : 'ajuste_negativo', abs($diff), $old, $new, ['reason' => 'Inventário ' . $inventory['code'] . ' — ' . $inventory['justification'], 'notes' => $inventory['notes'], '_cost_applied' => $appliedCost, '_value_moved' => $value, '_value_before' => $before, '_value_after' => $after]);
    }
    q('UPDATE inventories SET status="aprovado", approved_by=? WHERE id=?', [$u['display_name'], $iid]);
    audit($u, 'approve', 'Inventory', $iid, $wid, ['adjustments' => count($adjustments)]);
    $db->commit();
    respond(['adjustments' => $adjustments]);
  } catch (Throwable $e) {
    if ($db->inTransaction())
      $db->rollBack();
    throw $e;
  }
}
// CRUD adapter used by the existing React screens.
if ($route === 'entity') {
  $entity = (string) ($_GET['entity'] ?? '');
  $action = (string) ($_GET['action'] ?? 'list');
  $map = ['Product' => 'products', 'Category' => 'categories', 'Supplier' => 'suppliers', 'Movement' => 'movements', 'Inventory' => 'inventories', 'AppUser' => 'app_users'];
  if (!isset($map[$entity]))
    fail('Entidade inválida.', 404);
  requireModule($u, $entity === 'AppUser' ? 'adm' : 'estoque');
  $table = $map[$entity];
  $wid = in_array($entity, ['Product', 'Movement', 'Inventory'], true) ? wh($u, true) : null;
  if ($action === 'list' || $action === 'get' || $action === 'filter') {
    if ($entity === 'AppUser')
      master($u);
    $entityId = isset($_GET['id']) ? id($_GET['id']) : null;
    $max = min(5000, max(1, (int) ($_GET['limit'] ?? 500)));
    if ($entity === 'Product') {
      $scope = $wid === null ? '' : ' AND st.warehouse_id=' . (int) $wid;
      $sql = 'SELECT p.*,CAST(p.id AS CHAR) code,c.name category_name,s.company_name supplier_name,'
        . 'COALESCE((SELECT SUM(st.quantity) FROM stocks st WHERE st.product_id=p.id' . $scope . '),0) current_balance,'
        . 'COALESCE((SELECT SUM(st.stock_value) FROM stocks st WHERE st.product_id=p.id' . $scope . '),0) inventory_value '
        . 'FROM products p LEFT JOIN categories c ON c.id=p.category_id LEFT JOIN suppliers s ON s.id=p.supplier_id';
      $rows = all($sql . ($entityId ? ' WHERE p.id=' . (int) $entityId : '') . ' ORDER BY p.id DESC LIMIT ' . $max);
    } elseif ($entity === 'Movement') {
      $sql = 'SELECT m.*,CAST(p.id AS CHAR) product_code,p.name product_name,c.name category_name,us.display_name user_name,sp.company_name supplier_name,co.code cost_center_code,co.name cost_center_name FROM movements m JOIN products p ON p.id=m.product_id LEFT JOIN categories c ON c.id=p.category_id LEFT JOIN app_users us ON us.id=m.user_id LEFT JOIN suppliers sp ON sp.id=p.supplier_id LEFT JOIN cost_centers co ON co.id=m.cost_center_id';
      $clauses = [];
      if ($wid)
        $clauses[] = 'm.warehouse_id=' . (int) $wid;
      elseif ($u['role'] !== 'master') {
        $ids = array_column(all('SELECT w.id FROM warehouses w JOIN user_units ua ON ua.unit_id=w.unit_id WHERE ua.user_id=?', [$u['id']]), 'id');
        $clauses[] = $ids ? 'm.warehouse_id IN (' . implode(',', array_map('intval', $ids)) . ')' : '1=0';
      }
      if ($entityId)
        $clauses[] = 'm.id=' . (int) $entityId;
      $rows = all($sql . ($clauses ? ' WHERE ' . implode(' AND ', $clauses) : '') . ' ORDER BY m.date DESC,m.id DESC LIMIT ' . $max);
    } elseif ($entity === 'Inventory') {
      $rows = all('SELECT * FROM inventories' . ($wid ? ' WHERE warehouse_id=' . (int) $wid : '') . ($entityId ? ($wid ? ' AND' : ' WHERE') . ' id=' . (int) $entityId : '') . ' ORDER BY id DESC LIMIT ' . $max);
    } elseif ($entity === 'AppUser') {
      $rows = all('SELECT id,username,display_name,role,status,created_date FROM app_users' . ($entityId ? ' WHERE id=' . (int) $entityId : '') . ' ORDER BY id DESC LIMIT ' . $max);
      foreach ($rows as &$row) {
        $row['unit_ids'] = array_column(all('SELECT unit_id FROM user_units WHERE user_id=?', [$row['id']]), 'unit_id');
        $row['module_keys'] = modulesFor($row);
      }
      unset($row);
    } else {
      $rows = all('SELECT * FROM ' . $table . ($entityId ? ' WHERE id=' . (int) $entityId : '') . ' ORDER BY id DESC LIMIT ' . $max);
    }
    $rows = array_map(function ($r) use ($entity) {
      $r = normalize($r);
      if ($entity === 'Product') {
        $r['reference_cost'] = $r['unit_cost'];
        if ($r['current_balance'] > 0)
          $r['unit_cost'] = round($r['inventory_value'] / $r['current_balance'], 10);
      }if (in_array($entity, ['Supplier', 'Category'], true)) {
        $data = $r['data'] ?? [];
        unset($r['data']);
        $r = array_merge($data, $r);
      } elseif ($entity === 'Movement') {
        $d = $r['detail'] ?? [];
        unset($r['detail']);
        $r = array_merge($d, $r);
        $r['cost_center'] = $r['cost_center_code'] ?? ($d['cost_center'] ?? '');
      }return $r;
    }, $rows);
    if ($action === 'get') {
      if (!$rows)
        fail('Registro não encontrado', 404);
      respond($rows[0]);
    }
    if ($action === 'filter') {
      $filter = json_decode((string) ($_GET['filter'] ?? '{}'), true) ?: [];
      $rows = array_values(array_filter($rows, fn($r) => !array_diff_assoc($filter, array_intersect_key($r, $filter)) && count(array_intersect_key($r, $filter)) === count($filter)));
    }
    respond($rows);
  }
  if ($entity === 'Movement')
    fail('Movimentações são imutáveis. Use as rotas transacionais.', 403);
  $d = input();
  $recordId = isset($_GET['id']) ? id($_GET['id']) : null;
  if ($entity === 'AppUser') {
    master($u);
    if (!in_array($action, ['create', 'update'], true))
      fail('Ação inválida.', 405);
    $role = $d['role'] ?? 'comum';
    if (!in_array($role, ['master', 'admin', 'comum'], true))
      fail('Perfil inválido.');
    $name = trim((string) ($d['display_name'] ?? ''));
    $username = trim((string) ($d['username'] ?? ''));
    if (!$name || !$username)
      fail('Informe nome e usuário.');
    $cpf = normalizedCpf($d['cpf'] ?? null);
    $status = $d['status'] ?? 'active';
    if (!in_array($status, ['active', 'inactive'], true))
      fail('Status inválido.');
    $password = (string) ($d['password'] ?? '');
    if ($password !== '' && strlen($password) < 10)
      fail('Use senha de pelo menos 10 caracteres.');
    $db->beginTransaction();
    try {
      if ($action === 'create') {
        if (!$password)
          fail('Senha obrigatória.');
        q('INSERT INTO app_users(username,display_name,role,status,password_hash) VALUES(?,?,?,?,?)', [$username, $name, $role, $status, password_hash($password, PASSWORD_DEFAULT)]);
        $recordId = (int) $db->lastInsertId();
      } else {
        if (!$recordId)
          fail('ID obrigatório.');
        if ($recordId == (int) $u['id'] && ($role !== 'master' || $status !== 'active'))
          fail('Você não pode retirar o próprio acesso Master.');
        q('UPDATE app_users SET username=?,display_name=?,role=?,status=? WHERE id=?', [$username, $name, $role, $status, $recordId]);
        if ($password !== '')
          q('UPDATE app_users SET password_hash=? WHERE id=?', [password_hash($password, PASSWORD_DEFAULT), $recordId]);
      }
      if (isset($d['unit_ids']) || $action === 'create') {
        q('DELETE FROM user_units WHERE user_id=?', [$recordId]);
        if ($role !== 'master')
          foreach (array_unique((array) ($d['unit_ids'] ?? [])) as $unit) {
            $unit = id($unit);
            if (!one('SELECT 1 FROM units WHERE id=?', [$unit]))
              fail('Unidade inválida.');
            q('INSERT INTO user_units(user_id,unit_id) VALUES(?,?)', [$recordId, $unit]);
          }
      }
      if (array_key_exists('module_keys', $d) || $action === 'create') {
        $keys = $role === 'master' ? ERP_MODULES : ($d['module_keys'] ?? ['estoque']);
        if (!is_array($keys))
          fail('Módulos inválidos.');
        $keys = array_values(array_unique($keys));
        foreach ($keys as $key) {
          if (!is_string($key) || !in_array($key, ERP_MODULES, true))
            fail('Módulo não reconhecido.');
          if ($key === 'adm' && $role === 'comum')
            fail('O módulo ADM exige o perfil Administrador ou Master.');
        }
        q('DELETE FROM user_modules WHERE user_id=?', [$recordId]);
        if ($role !== 'master')
          foreach ($keys as $key)
            q('INSERT INTO user_modules(user_id,module_key) VALUES(?,?)', [$recordId, $key]);
      }
      audit($u, $action, 'AppUser', $recordId, null, ['modules' => $role === 'master' ? ERP_MODULES : ($keys ?? null)]);
      $db->commit();
      respond(['id' => (string) $recordId]);
    } catch (Throwable $e) {
      if ($db->inTransaction())
        $db->rollBack();
      throw $e;
    }
  }
  if ($entity === 'Product') {
    admin($u);
    if (!in_array($action, ['create', 'update'], true))
      fail('Ação inválida.');
    $fields = ['name', 'description', 'category_id', 'supplier_id', 'unit', 'location', 'shelf', 'min_stock', 'max_stock', 'unit_cost', 'status', 'notes'];
    $defaults = ['name' => '', 'description' => '', 'category_id' => null, 'supplier_id' => null, 'unit' => 'unidade', 'location' => '', 'shelf' => '', 'min_stock' => 0, 'max_stock' => null, 'unit_cost' => 0, 'status' => 'active', 'notes' => ''];
    $values = $action === 'update' ? product($recordId) : $defaults;
    foreach ($fields as $field) {
      if (array_key_exists($field, $d))
        $values[$field] = $d[$field];
    }
    // Editing a product must not implicitly replace its reference price with the calculated CMP.
    if ($action === 'update')
      $values['unit_cost'] = product($recordId)['unit_cost'];
    if (!trim((string) $values['name']))
      fail('Nome obrigatório.');
    foreach (['category_id', 'supplier_id', 'max_stock'] as $f)
      if ($values[$f] === '')
        $values[$f] = null;
    if (qty($values['min_stock'], false) < 0 || qty($values['unit_cost'], false) < 0)
      fail('Valor negativo.');
    if ($values['max_stock'] !== null)
      qty($values['max_stock'], false);
    if (!in_array($values['status'], ['active', 'inactive'], true))
      fail('Status inválido.');
    if ($action === 'create') {
      q('INSERT INTO products(' . implode(',', $fields) . ') VALUES(' . implode(',', array_fill(0, count($fields), '?')) . ')', array_map(fn($f) => $values[$f], $fields));
      $recordId = (int) $db->lastInsertId();
    } else {
      q('UPDATE products SET ' . implode(',', array_map(fn($f) => $f . '=?', $fields)) . ' WHERE id=?', [...array_map(fn($f) => $values[$f], $fields), $recordId]);
    }
    audit($u, $action, 'Product', $recordId);
    respond(['id' => (string) $recordId, 'code' => (string) $recordId]);
  }
  if (in_array($entity, ['Category', 'Supplier'], true)) {
    admin($u);
    $main = $entity === 'Category' ? 'name' : 'company_name';
    $label = trim((string) ($d[$main] ?? ''));
    if (!$label)
      fail('Nome obrigatório.');
    $status = in_array($d['status'] ?? 'active', ['active', 'inactive'], true) ? $d['status'] : 'active';
    if ($action === 'create') {
      if ($entity === 'Category')
        q('INSERT INTO categories(name,status,data) VALUES(?,?,?)', [$label, $status, json_encode($d)]);
      else
        q('INSERT INTO suppliers(company_name,cnpj,status,data) VALUES(?,?,?,?)', [$label, $d['cnpj'] ?? null, $status, json_encode($d)]);
      $recordId = (int) $db->lastInsertId();
    } elseif ($action === 'update') {
      $old = one('SELECT data FROM ' . $table . ' WHERE id=?', [$recordId]);
      if (!$old)
        fail('Registro não encontrado.', 404);
      $data = array_merge(json_decode($old['data'] ?? '{}', true) ?: [], $d);
      if ($entity === 'Category')
        q('UPDATE categories SET name=?,status=?,data=? WHERE id=?', [$label, $status, json_encode($data), $recordId]);
      else
        q('UPDATE suppliers SET company_name=?,cnpj=?,status=?,data=? WHERE id=?', [$label, $d['cnpj'] ?? null, $status, json_encode($data), $recordId]);
    } else
      fail('Ação inválida.', 405);
    audit($u, $action, $entity, $recordId);
    respond(['id' => (string) $recordId]);
  }
  if ($entity === 'Inventory') {
    admin($u);
    if (!in_array($action, ['create', 'update'], true))
      fail('Ação inválida.', 405);
    // Inventory has a physical warehouse scope. Client cannot switch warehouse_id in payload.
    if ($wid === null)
      fail('Selecione uma unidade específica para inventário.', 422);
    if ($action === 'create') {
      $items = (array) ($d['items'] ?? []);
      if (!$items)
        fail('Inventário deve conter produtos.');
      $clean = [];
      $seen = [];
      foreach ($items as $item) {
        $pid = id($item['product_id']);
        if (isset($seen[$pid]))
          continue;
        $seen[$pid] = true;
        $p = product($pid);
        $row = one('SELECT quantity,stock_value FROM stocks WHERE product_id=? AND warehouse_id=?', [$pid, $wid]);
        $current = (float) ($row['quantity'] ?? 0);
        $avg = $current > 0 ? (float) ($row['stock_value'] ?? 0) / $current : (float) $p['unit_cost'];
        $clean[] = ['product_id' => (string) $pid, 'product_code' => (string) $pid, 'product_name' => $p['name'], 'expected' => $current, 'counted' => $current, 'difference' => 0, 'unit_cost' => $avg, 'divergence_value' => 0];
      }
      $code = trim((string) ($d['code'] ?? ''));
      if (!$code)
        fail('Código do inventário obrigatório.');
      q('INSERT INTO inventories(warehouse_id,code,status,items,notes,counted_by,created_by_name) VALUES(?, ?,"em_contagem",?,?,?,?)', [$wid, $code, json_encode($clean, JSON_UNESCAPED_UNICODE), $d['notes'] ?? '', $u['display_name'], $u['display_name']]);
      $recordId = (int) $db->lastInsertId();
    } else {
      $inventory = one('SELECT * FROM inventories WHERE id=? AND warehouse_id=?', [$recordId, $wid]);
      if (!$inventory)
        fail('Inventário não encontrado.', 404);
      if (!in_array($inventory['status'], ['em_aberto', 'em_contagem'], true))
        fail('Inventário não pode ser alterado.', 409);
      $status = $d['status'] ?? $inventory['status'];
      if (!in_array($status, ['em_aberto', 'em_contagem', 'aguardando_aprovacao', 'cancelado'], true))
        fail('Status inválido.');
      $oldItems = json_decode($inventory['items'], true) ?? [];
      $requested = [];
      foreach (($d['items'] ?? $oldItems) as $it) {
        $requested[(string) $it['product_id']] = $it;
      }
      $clean = [];
      foreach ($oldItems as $it) {
        $k = (string) $it['product_id'];
        $counted = qty($requested[$k]['counted'] ?? $it['counted'], false);
        $it['counted'] = $counted;
        $it['difference'] = round($counted - (float) $it['expected'], 3);
        $it['divergence_value'] = round($it['difference'] * (float) $it['unit_cost'], 2);
        $clean[] = $it;
      }
      $just = trim((string) ($d['justification'] ?? $inventory['justification'] ?? ''));
      if ($status === 'aguardando_aprovacao' && !$just)
        fail('Justificativa necessária.');
      q('UPDATE inventories SET status=?,items=?,notes=?,justification=?,counted_by=? WHERE id=?', [$status, json_encode($clean, JSON_UNESCAPED_UNICODE), $d['notes'] ?? $inventory['notes'], $just, $u['display_name'], $recordId]);
    }
    audit($u, $action, 'Inventory', $recordId, $wid);
    respond(['id' => (string) $recordId]);
  }
}
fail('Rota não encontrada.', 404);

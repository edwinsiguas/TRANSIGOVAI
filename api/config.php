<?php

function loadEnvFile(string $path): void {
    if (!is_readable($path)) {
        return;
    }

    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || strpos($line, '#') === 0) {
            continue;
        }

        $separator = strpos($line, '=');
        if ($separator === false) {
            continue;
        }

        $name = trim(substr($line, 0, $separator));
        $value = trim(substr($line, $separator + 1));
        if ($name === '') {
            continue;
        }

        $hasDoubleQuotes = strlen($value) >= 2 && $value[0] === '"' && substr($value, -1) === '"';
        $hasSingleQuotes = strlen($value) >= 2 && $value[0] === "'" && substr($value, -1) === "'";
        if ($hasDoubleQuotes || $hasSingleQuotes) {
            $value = substr($value, 1, -1);
        }

        if (getenv($name) !== false || isset($_ENV[$name]) || isset($_SERVER[$name])) {
            continue;
        }

        putenv("$name=$value");
        $_ENV[$name] = $value;
        $_SERVER[$name] = $value;
    }
}

function envValue(string $key, mixed $default = null): mixed {
    if (isset($_ENV[$key])) {
        return $_ENV[$key];
    }
    if (isset($_SERVER[$key])) {
        return $_SERVER[$key];
    }

    $value = getenv($key);
    if ($value === false) {
        return $default;
    }

    return $value;
}

function envBool(string $key, bool $default = false): bool {
    $value = envValue($key, null);
    if ($value === null) {
        return (bool) $default;
    }

    $normalized = strtolower(trim((string) $value));
    if (in_array($normalized, ['1', 'true', 'yes', 'on'], true)) {
        return true;
    }
    if (in_array($normalized, ['0', 'false', 'no', 'off'], true)) {
        return false;
    }

    return (bool) $default;
}

function getAllowedOrigins() {
    $configuredOrigins = trim((string) envValue('CORS_ALLOWED_ORIGINS', ''));
    if ($configuredOrigins !== '') {
        return array_values(array_filter(array_map('trim', explode(',', $configuredOrigins))));
    }

    if (APP_ENV === 'production') {

        return [APP_URL];
    }

    return [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:5173',
        'http://127.0.0.1:5173',
    ];
}

loadEnvFile(__DIR__ . '/../.env');
loadEnvFile(__DIR__ . '/.env');

define('APP_ENV', strtolower((string) envValue('APP_ENV', 'development')));
define('DEBUG_MODE', envBool('APP_DEBUG', APP_ENV !== 'production'));
define('APP_URL', (string) envValue('APP_URL', 'http://localhost:3000'));
define('API_URL', (string) envValue('API_URL', 'http://localhost/api'));
define('TOKEN_EXPIRY', (int) envValue('JWT_EXPIRY', 86400));

// ═══════════════════════════════════════════════════════════════════════════
// CORS — Se aplica AQUÍ, después de cargar el .env, para que TODAS las
// respuestas (incluso errores 500 de JWT/DB) incluyan la cabecera CORS.
// ═══════════════════════════════════════════════════════════════════════════
$_corsOrigin = isset($_SERVER['HTTP_ORIGIN']) ? trim((string) $_SERVER['HTTP_ORIGIN']) : '';
$_corsAllowed = array_values(array_filter(array_map('trim', explode(',',
    (string) envValue('CORS_ALLOWED_ORIGINS', 'https://transporte.munimarcona.gob.pe,http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173')
))));

if ($_corsOrigin !== '' && in_array($_corsOrigin, $_corsAllowed, true)) {
    header('Access-Control-Allow-Origin: ' . $_corsOrigin);
    header('Vary: Origin');
} elseif ($_corsOrigin === '' || APP_ENV !== 'production') {
    // Direct request or dev: allow all
    header('Access-Control-Allow-Origin: *');
}
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Auth-Token');
header('Access-Control-Max-Age: 86400');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit();
}
// ═══════════════════════════════════════════════════════════════════════════

$jwtSecret = (string) envValue('JWT_SECRET', '');
if ($jwtSecret === '') {
    if (APP_ENV === 'production') {
        http_response_code(500);
        header('Content-Type: application/json');
        echo json_encode(['success' => false, 'message' => 'Falta configurar JWT_SECRET en variables de entorno']);
        exit();
    }
    $jwtSecret = 'dev_only_change_me';
}
define('JWT_SECRET', $jwtSecret);

define('DB_HOST', (string) envValue('DB_HOST', 'localhost'));
define('DB_USER', (string) envValue('DB_USER', 'root'));
define('DB_PASS', (string) envValue('DB_PASS', ''));
define('DB_NAME', (string) envValue('DB_NAME', 'marcona_permisos'));

if (DB_PASS === '' && APP_ENV === 'production') {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'message' => 'Configuración de base de datos inválida para producción']);
    exit();
}

error_reporting(E_ALL);
ini_set('display_errors', '1');
ini_set('log_errors', '1');
ini_set('display_startup_errors', '0');

header('Content-Type: application/json');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: strict-origin-when-cross-origin');
header('Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()');
if (APP_ENV === 'production') {
    header('Strict-Transport-Security: max-age=31536000; includeSubDomains; preload');
}

try {
    $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4';
    $pdo = new PDO(
        $dsn,
        DB_USER,
        DB_PASS,
        [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
            1002 => 'SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci',
        ]
    );
} catch (PDOException $e) {

    error_log('[DB_CONNECT_ERROR] ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'No se pudo establecer conexión con la base de datos. Contacte al administrador.',
    ]);
    exit();
}

function getRequestData() {
    if (!empty($_POST)) {
        return $_POST;
    }
    $input = file_get_contents('php://input');
    return json_decode($input, true) ?? [];
}

function sendResponse(bool $success, mixed $data = null, ?string $message = null, int $statusCode = 200): void {
    http_response_code($statusCode);
    echo json_encode([
        'success' => $success,
        'data' => $data,
        'message' => $message
    ]);
    exit();
}

function sendExceptionResponse(string $context, Throwable $e, string $publicMessage = 'Error del servidor'): void {
    $traceId = uniqid('err_', true);

    error_log(sprintf(
        '[%s] %s: %s in %s:%d',
        $traceId,
        $context,
        $e->getMessage(),
        $e->getFile(),
        $e->getLine()
    ));

    if (DEBUG_MODE) {
        sendResponse(false, [
            'debug' => [
                'trace_id' => $traceId,
                'context' => $context,
                'error' => $e->getMessage(),
                'file' => basename($e->getFile()),
                'line' => $e->getLine(),
            ],
        ], $publicMessage . ': ' . $e->getMessage(), 500);
    }

    sendResponse(false, [
        'trace_id' => $traceId,
    ], $publicMessage, 500);
}

function generateToken(int|string $userId, string $role): string {
    $header = base64_encode(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
    $payload = base64_encode(json_encode([
        'user_id' => $userId,
        'role' => $role,
        'iat' => time(),
        'exp' => time() + TOKEN_EXPIRY
    ]));

    $signature = hash_hmac(
        'sha256',
        "$header.$payload",
        JWT_SECRET,
        true
    );
    $signature = base64_encode($signature);

    return "$header.$payload.$signature";
}

function verifyToken(string $token): ?array {
    if (!$token) {
        return null;
    }

    $parts = explode('.', $token);
    if (count($parts) !== 3) {
        return null;
    }

    [$header, $payload, $signature] = $parts;

    $validSignature = hash_hmac(
        'sha256',
        "$header.$payload",
        JWT_SECRET,
        true
    );

    if (!hash_equals(base64_encode($validSignature), $signature)) {
        return null;
    }

    $data = json_decode(base64_decode($payload), true);

    if (!$data || $data['exp'] < time()) {
        return null;
    }

    return $data;
}

function getAuthToken() {

    $authHeader = null;
    $fallbackToken = null;

    if (function_exists('getallheaders')) {
        $headers = getallheaders();
        if (isset($headers['Authorization'])) {
            $authHeader = $headers['Authorization'];
        } elseif (isset($headers['authorization'])) {
            $authHeader = $headers['authorization'];
        }

        if (isset($headers['X-Auth-Token'])) {
            $fallbackToken = $headers['X-Auth-Token'];
        } elseif (isset($headers['x-auth-token'])) {
            $fallbackToken = $headers['x-auth-token'];
        }
    }

    if (!$authHeader && function_exists('apache_request_headers')) {
        $headers = apache_request_headers();
        if (isset($headers['Authorization'])) {
            $authHeader = $headers['Authorization'];
        } elseif (isset($headers['authorization'])) {
            $authHeader = $headers['authorization'];
        }

        if (!$fallbackToken && isset($headers['X-Auth-Token'])) {
            $fallbackToken = $headers['X-Auth-Token'];
        } elseif (!$fallbackToken && isset($headers['x-auth-token'])) {
            $fallbackToken = $headers['x-auth-token'];
        }
    }

    if (!$authHeader && isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
    }
    if (!$authHeader && isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
        $authHeader = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
    }
    if (!$authHeader && isset($_SERVER['Authorization'])) {
        $authHeader = $_SERVER['Authorization'];
    }
    if (!$fallbackToken && isset($_SERVER['HTTP_X_AUTH_TOKEN'])) {
        $fallbackToken = $_SERVER['HTTP_X_AUTH_TOKEN'];
    }
    if (!$fallbackToken && isset($_SERVER['REDIRECT_HTTP_X_AUTH_TOKEN'])) {
        $fallbackToken = $_SERVER['REDIRECT_HTTP_X_AUTH_TOKEN'];
    }

    if (!$authHeader) {
        return $fallbackToken ? trim($fallbackToken) : null;
    }

    if (preg_match('/Bearer\s+(.+)/i', $authHeader, $matches)) {
        return trim($matches[1]);
    }

    return null;
}

function logAction(PDO $pdo, int|string $userId, string $action, string $entity, int|string $entityId, ?string $description = null, ?string $ip = null): void {
    if (!$ip) {
        $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    }

    try {
        $stmt = $pdo->prepare('
            INSERT INTO action_logs (user_id, accion, entidad, entidad_id, descripcion, ip_address, created_at)
            VALUES (?, ?, ?, ?, ?, ?, NOW())
        ');

        $stmt->execute([$userId, $action, $entity, $entityId, $description, $ip]);
    } catch (PDOException $e) {
        error_log('Error logging action: ' . $e->getMessage());
    }

    $auditEvent = [
        'timestamp' => date(DATE_ATOM),
        'user_id' => $userId,
        'action' => $action,
        'entity' => $entity,
        'entity_id' => $entityId,
        'description' => $description,
        'ip_address' => $ip,
        'http_method' => $_SERVER['REQUEST_METHOD'] ?? null,
        'endpoint' => isset($_SERVER['REQUEST_URI'])
            ? parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH)
            : null,
    ];

    try {
        $auditLine = json_encode($auditEvent, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
    } catch (JsonException $e) {
        error_log('Error encoding database audit event: ' . $e->getMessage());
        return;
    }

    $auditDirectory = __DIR__ . '/storage/logs';
    if (!is_dir($auditDirectory) && !mkdir($auditDirectory, 0770, true) && !is_dir($auditDirectory)) {
        error_log('Unable to create database audit log directory: ' . $auditDirectory);
        return;
    }

    $auditFile = $auditDirectory . '/database-audit.jsonl';
    if (file_put_contents($auditFile, $auditLine . PHP_EOL, FILE_APPEND | LOCK_EX) === false) {
        error_log('Unable to append database audit event to: ' . $auditFile);
    }
}

function expirePermits(PDO $pdo, int|string $userId, ?int $permitId = null): array {
    $ownsTransaction = !$pdo->inTransaction();
    if ($ownsTransaction) {
        $pdo->beginTransaction();
    }

    try {
        $query = "SELECT id FROM permits WHERE estado = 'vigente' AND fecha_vencimiento < CURDATE()";
        $params = [];
        if ($permitId !== null) {
            $query .= ' AND id = ?';
            $params[] = $permitId;
        }
        $query .= ' ORDER BY id FOR UPDATE';

        $expiredStmt = $pdo->prepare($query);
        $expiredStmt->execute($params);
        $expiredPermitIds = array_map('intval', $expiredStmt->fetchAll(PDO::FETCH_COLUMN));

        if (!$expiredPermitIds) {
            if ($ownsTransaction) {
                $pdo->commit();
            }
            return [];
        }

        $placeholders = implode(',', array_fill(0, count($expiredPermitIds), '?'));
        $updateStmt = $pdo->prepare(
            "UPDATE permits SET estado = 'vencido' WHERE estado = 'vigente' AND fecha_vencimiento < CURDATE() AND id IN ($placeholders)"
        );
        $updateStmt->execute($expiredPermitIds);
        $updatedPermitIds = array_slice($expiredPermitIds, 0, $updateStmt->rowCount());

        if ($ownsTransaction) {
            $pdo->commit();
        }
    } catch (Throwable $e) {
        if ($ownsTransaction && $pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
    }

    foreach ($updatedPermitIds as $updatedPermitId) {
        logAction(
            $pdo,
            $userId,
            'vencimiento_automatico',
            'permiso',
            $updatedPermitId,
            'Permiso vencido automáticamente por fecha de vencimiento'
        );
    }

    return $updatedPermitIds;
}

function hashPassword(string $password): string {
    return password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
}

function verifyPassword(string $password, string $hash): bool {
    return password_verify($password, $hash);
}

function sanitize(mixed $input): mixed {
    if (is_array($input)) {
        return array_map('sanitize', $input);
    }
    return trim((string)$input);
}

function generatePermitNumber(PDO $pdo): string {
    $year = (int) date('Y');

    $pdo->prepare(
        "INSERT IGNORE INTO permit_sequences (year, last_number) VALUES (?, 0)"
    )->execute([$year]);

    $pdo->prepare(
        "UPDATE permit_sequences SET last_number = last_number + 1 WHERE year = ?"
    )->execute([$year]);

    $seq = (int) $pdo->query(
        "SELECT last_number FROM permit_sequences WHERE year = $year"
    )->fetchColumn();

    return sprintf('PERM-%d-%05d', $year, $seq);
}

function validateEmail(string $email): mixed {
    return filter_var($email, FILTER_VALIDATE_EMAIL);
}

function validateDNI(string $dni): bool {
    return (bool) preg_match('/^\d{8}$/', $dni);
}

function validateRUC(string $ruc): bool {
    return (bool) preg_match('/^\d{11}$/', $ruc);
}

function validatePhone(string $phone): bool {
    return (bool) preg_match('/^\d{7,15}$/', $phone);
}

function validateDate(string $date, string $format = 'Y-m-d'): bool {
    $d = DateTime::createFromFormat($format, $date);
    return $d && $d->format($format) === $date;
}

?>

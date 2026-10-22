<?php

require_once '../config.php';
require_once '../utils/auth-middleware.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendResponse(false, null, 'Método no permitido', 405);
}

try {
    $user = authenticateRequest($pdo, ['admin', 'operador']);

    $page = max(1, (int)($_GET['page'] ?? 1));
    $limit = max(1, (int)($_GET['limit'] ?? 10));
    $search = $_GET['search'] ?? '';
    $driver_id = $_GET['driver_id'] ?? '';
    $vehicle_id = $_GET['vehicle_id'] ?? '';
    $company_id = $_GET['company_id'] ?? '';
    $estado = $_GET['estado'] ?? '';

    $offset = ($page - 1) * $limit;

    $whereConditions = [];
    $params = [];

    if ($search) {
        $whereConditions[] = '(p.numero_permiso LIKE ? OR COALESCE(d.nombre_completo, \'\') LIKE ? OR COALESCE(v.placa, \'\') LIKE ?)';
        $params[] = "%$search%";
        $params[] = "%$search%";
        $params[] = "%$search%";
    }

    if ($driver_id) {
        $whereConditions[] = 'p.driver_id = ?';
        $params[] = $driver_id;
    }

    if ($vehicle_id) {
        $whereConditions[] = 'p.vehicle_id = ?';
        $params[] = $vehicle_id;
    }

    if ($company_id) {
        $whereConditions[] = 'p.company_id = ?';
        $params[] = $company_id;
    }

    if ($estado) {
        $whereConditions[] = 'p.estado = ?';
        $params[] = $estado;
    }

    $whereClause = !empty($whereConditions) ? 'WHERE ' . implode(' AND ', $whereConditions) : '';

    $countQuery = "
        SELECT COUNT(*) as total FROM permits p
        JOIN vehicles v ON p.vehicle_id = v.id
        LEFT JOIN drivers d ON p.driver_id = d.id
        LEFT JOIN companies c ON p.company_id = c.id
        $whereClause
    ";
    $countStmt = $pdo->prepare($countQuery);
    $countStmt->execute($params);
    $totalResult = $countStmt->fetch();
    $total = $totalResult['total'];

    // Auto-expirar y registrar cada permiso vencido antes de devolver resultados
    expirePermits($pdo, $user['id']);

    $query = "
        SELECT p.*, d.nombre_completo, d.dni, v.placa, v.marca, v.modelo, c.nombre as company_nombre
        FROM permits p
        JOIN vehicles v ON p.vehicle_id = v.id
        LEFT JOIN drivers d ON p.driver_id = d.id
        LEFT JOIN companies c ON p.company_id = c.id
        $whereClause
        ORDER BY p.created_at DESC
        LIMIT $limit OFFSET $offset
    ";

    $stmt = $pdo->prepare($query);
    $stmt->execute($params);
    $permits = $stmt->fetchAll();

    foreach ($permits as &$permit) {
        $permit['qr_code'] = null;
    }

    sendResponse(true, [
        'data' => $permits,
        'pagination' => [
            'page' => (int)$page,
            'limit' => (int)$limit,
            'total' => (int)$total,
            'pages' => ceil($total / $limit)
        ]
    ], null, 200);

} catch (Throwable $e) {
    sendExceptionResponse('Error al listar permisos', $e, 'Error al listar permisos');
}

?>

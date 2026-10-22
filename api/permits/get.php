<?php

require_once '../config.php';
require_once '../utils/auth-middleware.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendResponse(false, null, 'Método no permitido', 405);
}

try {
    $user = authenticateRequest($pdo, ['admin', 'operador']);

    $id = $_GET['id'] ?? null;

    if (!$id || !is_numeric($id)) {
        sendResponse(false, null, 'ID inválido', 400);
    }

    expirePermits($pdo, $user['id'], (int) $id);

    $stmt = $pdo->prepare('
        SELECT p.*,
               d.nombre_completo, d.dni, d.numero_licencia, d.fecha_vencimiento_licencia,
               v.placa, v.marca, v.modelo, v.color, v.categoria,
               c.nombre as company_nombre
        FROM permits p
        JOIN vehicles v ON p.vehicle_id = v.id
        LEFT JOIN drivers d ON p.driver_id = d.id
        LEFT JOIN companies c ON p.company_id = c.id
        WHERE p.id = ?
    ');
    $stmt->execute([$id]);
    $permit = $stmt->fetch();

    if (!$permit) {
        sendResponse(false, null, 'Permiso no encontrado', 404);
    }

    sendResponse(true, $permit, null, 200);

} catch (Throwable $e) {
    sendExceptionResponse('Error al obtener permiso', $e, 'Error al obtener permiso');
}

?>

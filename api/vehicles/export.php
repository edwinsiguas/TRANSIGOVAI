<?php

require_once '../config.php';
require_once '../utils/auth-middleware.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendResponse(false, null, 'Método no permitido', 405);
}

try {
    $user = authenticateRequest($pdo, ['admin', 'operador']);

    $search = $_GET['search'] ?? '';
    $estado = $_GET['estado'] ?? 'todos';

    $where = [];
    $params = [];

    if ($estado !== 'todos') {
        $where[] = "v.estado = :estado";
        $params[':estado'] = $estado;
    }

    if ($search !== '') {
        $where[] = "(v.placa LIKE :search OR c.nombre LIKE :search OR d.nombre_completo LIKE :search)";
        $params[':search'] = "%$search%";
    }

    $whereClause = count($where) > 0 ? "WHERE " . implode(' AND ', $where) : "";

    $query = "
        SELECT 
            v.id, 
            v.placa, 
            v.marca, 
            v.modelo, 
            v.color, 
            v.ano_fabricacion, 
            v.numero_vin,
            v.soat_vencimiento, 
            v.rt_vencimiento, 
            v.estado,
            d.nombre_completo AS conductor_asignado, 
            c.nombre AS empresa
        FROM vehicles v
        LEFT JOIN vehicle_assignments va ON va.vehicle_id = v.id AND va.activo = 1
        LEFT JOIN drivers d ON va.driver_id = d.id
        LEFT JOIN companies c ON v.company_id = c.id
        $whereClause
        ORDER BY v.estado ASC, c.nombre ASC, v.placa ASC
    ";

    $stmt = $pdo->prepare($query);
    $stmt->execute($params);
    $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

    sendResponse(true, $data, 'Exportación de vehículos exitosa', 200);

} catch (Throwable $e) {
    sendExceptionResponse('Error al exportar vehículos', $e, 'Error al exportar vehículos');
}

?>
